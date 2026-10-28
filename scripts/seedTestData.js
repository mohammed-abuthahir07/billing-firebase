/**
 * Safe Local Firestore & Auth Seeder for Testing
 * Seeds realistic dummy accounts, products, variants, and invoices
 * into Firebase Emulators or a designated test environment.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { SEED_ADMIN, SEED_USERS, SAMPLE_PRODUCTS, SAMPLE_CUSTOMERS } from "./dummyData.js";
import { roundCurrency, formatVariantLabel } from "../firebase/functions/lib/utils/formatters.js";

const firebaseConfig = {
  apiKey: "fake-api-key-for-emulator",
  projectId: "billing-firebase-testing",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function seedTestData() {
  console.log("🌱 Starting test data seeding...");

  // 1. Seed Admin
  await setDoc(doc(db, "admins", SEED_ADMIN.uid), {
    email: SEED_ADMIN.email,
    role: "admin",
    assignedAt: new Date().toISOString(),
  });
  console.log(`✅ Admin seeded: ${SEED_ADMIN.email}`);

  // 2. Seed Users & Companies
  for (const user of SEED_USERS) {
    await setDoc(doc(db, "users", user.uid), {
      name: user.name,
      email: user.email,
      createdAt: new Date().toISOString(),
      role: "user",
    });

    await setDoc(doc(db, `users/${user.uid}/profile/company`), {
      ...user.company,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ User & Profile seeded: ${user.name}`);

    // Seed products for each user
    const productRefs = [];
    for (const prod of SAMPLE_PRODUCTS) {
      const prodDoc = await addDoc(collection(db, `users/${user.uid}/products`), {
        ...prod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      productRefs.push({ id: prodDoc.id, ...prod });
    }
    console.log(`📦 Seeded ${SAMPLE_PRODUCTS.length} products for ${user.name}`);

    // Seed realistic invoices
    let totalRev = 0;
    let totalInvoices = 0;
    for (let i = 0; i < 20; i++) {
      const customer = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length];
      const selectedProduct = productRefs[i % productRefs.length];
      const qty = (i % 3) + 1;
      const lineTotal = roundCurrency(selectedProduct.sellingPrice * qty);
      const lineGst = roundCurrency((lineTotal * selectedProduct.gst) / 100);
      const grandTotal = roundCurrency(lineTotal + lineGst);

      totalRev += grandTotal;
      totalInvoices += 1;

      const date = new Date(2026, 9, (i % 28) + 1); // October 2026 dates
      await addDoc(collection(db, `users/${user.uid}/invoices`), {
        invoice_number: `INV-TEST-2026-${1000 + i}`,
        seller_name: user.company.companyName,
        seller_email: user.company.alternateEmail,
        seller_gst: user.company.gstNumber,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_gst: customer.gst,
        customer_address: customer.address,
        subtotal: String(lineTotal.toFixed(2)),
        gst_amount: String(lineGst.toFixed(2)),
        grand_total: String(grandTotal.toFixed(2)),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        created_at: date.toISOString(),
        items: [
          {
            product_id: selectedProduct.id,
            product_name: formatVariantLabel(selectedProduct.itemName, selectedProduct.packageWeight, selectedProduct.weightUnit),
            quantity: qty,
            price: String(selectedProduct.sellingPrice.toFixed(2)),
            gst: String(selectedProduct.gst.toFixed(2)),
            total: String(grandTotal.toFixed(2)),
          },
        ],
      });
    }

    // Set Dashboard stats
    await setDoc(doc(db, `users/${user.uid}/stats/dashboard`), {
      totalRevenue: totalRev,
      totalBills: totalInvoices,
      monthlySales: totalRev,
      yearlySales: totalRev,
      todaySales: roundCurrency(totalRev / 10),
      updatedAt: new Date().toISOString(),
    });
    console.log(`🧾 Seeded 20 invoices & stats for ${user.name}`);
  }

  // Seed platform stats
  await setDoc(doc(db, "platform_stats/overview"), {
    totalUsers: SEED_USERS.length,
    totalProducts: SEED_USERS.length * SAMPLE_PRODUCTS.length,
    totalInvoices: SEED_USERS.length * 20,
    totalRevenue: "45250.00",
    monthlyRevenue: "45250.00",
    updatedAt: new Date().toISOString(),
  });

  console.log("🌟 Seeding completed successfully!");
}
