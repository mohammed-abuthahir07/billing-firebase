/**
 * Safe Cleanup Script
 * Wipes out all test-generated records from test collections
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { SEED_ADMIN, SEED_USERS } from "./dummyData.js";

const firebaseConfig = {
  apiKey: "fake-api-key-for-emulator",
  projectId: "billing-firebase-testing",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function cleanupTestData() {
  console.log("🧹 Cleaning up test data...");

  await deleteDoc(doc(db, "admins", SEED_ADMIN.uid));

  for (const user of SEED_USERS) {
    // Delete products
    const prodSnap = await getDocs(collection(db, `users/${user.uid}/products`));
    for (const d of prodSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete invoices
    const invSnap = await getDocs(collection(db, `users/${user.uid}/invoices`));
    for (const d of invSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete company profile & stats
    await deleteDoc(doc(db, `users/${user.uid}/profile/company`));
    await deleteDoc(doc(db, `users/${user.uid}/stats/dashboard`));
    await deleteDoc(doc(db, "users", user.uid));
  }

  await deleteDoc(doc(db, "platform_stats/overview"));
  console.log("✨ Test data cleanup completed.");
}
