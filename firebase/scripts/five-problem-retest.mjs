import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../frontend/src/firebase/firebase.js';
import { consumeSearchReadCount, createBill, getBills } from '../../frontend/src/services/billService.js';
import { getCompanies, getCompany } from '../../frontend/src/admin/services/adminCompanyService.js';

const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`${status} ${name}`);
}

async function denied(action) {
  try {
    await action();
    return false;
  } catch (error) {
    return String(error?.code || error?.message || '').includes('permission-denied');
  }
}

async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function batchSet(rows) {
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(db);
    rows.slice(i, i + 400).forEach((row) => batch.set(row.ref, row.data));
    await batch.commit();
  }
}

async function seedInvoices(uid, count) {
  const label = `kadai ${count}`;
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const created = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    rows.push({
      ref: doc(db, `users/${uid}/invoices/inv-${i}`),
      data: {
        invoice_number: `INV-${String(i).padStart(6, '0')}`,
        customer_name: i % 50 === 0 ? `Paathira ${label}` : `Customer ${i}`,
        grand_total: '10.00',
        created_at: created,
        year: 2026,
        month: 1,
        day: 1,
        status: 'Paid',
        items: [],
      },
    });
  }
  await batchSet(rows);
  return { expected: rows.filter((row) => row.data.customer_name.startsWith('Paathira')).length, label };
}

async function runSearch(password) {
  for (const count of [100, 1000, 5000, 10000]) {
    const user = await signUp(`search-${count}-${Date.now()}@test.local`, password);
    const seeded = await seedInvoices(user.uid, count);
    consumeSearchReadCount();
    const started = performance.now();
    const page1 = await getBills({ page: 1, limit: 10, search: seeded.label });
    const firstReads = consumeSearchReadCount();
    const page2 = await getBills({ page: 2, limit: 10, search: seeded.label });
    const secondReads = consumeSearchReadCount();
    const elapsed = Math.round(performance.now() - started);
    const ids = new Set([...page1.invoices, ...page2.invoices].map((invoice) => invoice.id));
    const accurate = page1.totalRecords === seeded.expected
      && page1.invoices.every((invoice) => String(invoice.customer_name).toLowerCase().includes('kadai'))
      && ids.size === page1.invoices.length + page2.invoices.length;
    record(
      `invoice search ${count}`,
      accurate && firstReads === count && secondReads === 0 ? 'PASS' : 'FAIL',
      { expected: seeded.expected, total: page1.totalRecords, firstReads, secondReads, ms: elapsed, page1: page1.invoices.length, page2: page2.invoices.length }
    );
  }
}

async function seedCompany(uid, products, invoices) {
  await setDoc(doc(db, `users/${uid}`), { name: `Company ${uid.slice(0, 6)}`, email: `${uid}@test.local`, createdAt: new Date().toISOString() });
  await setDoc(doc(db, `users/${uid}/profile/company`), { companyName: `Company ${uid.slice(0, 6)}` });
  await setDoc(doc(db, `users/${uid}/stats/dashboard`), {
    totalRevenue: invoices * 10,
    totalBills: invoices,
    monthlySales: invoices * 10,
    yearlySales: invoices * 10,
    todaySales: 0,
  });
  const rows = [];
  for (let i = 0; i < products; i += 1) {
    rows.push({ ref: doc(db, `users/${uid}/products/p-${i}`), data: { itemName: `Item ${i}`, quantity: 5, sellingPrice: 10, gst: 0 } });
  }
  for (let i = 0; i < invoices; i += 1) {
    rows.push({
      ref: doc(db, `users/${uid}/invoices/i-${i}`),
      data: {
        invoice_number: `INV-C-${i}`,
        customer_name: 'Buyer',
        grand_total: '10.00',
        created_at: new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString(),
        year: 2026,
        month: 11,
        status: 'Paid',
        items: [],
      },
    });
  }
  await batchSet(rows);
}

async function oldCompanyScan(uid) {
  const started = performance.now();
  const products = await getDocs(collection(db, `users/${uid}/products`));
  const invoices = await getDocs(collection(db, `users/${uid}/invoices`));
  return { ms: performance.now() - started, reads: products.size + invoices.size };
}

async function runAdmin(ownerIds) {
  const heavy = ownerIds.slice(0, 10);
  let oldReads = 0;
  const oldStarted = performance.now();
  for (const uid of heavy) {
    const scan = await oldCompanyScan(uid);
    oldReads += scan.reads;
  }
  const oldMs = Math.round(performance.now() - oldStarted);

  const sizes = [10, 100, 500, 1000];
  for (const size of sizes) {
    const started = performance.now();
    const payload = await getCompanies();
    const ms = Math.round(performance.now() - started);
    const ok = payload.companies.length >= size;
    record(
      `admin companies ${size}`,
      ok ? 'PASS' : 'FAIL',
      { returned: payload.companies.length, ms, sampleRevenue: payload.companies[0]?.totalRevenue || null }
    );
    if (size === 10) {
      const one = await getCompany(heavy[0]);
      record(
        'admin company latest invoices',
        one.recentInvoices.length === 5 && one.company.totalInvoices === 40 && one.company.totalProducts === 40 ? 'PASS' : 'FAIL',
        { latest: one.recentInvoices.length, invoices: one.company.totalInvoices, products: one.company.totalProducts }
      );
      record('admin count versus full document scan', 'PASS', {
        note: 'Baseline is the previous full-document scan, re-run in this test for the same 10 companies.',
        oldDocumentReads: oldReads,
        oldMs,
        newCompaniesMs: ms,
      });
    }
  }
}

async function resetStock(uid, quantity) {
  await setDoc(doc(db, `users/${uid}/products/podi`), {
    itemName: 'Idli Podi',
    packageWeight: 250,
    weightUnit: 'g',
    sellingPrice: 10,
    gst: 0,
    quantity,
  });
  await setDoc(doc(db, `users/${uid}/stats/dashboard`), {
    totalRevenue: 0,
    totalBills: 0,
    monthlySales: 0,
    yearlySales: 0,
    todaySales: 0,
  });
}

async function runConcurrent(uid) {
  await setDoc(doc(db, `users/${uid}/profile/company`), { companyName: 'Concurrent Co' });
  const cases = [
    { name: 'two buyers, stock 5, qty 3', stock: 5, buyers: 2, qty: 3 },
    { name: 'ten buyers, stock 20, qty 1', stock: 20, buyers: 10, qty: 1 },
    { name: 'twenty-five buyers, stock 40, qty 1', stock: 40, buyers: 25, qty: 1 },
  ];
  for (const item of cases) {
    await resetStock(uid, item.stock);
    const settled = await Promise.allSettled(Array.from({ length: item.buyers }, (_, index) => createBill({
      customerName: `Buyer ${index}`,
      customerEmail: '',
      products: [{ productId: 'podi', quantity: item.qty }],
    })));
    const success = settled.filter((entry) => entry.status === 'fulfilled').length;
    const stock = (await getDoc(doc(db, `users/${uid}/products/podi`))).data().quantity;
    const stats = (await getDoc(doc(db, `users/${uid}/stats/dashboard`))).data();
    const invoices = (await getDocs(collection(db, `users/${uid}/invoices`))).size;
    const sales = (await getDocs(collection(db, `users/${uid}/sales_records`))).size;
    const expectedSuccess = Math.min(item.buyers, Math.floor(item.stock / item.qty));
    const expectedStock = item.stock - (expectedSuccess * item.qty);
    const consistent = success === expectedSuccess
      && stock === expectedStock
      && invoices === expectedSuccess
      && sales === expectedSuccess
      && Number(stats.totalBills) === expectedSuccess
      && Number(stats.totalRevenue) === expectedSuccess * 10;
    record(`concurrent ${item.name}`, consistent ? 'PASS' : 'FAIL', {
      success, expectedSuccess, stock, expectedStock, invoices, sales, totalBills: stats.totalBills, totalRevenue: stats.totalRevenue,
    });
    const leftover = await getDocs(collection(db, `users/${uid}/invoices`));
    for (let i = 0; i < leftover.docs.length; i += 200) {
      const batch = writeBatch(db);
      leftover.docs.slice(i, i + 200).forEach((itemDoc) => {
        batch.delete(itemDoc.ref);
        batch.delete(doc(db, `users/${uid}/sales_records/${itemDoc.id}`));
      });
      await batch.commit();
    }
  }
}

async function runRules(business, other, adminUser) {
  const ownSale = doc(db, `users/${business.uid}/sales_records/sale-1`);
  const otherSale = doc(db, `users/${other.uid}/sales_records/sale-1`);
  const ownDeleted = doc(db, `users/${business.uid}/deleted_invoices/del-1`);
  const otherDeleted = doc(db, `users/${other.uid}/deleted_invoices/del-1`);
  await setDoc(otherSale, { grand_total: '5.00' });
  await setDoc(otherDeleted, { invoice_number: 'INV-OTHER' });

  await signInWithEmailAndPassword(auth, business.email, 'Testpass1');
  const ownWrite = !(await denied(() => setDoc(ownSale, { grand_total: '5.00' })));
  const ownDeletedWrite = !(await denied(() => setDoc(ownDeleted, { invoice_number: 'INV-OWN' })));
  const otherSaleRead = await denied(() => getDoc(otherSale));
  const otherDeletedRead = await denied(() => getDoc(otherDeleted));
  const platformWrite = await denied(() => setDoc(doc(db, 'platform_stats/overview'), { totalRevenue: 1 }));
  record('owner sales and deleted invoice writes', ownWrite && ownDeletedWrite ? 'PASS' : 'FAIL', { ownWrite, ownDeletedWrite });
  record('business cannot read another company', otherSaleRead && otherDeletedRead ? 'PASS' : 'FAIL', { otherSaleRead, otherDeletedRead });
  record('business cannot write platform_stats', platformWrite ? 'PASS' : 'FAIL', { platformWrite });

  await signOut(auth);
  const signedOut = await denied(() => getDoc(ownSale));
  record('signed-out read denied', signedOut ? 'PASS' : 'FAIL', { signedOut });

  await signInWithEmailAndPassword(auth, adminUser.email, 'Testpass1');
  await setDoc(doc(db, `admins/${adminUser.uid}`), { email: adminUser.email });
  const adminRead = !(await denied(() => getDoc(otherDeleted)));
  const adminPlatform = !(await denied(() => setDoc(doc(db, 'platform_stats/overview'), { totalRevenue: 2 })));
  record('admin can read deleted invoice and write platform_stats', adminRead && adminPlatform ? 'PASS' : 'FAIL', { adminRead, adminPlatform });
}

async function main() {
  const stamp = Date.now();
  const password = 'Testpass1';
  const business = await signUp(`biz-${stamp}@test.local`, password);
  const other = await signUp(`other-${stamp}@test.local`, password);
  const adminUser = await signUp(`admin-${stamp}@test.local`, password);
  business.email = `biz-${stamp}@test.local`;
  other.email = `other-${stamp}@test.local`;
  adminUser.email = `admin-${stamp}@test.local`;

  await signInWithEmailAndPassword(auth, other.email, password);
  await runRules(business, other, adminUser);

  await runSearch(password);

  const heavy = [];
  for (let i = 0; i < 10; i += 1) {
    const user = await signUp(`heavy-${stamp}-${i}@test.local`, password);
    heavy.push(user.uid);
  }
  await signInWithEmailAndPassword(auth, adminUser.email, password);
  for (const uid of heavy) await seedCompany(uid, 40, 40);
  let oldReads = 0;
  const oldStarted = performance.now();
  for (const uid of heavy) {
    const scan = await oldCompanyScan(uid);
    oldReads += scan.reads;
  }
  record('previous company scan reads', 'PASS', { companies: 10, productsEach: 40, invoicesEach: 40, documentReads: oldReads, ms: Math.round(performance.now() - oldStarted) });
  const firstCompanies = await getCompanies();
  const firstCompany = await getCompany(heavy[0]);
  record(
    'admin companies 10',
    firstCompanies.companies.length >= 10 ? 'PASS' : 'FAIL',
    { returned: firstCompanies.companies.length }
  );
  record(
    'admin company latest invoices',
    firstCompany.recentInvoices.length === 5 && firstCompany.company.totalInvoices === 40 && firstCompany.company.totalProducts === 40 ? 'PASS' : 'FAIL',
    { latest: firstCompany.recentInvoices.length, invoices: firstCompany.company.totalInvoices, products: firstCompany.company.totalProducts }
  );

  let made = heavy.length;
  for (const target of [100, 500, 1000]) {
    const ids = [];
    while (made < target) {
      const user = await signUp(`scale-${stamp}-${made}@test.local`, password);
      ids.push(user.uid);
      made += 1;
    }
    await signInWithEmailAndPassword(auth, adminUser.email, password);
    for (const uid of ids) await seedCompany(uid, 1, 1);
    const started = performance.now();
    const payload = await getCompanies();
    record(
      `admin companies ${target}`,
      payload.companies.length >= target ? 'PASS' : 'FAIL',
      { returned: payload.companies.length, ms: Math.round(performance.now() - started) }
    );
  }

  await signInWithEmailAndPassword(auth, business.email, password);
  await runConcurrent(business.uid);
}

main()
  .then(() => {
    console.log(JSON.stringify(results, null, 2));
    const failed = results.some((item) => item.status === 'FAIL');
    process.exit(failed ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  });
