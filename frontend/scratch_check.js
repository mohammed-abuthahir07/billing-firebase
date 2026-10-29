import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARl_AiGJ5AYmo0EIt8w_wq9IbjqjF4-Y8",
  authDomain: "billing-firebase-1b0e4.firebaseapp.com",
  projectId: "billing-firebase-1b0e4",
  storageBucket: "billing-firebase-1b0e4.firebasestorage.app",
  messagingSenderId: "477563068737",
  appId: "1:477563068737:web:0d96c0e29c3446679241c0",
  measurementId: "G-S7FXG2Y5K2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const usersSnap = await getDocs(collection(db, "users"));
  console.log("=== USERS COUNT ===", usersSnap.size);
  usersSnap.forEach(d => console.log("USER:", d.id, JSON.stringify(d.data())));

  const adminsSnap = await getDocs(collection(db, "admins"));
  console.log("=== ADMINS COUNT ===", adminsSnap.size);
  adminsSnap.forEach(d => console.log(d.id, "=>", JSON.stringify(d.data())));
}

check().catch(console.error);
