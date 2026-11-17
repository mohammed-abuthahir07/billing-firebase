import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { isPermissionDenied } from '../../utils/salesMerge';

export const getAdminDeletedInvoices = async () => {
  const usersSnap = await getDocs(collection(db, 'users'));
  const invoices = [];
  const companies = [];
  let salesRecordsBlocked = false;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    let companyName = userData.name || 'Business User';

    try {
      const profileSnap = await getDoc(doc(db, `users/${userId}/profile/company`));
      if (profileSnap.exists()) {
        companyName = profileSnap.data().companyName || companyName;
      }
    } catch (error) {
      if (!isPermissionDenied(error)) throw error;
    }

    companies.push({ id: userId, name: companyName });

    try {
      const deletedSnap = await getDocs(collection(db, `users/${userId}/deleted_invoices`));
      deletedSnap.forEach((docSnap) => {
        const data = docSnap.data();
        invoices.push({
          id: docSnap.id,
          userId,
          companyName,
          ...data,
          items: Array.isArray(data.items) ? data.items : [],
          status: data.status || 'Paid',
        });
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        salesRecordsBlocked = true;
        continue;
      }
      throw error;
    }
  }

  invoices.sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));
  const years = Array.from(new Set(
    invoices.map((invoice) => Number(invoice.year)).filter((year) => year > 0)
  )).sort((a, b) => b - a);

  return {
    success: true,
    invoices,
    companies,
    years,
    readBlocked: salesRecordsBlocked,
  };
};
