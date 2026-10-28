import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const deleteProduct = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const userId = auth.uid;
    const { productId } = request.data as { productId: string };

    if (!productId) {
      throw new HttpsError("invalid-argument", "Product ID is required.");
    }

    const db = admin.firestore();
    const prodRef = db.doc(`users/${userId}/products/${productId}`);
    const prodSnap = await prodRef.get();

    if (!prodSnap.exists) {
      throw new HttpsError("not-found", "Product variant not found.");
    }

    // Check if variant is referenced in existing invoices
    const invoicesSnapshot = await db
      .collection(`users/${userId}/invoices`)
      .limit(500)
      .get();

    let isReferenced = false;
    for (const doc of invoicesSnapshot.docs) {
      const invoiceData = doc.data();
      if (Array.isArray(invoiceData.items)) {
        if (invoiceData.items.some((item: any) => item.productId === productId || item.product_id === productId)) {
          isReferenced = true;
          break;
        }
      }
    }

    if (isReferenced) {
      throw new HttpsError(
        "failed-precondition",
        "This variant is used in existing invoices and cannot be deleted."
      );
    }

    await prodRef.delete();

    return {
      success: true,
      message: "Product variant deleted successfully.",
    };
  }
);
