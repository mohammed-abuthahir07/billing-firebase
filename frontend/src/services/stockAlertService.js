import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc } from 'firebase/firestore';
import app, { auth, db } from '../firebase/firebase';

const attempted = new Set();

// The Cloud Functions API is disabled for this project, so
// sendOutOfStockEmail is not deployed. Calling it returns 404 with no
// Access-Control-Allow-Origin header, which the browser reports as CORS.
const stockEmailEnabled = import.meta.env.VITE_STOCK_EMAIL_ENABLED === 'true';

export async function notifyOutOfStock({ productId, productName }) {
  const user = auth.currentUser;
  if (!stockEmailEnabled || !user?.email || !productId || attempted.has(productId)) return;
  attempted.add(productId);

  try {
    const send = httpsCallable(getFunctions(app, 'us-central1'), 'sendOutOfStockEmail');
    await send({ productId, productName });
    await updateDoc(doc(db, `users/${user.uid}/products/${productId}`), {
      outOfStockNotified: true,
    });
  } catch (error) {
    attempted.delete(productId);
    throw error;
  }
}

export async function clearOutOfStockNotice(productId) {
  const user = auth.currentUser;
  if (!user || !productId) return;
  attempted.delete(productId);
  await updateDoc(doc(db, `users/${user.uid}/products/${productId}`), {
    outOfStockNotified: false,
  });
}
