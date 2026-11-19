import {
  collection,
  query,
  orderBy,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  limit as firestoreLimit,
  startAfter,
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { formatVariantLabel } from '../utils/productVariant';
import { sellerFromCompany } from '../utils/companySeller';
import { floorMoney, isPermissionDenied, money, permissionMessage, roundCurrency } from '../utils/salesMerge';
import { notifyOutOfStock } from './stockAlertService';
import { clearMonthlyInvoiceCache } from './reportService';

const pageCursors = new Map();
const searchCache = new Map();
let searchReadCount = 0;

export function clearBillPageCache(userId) {
  if (userId) {
    pageCursors.delete(userId);
    for (const key of searchCache.keys()) {
      if (key.startsWith(`${userId}|`)) searchCache.delete(key);
    }
  } else {
    pageCursors.clear();
    searchCache.clear();
  }
  clearMonthlyInvoiceCache(userId);
}

export function consumeSearchReadCount() {
  const reads = searchReadCount;
  searchReadCount = 0;
  return reads;
}

function invoiceMatchesSearch(invoice, term) {
  const number = String(invoice.invoice_number || invoice.invoiceNumber || '').toLowerCase();
  const customer = String(invoice.customer_name || invoice.customerName || '').toLowerCase();
  return number.includes(term) || customer.includes(term);
}

async function searchInvoices(userId, term) {
  const cacheKey = `${userId}|${term}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const invoicesRef = collection(db, `users/${userId}/invoices`);
  const matches = [];
  let cursor = null;
  const batchSize = 300;
  while (true) {
    const snap = await getDocs(query(
      invoicesRef,
      orderBy('created_at', 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
      firestoreLimit(batchSize)
    ));
    searchReadCount += snap.size;
    for (const docSnap of snap.docs) {
      const invoice = mapInvoiceDoc(docSnap);
      if (invoiceMatchesSearch(invoice, term)) matches.push(invoice);
    }
    if (snap.size < batchSize) break;
    cursor = snap.docs[snap.docs.length - 1];
  }

  searchCache.set(cacheKey, matches);
  return matches;
}

const mapInvoiceDoc = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    created_at: data.created_at || '',
    items: data.items || [],
    status: data.status || 'Paid',
  };
};

const emptyBills = (page = 1) => ({
  success: true,
  invoices: [],
  bills: [],
  totalPages: 1,
  totalRecords: 0,
  currentPage: page,
  totalBills: 0,
});

function stockOf(data) {
  return typeof data?.quantity === 'number' ? data.quantity : money(data?.quantity);
}

function buildInvoicePayload({
  invoiceId,
  userId,
  invoiceNumber,
  sellerName,
  sellerEmail,
  sellerGST,
  sellerPhone,
  sellerAddress,
  billData,
  invoiceSubtotal,
  invoiceGstAmount,
  invoiceGrandTotal,
  invoiceItems,
  now,
}) {
  const customerName = String(billData.customerName || '').trim();
  const customerPhone = String(billData.customerPhone || billData.customer_phone || '').trim();
  const customerEmail = String(billData.customerEmail || billData.customer_email || '').trim();
  const customerGst = String(billData.customerGST || billData.customer_gst || '').trim();
  const customerAddress = String(billData.customerAddress || billData.customer_address || '').trim();

  return {
    id: invoiceId,
    user_id: userId,
    invoice_number: invoiceNumber,
    invoiceNumber,
    seller_name: sellerName,
    seller_email: sellerEmail,
    seller_gst: sellerGST,
    seller_phone: sellerPhone,
    seller_address: sellerAddress,
    customer_name: customerName,
    customerName,
    customer_phone: customerPhone,
    customerPhone,
    customer_email: customerEmail,
    customerEmail,
    customer_gst: customerGst,
    customer_address: customerAddress,
    customerAddress,
    subtotal: invoiceSubtotal.toFixed(2),
    gst_amount: invoiceGstAmount.toFixed(2),
    grand_total: invoiceGrandTotal.toFixed(2),
    items: invoiceItems,
    created_at: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    timestamp: serverTimestamp(),
    status: 'Paid',
  };
}

export const createBill = async (billData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated. Please log in.');

  const userId = user.uid;
  if (!billData?.customerName || !Array.isArray(billData.products) || billData.products.length === 0) {
    throw new Error('Please fill all required fields.');
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      const profileRef = doc(db, `users/${userId}/profile/company`);
      const profileSnap = await transaction.get(profileRef);
      const profileData = profileSnap.exists() ? profileSnap.data() : {};

      const seller = sellerFromCompany(profileData, {
        personalName: user.displayName || '',
        authEmail: user.email || '',
      });
      const sellerName = seller.companyName;
      const sellerEmail = seller.email;
      const sellerGST = seller.gstin;
      const sellerPhone = seller.phone;
      const sellerAddress = seller.address;

      const quantityMap = new Map();
      for (const item of billData.products) {
        const productId = item.productId || item.product_id;
        if (!productId) throw new Error('Please select a product for every line.');
        const qty = Number(item.quantity) || 0;
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error('Quantity must be a whole number greater than zero.');
        }
        quantityMap.set(productId, (quantityMap.get(productId) || 0) + qty);
      }

      const productIds = Array.from(quantityMap.keys());
      const productDocs = await Promise.all(
        productIds.map((id) => transaction.get(doc(db, `users/${userId}/products/${id}`)))
      );

      const statsRef = doc(db, `users/${userId}/stats/dashboard`);
      const statsSnap = await transaction.get(statsRef);
      const existingStats = statsSnap.exists() ? statsSnap.data() : {};

      for (const snap of productDocs) {
        const requestedQty = quantityMap.get(snap.id);
        if (!snap.exists()) throw new Error('Product variant no longer exists.');
        const prod = snap.data();
        const currentQty = stockOf(prod);
        const variantLabel = formatVariantLabel(
          prod.itemName || 'Product',
          prod.packageWeight || 0,
          prod.weightUnit || ''
        );
        if (currentQty < requestedQty) {
          throw new Error(`${variantLabel} has only ${currentQty} units in stock. Requested ${requestedQty}.`);
        }
      }

      let invoiceSubtotal = 0;
      let invoiceGstAmount = 0;
      let invoiceGrandTotal = 0;
      const invoiceItems = [];

      for (const item of billData.products) {
        const productId = item.productId || item.product_id;
        const snap = productDocs.find((productDoc) => productDoc.id === productId);
        const prod = snap.data();
        const sellingPrice = money(prod.sellingPrice);
        const gstRate = money(prod.gst);
        const quantity = Number(item.quantity);

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
          weight: money(prod.packageWeight),
          unit: prod.weightUnit || '',
          sellingPrice: sellingPrice.toFixed(2),
          selling_price: sellingPrice.toFixed(2),
          price: sellingPrice.toFixed(2),
          gst: gstRate.toFixed(2),
          total: lineFinal.toFixed(2),
        });
      }

      const depletedProducts = [];
      for (const [prodId, requestedQty] of quantityMap.entries()) {
        const snap = productDocs.find((productDoc) => productDoc.id === prodId);
        const currentQty = stockOf(snap.data());
        const nextQty = currentQty - requestedQty;
        if (nextQty === 0 && currentQty > 0) {
          const prod = snap.data();
          depletedProducts.push({
            productId: prodId,
            productName: formatVariantLabel(prod.itemName, prod.packageWeight, prod.weightUnit),
          });
        }
        transaction.update(doc(db, `users/${userId}/products/${prodId}`), {
          quantity: nextQty,
          updatedAt: serverTimestamp(),
        });
      }

      const now = new Date();
      const invoiceNumber = `INV-${now.getTime()}`;
      const newInvoiceRef = doc(collection(db, `users/${userId}/invoices`));
      const salesRef = doc(db, `users/${userId}/sales_records/${newInvoiceRef.id}`);
      const invoiceRecord = buildInvoicePayload({
        invoiceId: newInvoiceRef.id,
        userId,
        invoiceNumber,
        sellerName,
        sellerEmail,
        sellerGST,
        sellerPhone,
        sellerAddress,
        billData,
        invoiceSubtotal,
        invoiceGstAmount,
        invoiceGrandTotal,
        invoiceItems,
        now,
      });

      transaction.set(newInvoiceRef, invoiceRecord);
      transaction.set(salesRef, invoiceRecord);
      transaction.set(
        statsRef,
        {
          totalRevenue: roundCurrency(money(existingStats.totalRevenue) + invoiceGrandTotal),
          totalBills: money(existingStats.totalBills) + 1,
          monthlySales: roundCurrency(money(existingStats.monthlySales) + invoiceGrandTotal),
          yearlySales: roundCurrency(money(existingStats.yearlySales) + invoiceGrandTotal),
          todaySales: roundCurrency(money(existingStats.todaySales) + invoiceGrandTotal),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return {
        success: true,
        message: 'Invoice created successfully.',
        invoice: { ...invoiceRecord, timestamp: now.toISOString() },
        items: invoiceItems,
        depletedProducts,
      };
    });
    (result.depletedProducts || []).forEach((item) => {
      notifyOutOfStock(item).catch(() => {});
    });
    return result;
  } catch (error) {
    if (isPermissionDenied(error)) {
    throw new Error(permissionMessage('saving the invoice and its sales record'), { cause: error });
    }
    throw error;
  } finally {
    clearBillPageCache(userId);
  }
};

export const getBills = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const user = auth.currentUser;
  if (!user) return emptyBills(page);

  const invoicesRef = collection(db, `users/${user.uid}/invoices`);
  const term = String(search || '').trim().toLowerCase();

  if (term) {
    const matched = await searchInvoices(user.uid, term);
    const totalRecords = matched.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * limit;
    const paginated = matched.slice(start, start + limit);
    return {
      success: true,
      invoices: paginated,
      bills: paginated,
      currentPage: safePage,
      totalPages,
      totalRecords,
      totalBills: totalRecords,
    };
  }

  const countSnap = await getCountFromServer(invoicesRef);
  const totalRecords = countSnap.data().count;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const cursors = pageCursors.get(user.uid) || [];
  if (safePage === 1) cursors.length = 0;

  const readPage = async (targetPage, previousCursor) => getDocs(query(
    invoicesRef,
    orderBy('created_at', 'desc'),
    ...(previousCursor ? [startAfter(previousCursor)] : []),
    firestoreLimit(limit)
  )).then((snap) => {
    if (snap.docs.length) cursors[targetPage - 1] = snap.docs[snap.docs.length - 1];
    return snap;
  });

  if (!cursors[safePage - 2] && safePage > 1) {
    let previous = null;
    for (let current = 1; current < safePage; current += 1) {
      const snap = await readPage(current, previous);
      previous = snap.docs[snap.docs.length - 1] || null;
      if (!previous) break;
    }
  }

  const snap = await readPage(safePage, safePage > 1 ? cursors[safePage - 2] : null);
  pageCursors.set(user.uid, cursors);
  const paginated = snap.docs.map(mapInvoiceDoc);

  return {
    success: true,
    invoices: paginated,
    bills: paginated,
    currentPage: safePage,
    totalPages,
    totalRecords,
    totalBills: totalRecords,
  };
};

function quantitiesByProduct(items = []) {
  const map = new Map();
  for (const item of items) {
    const productId = item.productId || item.product_id;
    const quantity = Number(item.quantity) || 0;
    if (!productId || quantity <= 0) continue;
    map.set(productId, (map.get(productId) || 0) + quantity);
  }
  return map;
}

export const deleteInvoiceAsWrongEntry = async (invoiceId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated. Please log in.');
  if (!invoiceId) throw new Error('Invoice not found or already deleted.');
  const userId = user.uid;

  try {
    const result = await runTransaction(db, async (transaction) => {
      const invoiceRef = doc(db, `users/${userId}/invoices/${invoiceId}`);
      const invoiceSnap = await transaction.get(invoiceRef);
      if (!invoiceSnap.exists()) {
        throw new Error('This invoice has already been deleted or reversed.');
      }

      const invoice = invoiceSnap.data();
      const statsRef = doc(db, `users/${userId}/stats/dashboard`);
      const statsSnap = await transaction.get(statsRef);
      const stats = statsSnap.exists() ? statsSnap.data() : {};
      const quantityMap = quantitiesByProduct(invoice.items);
      const productSnaps = await Promise.all(
        Array.from(quantityMap.keys()).map((productId) => transaction.get(doc(db, `users/${userId}/products/${productId}`)))
      );

      for (const snap of productSnaps) {
        if (!snap.exists()) continue;
        const restoreQty = quantityMap.get(snap.id) || 0;
        transaction.update(snap.ref, {
          quantity: stockOf(snap.data()) + restoreQty,
          updatedAt: serverTimestamp(),
        });
      }

      const grandTotal = money(invoice.grand_total ?? invoice.grandTotal);
      const previousBills = money(stats.totalBills);
      transaction.set(
        statsRef,
        {
          totalRevenue: floorMoney(money(stats.totalRevenue) - grandTotal),
          totalBills: previousBills > 1 ? previousBills - 1 : 0,
          monthlySales: floorMoney(money(stats.monthlySales) - grandTotal),
          yearlySales: floorMoney(money(stats.yearlySales) - grandTotal),
          todaySales: floorMoney(money(stats.todaySales) - grandTotal),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.delete(invoiceRef);
      transaction.delete(doc(db, `users/${userId}/sales_records/${invoiceId}`));

      return {
        success: true,
        invoiceNumber: invoice.invoice_number || invoice.invoiceNumber || invoiceId,
      };
    });
    return result;
  } catch (error) {
    if (isPermissionDenied(error)) {
    throw new Error(permissionMessage('reversing this invoice'), { cause: error });
    }
    throw error;
  } finally {
    clearBillPageCache(userId);
  }
};

export const completelyDeleteInvoice = async (invoiceId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated. Please log in.');
  if (!invoiceId) throw new Error('Invoice not found or already deleted.');
  const userId = user.uid;

  try {
    return await runTransaction(db, async (transaction) => {
      const invoiceRef = doc(db, `users/${userId}/invoices/${invoiceId}`);
      const deletedRef = doc(db, `users/${userId}/deleted_invoices/${invoiceId}`);
      const salesRef = doc(db, `users/${userId}/sales_records/${invoiceId}`);

      const invoiceSnap = await transaction.get(invoiceRef);
      if (!invoiceSnap.exists()) {
        throw new Error('Invoice not found or already deleted.');
      }
      const invoice = invoiceSnap.data();
      if (!invoice) throw new Error('Invoice data is empty.');

      const deletedSnap = await transaction.get(deletedRef);
      const salesSnap = await transaction.get(salesRef);

      if (!deletedSnap.exists()) {
        transaction.set(deletedRef, {
          ...invoice,
          id: invoiceId,
          deletedAt: new Date().toISOString(),
          deletionType: 'Completely Delete',
        });
      }
      if (!salesSnap.exists()) {
        transaction.set(salesRef, { ...invoice, id: invoiceId });
      }
      transaction.delete(invoiceRef);

      return {
        success: true,
        invoiceNumber: invoice.invoice_number || invoice.invoiceNumber || invoiceId,
      };
    });
  } catch (error) {
    if (isPermissionDenied(error)) {
    throw new Error(permissionMessage('archiving this invoice'), { cause: error });
    }
    throw error;
  } finally {
    clearBillPageCache(userId);
  }
};

export const getInvoiceById = async (invoiceId) => {
  const user = auth.currentUser;
  if (!user || !invoiceId) return null;
  const snap = await getDoc(doc(db, `users/${user.uid}/invoices/${invoiceId}`));
  if (!snap.exists()) return null;
  return mapInvoiceDoc(snap);
};
