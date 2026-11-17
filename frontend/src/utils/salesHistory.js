import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { isPermissionDenied, mergeRecords } from './salesMerge';

function snapshotRecords(snapshot) {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

function scopedQuery(ref, { year, month } = {}) {
  if (year != null && month != null) {
    return query(ref, where('year', '==', Number(year)), where('month', '==', Number(month)));
  }
  if (year != null) {
    return query(ref, where('year', '==', Number(year)));
  }
  return ref;
}

/**
 * Flutter merge: sales_records win by document id, then active invoices fill gaps.
 * A permission denial on sales_records falls back to invoices and is reported.
 */
export async function loadMergedRecords(userId, filters = {}) {
  if (!userId) {
    return { records: [], salesRecordsBlocked: false };
  }

  const salesRef = collection(db, `users/${userId}/sales_records`);
  const invoicesRef = collection(db, `users/${userId}/invoices`);
  let salesRecords = [];
  let salesRecordsBlocked = false;

  try {
    const salesSnap = await getDocs(scopedQuery(salesRef, filters));
    salesRecords = snapshotRecords(salesSnap);
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
    salesRecordsBlocked = true;
  }

  const invoiceSnap = await getDocs(scopedQuery(invoicesRef, filters));
  const invoiceRecords = snapshotRecords(invoiceSnap);

  return {
    records: mergeRecords(salesRecords, invoiceRecords),
    salesRecordsBlocked,
  };
}
