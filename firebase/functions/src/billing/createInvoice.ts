import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { roundCurrency, formatVariantLabel } from "../utils/formatters";

interface CreateInvoiceItemInput {
  productId: string;
  quantity: number;
}

interface CreateInvoiceInput {
  sellerName?: string;
  sellerEmail?: string;
  sellerGST?: string;
  customerName: string;
  customerEmail: string;
  customerGST?: string;
  customerAddress: string;
  products: CreateInvoiceItemInput[];
}

export const createInvoice = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated to create an invoice.");
    }

    const userId = auth.uid;
    const data = request.data as CreateInvoiceInput;

    if (
      !data ||
      !data.customerName ||
      !data.customerEmail ||
      !data.customerAddress ||
      !Array.isArray(data.products) ||
      data.products.length === 0
    ) {
      throw new HttpsError("invalid-argument", "Please fill all required fields.");
    }

    // Validate product line inputs
    const quantityMap = new Map<string, number>();
    for (const item of data.products) {
      if (!item.productId || typeof item.quantity !== "number") {
        throw new HttpsError("invalid-argument", "Each line item must have a product variant and quantity.");
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new HttpsError("invalid-argument", "Quantity must be a whole number greater than zero.");
      }
      const existing = quantityMap.get(item.productId) || 0;
      quantityMap.set(item.productId, existing + item.quantity);
    }

    const db = admin.firestore();
    const productIds = Array.from(quantityMap.keys());

    return await db.runTransaction(async (transaction) => {
      // 1. Fetch user company profile for seller details if not provided
      const userProfileRef = db.doc(`users/${userId}/profile/company`);
      const userProfileSnap = await transaction.get(userProfileRef);
      const profileData = userProfileSnap.exists ? userProfileSnap.data() : null;

      const sellerName = data.sellerName || profileData?.companyName || auth.token.name || "Seller";
      const sellerEmail = data.sellerEmail || profileData?.alternateEmail || auth.token.email || "";
      const sellerGST = data.sellerGST || profileData?.gstNumber || "";

      // 2. Fetch all products
      const productDocs = await Promise.all(
        productIds.map((id) => transaction.get(db.doc(`users/${userId}/products/${id}`)))
      );

      for (let i = 0; i < productDocs.length; i++) {
        const snap = productDocs[i];
        const requestedQty = quantityMap.get(snap.id)!;
        if (!snap.exists) {
          throw new HttpsError("not-found", "Product variant not found.");
        }
        const prod = snap.data()!;
        const currentQty = typeof prod.quantity === "number" ? prod.quantity : 0;
        const variantLabel = formatVariantLabel(
          prod.itemName || "Product",
          prod.packageWeight || 0,
          prod.weightUnit || ""
        );

        if (currentQty < requestedQty) {
          throw new HttpsError("failed-precondition", `${variantLabel} has only ${currentQty} packs in stock.`);
        }
      }

      // 3. Compute immutable line totals and prepare stock updates
      let invoiceSubtotal = 0;
      let invoiceGstAmount = 0;
      let invoiceGrandTotal = 0;
      const invoiceItems: any[] = [];

      for (const item of data.products) {
        const snap = productDocs.find((doc) => doc.id === item.productId)!;
        const prod = snap.data()!;
        const sellingPrice = Number(prod.sellingPrice) || 0;
        const gstRate = Number(prod.gst) || 0;
        const quantity = item.quantity;

        const lineTotal = roundCurrency(sellingPrice * quantity);
        const lineGst = roundCurrency((lineTotal * gstRate) / 100);
        const lineFinal = roundCurrency(lineTotal + lineGst);

        invoiceSubtotal = roundCurrency(invoiceSubtotal + lineTotal);
        invoiceGstAmount = roundCurrency(invoiceGstAmount + lineGst);
        invoiceGrandTotal = roundCurrency(invoiceGrandTotal + lineFinal);

        invoiceItems.push({
          productId: snap.id,
          product_id: snap.id,
          productName: formatVariantLabel(prod.itemName, prod.packageWeight, prod.weightUnit),
          product_name: formatVariantLabel(prod.itemName, prod.packageWeight, prod.weightUnit),
          category: prod.category || "",
          description: prod.description || "",
          quantity: quantity,
          weight: prod.packageWeight || "0",
          unit: prod.weightUnit || "",
          sellingPrice: String(sellingPrice.toFixed(2)),
          selling_price: String(sellingPrice.toFixed(2)),
          price: String(sellingPrice.toFixed(2)),
          gst: String(gstRate.toFixed(2)),
          total: String(lineFinal.toFixed(2)),
        });
      }

      // 4. Decrement product stock
      for (const [prodId, requestedQty] of quantityMap.entries()) {
        const prodRef = db.doc(`users/${userId}/products/${prodId}`);
        const snap = productDocs.find((doc) => doc.id === prodId)!;
        const newQty = snap.data()!.quantity - requestedQty;
        transaction.update(prodRef, {
          quantity: newQty,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 5. Create new Invoice document
      const now = new Date();
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceRef = db.collection(`users/${userId}/invoices`).doc();

      const invoiceRecord = {
        id: invoiceRef.id,
        user_id: userId,
        invoice_number: invoiceNumber,
        invoiceNumber: invoiceNumber,
        seller_name: sellerName,
        seller_email: sellerEmail,
        seller_gst: sellerGST,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_gst: data.customerGST || "",
        customer_address: data.customerAddress,
        subtotal: String(invoiceSubtotal.toFixed(2)),
        gst_amount: String(invoiceGstAmount.toFixed(2)),
        grand_total: String(invoiceGrandTotal.toFixed(2)),
        items: invoiceItems,
        created_at: now.toISOString(),
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(invoiceRef, invoiceRecord);

      // 6. Update user aggregated dashboard stats
      const statsRef = db.doc(`users/${userId}/stats/dashboard`);
      transaction.set(
        statsRef,
        {
          totalRevenue: admin.firestore.FieldValue.increment(invoiceGrandTotal),
          totalBills: admin.firestore.FieldValue.increment(1),
          monthlySales: admin.firestore.FieldValue.increment(invoiceGrandTotal),
          yearlySales: admin.firestore.FieldValue.increment(invoiceGrandTotal),
          todaySales: admin.firestore.FieldValue.increment(invoiceGrandTotal),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 7. Update platform-wide stats for Admin
      const platformStatsRef = db.doc(`platform_stats/overview`);
      transaction.set(
        platformStatsRef,
        {
          totalRevenue: admin.firestore.FieldValue.increment(invoiceGrandTotal),
          monthlyRevenue: admin.firestore.FieldValue.increment(invoiceGrandTotal),
          totalInvoices: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        success: true,
        message: "Invoice created successfully.",
        invoice: invoiceRecord,
        items: invoiceItems,
      };
    });
  }
);
