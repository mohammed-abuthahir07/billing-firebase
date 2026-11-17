import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { isPermissionDenied, permissionMessage } from '../utils/salesMerge';

export const getDeletedInvoices = async () => {
  const user = auth.currentUser;
  if (!user) return { success: true, invoices: [], years: [] };

  try {
    const snap = await getDocs(collection(db, `users/${user.uid}/deleted_invoices`));
    const invoices = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        items: data.items || [],
        status: data.status || 'Paid',
      };
    });

    invoices.sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));
    const years = Array.from(new Set(
      invoices
        .map((invoice) => Number(invoice.year))
        .filter((year) => Number.isFinite(year) && year > 0)
    )).sort((a, b) => b - a);

    return { success: true, invoices, years };
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new Error(permissionMessage('reading deleted invoices'), { cause: error });
    }
    throw error;
  }
};
