import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { formatVariantLabel } from '../utils/productVariant';

const roundCurrency = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

/**
 * Create a new bill/invoice.
 * Executes an atomic Cloud Firestore Transaction completely on the client SDK.
 * 100% compliant with Firebase Spark Free Tier:
 * - NO Cloud Functions
 * - NO CORS errors
 * - Atomic stock deduction
 * - Server-authoritative calculation based on Firestore product pricing
 */
export const createBill = async (billData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated. Please log in.');

  const userId = user.uid;

  if (
    !billData ||
    !billData.customerName ||
    !Array.isArray(billData.products) ||
    billData.products.length === 0
  ) {
    throw new Error('Please fill all required fields.');
  }

  return await runTransaction(db, async (transaction) => {
    // -------------------------------------------------------------
    // PHASE 1: ALL READS (Firestore rule: All reads before any writes)
    // -------------------------------------------------------------
    const profileRef = doc(db, `users/${userId}/profile/company`);
    const profileSnap = await transaction.get(profileRef);
    const profileData = profileSnap.exists() ? profileSnap.data() : null;

    const sellerName = billData.sellerName || profileData?.companyName || user.displayName || 'Seller';
    const sellerEmail = billData.sellerEmail || profileData?.alternateEmail || user.email || '';
    const sellerGST = billData.sellerGST || profileData?.gstNumber || '';

    // Validate quantities and aggregate
    const quantityMap = new Map();
    for (const item of billData.products) {
      const pId = item.productId || item.product_id;
      const qty = Number(item.quantity) || 1;
      const currentQty = quantityMap.get(pId) || 0;
      quantityMap.set(pId, currentQty + qty);
    }

    const productIds = Array.from(quantityMap.keys());
    const productDocs = await Promise.all(
      productIds.map((id) => transaction.get(doc(db, `users/${userId}/products/${id}`)))
    );

    // Read stats doc
    const statsRef = doc(db, `users/${userId}/stats/dashboard`);
    const statsSnap = await transaction.get(statsRef);
    const existingStats = statsSnap.exists() ? statsSnap.data() : {};

    // -------------------------------------------------------------
    // VALIDATIONS & CALCULATIONS
    // -------------------------------------------------------------
    for (let i = 0; i < productDocs.length; i++) {
      const snap = productDocs[i];
      const requestedQty = quantityMap.get(snap.id);
      if (!snap.exists()) {
        throw new Error('Product variant not found.');
      }
      const prod = snap.data();
      const currentQty = typeof prod.quantity === 'number' ? prod.quantity : 0;
      const variantLabel = formatVariantLabel(
        prod.itemName || 'Product',
        prod.packageWeight || 0,
        prod.weightUnit || ''
      );

      if (currentQty < requestedQty) {
        throw new Error(`${variantLabel} has only ${currentQty} packs in stock.`);
      }
    }

    let invoiceSubtotal = 0;
    let invoiceGstAmount = 0;
    let invoiceGrandTotal = 0;
    const invoiceItems = [];

    for (const item of billData.products) {
      const pId = item.productId || item.product_id;
      const snap = productDocs.find((doc) => doc.id === pId);
      const prod = snap.data();
      const sellingPrice = Number(prod.sellingPrice) || 0;
      const gstRate = Number(prod.gst) || 0;
      const quantity = Number(item.quantity) || 1;

      const lineTotal = roundCurrency(sellingPrice * quantity);
      const lineGst = roundCurrency((lineTotal * gstRate) / 100);
      const lineFinal = roundCurrency(lineTotal + lineGst);

      invoiceSubtotal = roundCurrency(invoiceSubtotal + lineTotal);
      invoiceGstAmount = roundCurrency(invoiceGstAmount + lineGst);
      invoiceGrandTotal = roundCurrency(invoiceGrandTotal + lineFinal);

      const formattedName = formatVariantLabel(prod.itemName, prod.packageWeight, prod.weightUnit);

      invoiceItems.push({
        productId: snap.id,
        product_id: snap.id,
        productName: formattedName,
        product_name: formattedName,
        category: prod.category || '',
        description: prod.description || '',
        quantity,
        weight: prod.packageWeight || '0',
        unit: prod.weightUnit || '',
        sellingPrice: String(sellingPrice.toFixed(2)),
        selling_price: String(sellingPrice.toFixed(2)),
        price: String(sellingPrice.toFixed(2)),
        gst: String(gstRate.toFixed(2)),
        total: String(lineFinal.toFixed(2)),
      });
    }

    // -------------------------------------------------------------
    // PHASE 2: ALL WRITES
    // -------------------------------------------------------------
    // 1. Decrement inventory
    for (const [prodId, requestedQty] of quantityMap.entries()) {
      const prodRef = doc(db, `users/${userId}/products/${prodId}`);
      const snap = productDocs.find((doc) => doc.id === prodId);
      const newQty = snap.data().quantity - requestedQty;
      transaction.update(prodRef, {
        quantity: newQty,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Save Invoice Document
    const now = new Date();
    const invoiceNumber = `INV-${Date.now()}`;
    const newInvoiceRef = doc(collection(db, `users/${userId}/invoices`));

    const invoiceRecord = {
      id: newInvoiceRef.id,
      user_id: userId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      seller_name: sellerName,
      seller_email: sellerEmail,
      seller_gst: sellerGST,
      customer_name: billData.customerName,
      customer_email: billData.customerEmail || 'customer@example.com',
      customer_gst: billData.customerGST || '',
      customer_address: billData.customerAddress || '',
      subtotal: String(invoiceSubtotal.toFixed(2)),
      gst_amount: String(invoiceGstAmount.toFixed(2)),
      grand_total: String(invoiceGrandTotal.toFixed(2)),
      items: invoiceItems,
      created_at: now.toISOString(),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      timestamp: serverTimestamp(),
    };

    transaction.set(newInvoiceRef, invoiceRecord);

    // 3. Update dashboard aggregate stats
    transaction.set(
      statsRef,
      {
        totalRevenue: roundCurrency((Number(existingStats.totalRevenue) || 0) + invoiceGrandTotal),
        totalBills: (Number(existingStats.totalBills) || 0) + 1,
        monthlySales: roundCurrency((Number(existingStats.monthlySales) || 0) + invoiceGrandTotal),
        yearlySales: roundCurrency((Number(existingStats.yearlySales) || 0) + invoiceGrandTotal),
        todaySales: roundCurrency((Number(existingStats.todaySales) || 0) + invoiceGrandTotal),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      message: 'Invoice created successfully.',
      invoice: invoiceRecord,
      items: invoiceItems,
    };
  });
};

/**
 * Fetch paginated bills for the current user.
 */
export const getBills = async ({ page = 1, limit = 10 } = {}) => {
  const user = auth.currentUser;
  if (!user) return { success: true, invoices: [], bills: [], totalPages: 0, totalRecords: 0, currentPage: 1 };

  const invoicesRef = collection(db, `users/${user.uid}/invoices`);
  const q = query(invoicesRef, orderBy('created_at', 'desc'), firestoreLimit(100));
  const snapshot = await getDocs(q);

  const allInvoices = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      items: data.items || [],
    };
  });

  const totalRecords = allInvoices.length;
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedInvoices = allInvoices.slice(startIndex, startIndex + limit);

  return {
    success: true,
    invoices: paginatedInvoices,
    bills: paginatedInvoices,
    currentPage: page,
    totalPages,
    totalRecords,
    totalBills: totalRecords,
  };
};
