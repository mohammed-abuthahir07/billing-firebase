import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

/**
 * Fetch all products for the currently logged-in user.
 */
export const getProducts = async () => {
  const user = auth.currentUser;
  if (!user) return { success: true, total: 0, products: [] };

  const productsRef = collection(db, `users/${user.uid}/products`);
  const snapshot = await getDocs(productsRef);

  const products = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      user_id: user.uid,
      item_name: data.itemName || '',
      itemName: data.itemName || '',
      category: data.category || '',
      sku: data.sku || '',
      description: data.description || '',
      gst: String(Number(data.gst || 0).toFixed(2)),
      package_weight: String(Number(data.packageWeight || 0).toFixed(2)),
      packageWeight: data.packageWeight || 0,
      weight_unit: data.weightUnit || 'g',
      weightUnit: data.weightUnit || 'g',
      selling_price: String(Number(data.sellingPrice || 0).toFixed(2)),
      sellingPrice: data.sellingPrice || 0,
      quantity: typeof data.quantity === 'number' ? data.quantity : 0,
      created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      updated_at: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };
  });

  // Sort by item_name ASC, package_weight ASC
  products.sort((a, b) => {
    if (a.item_name.localeCompare(b.item_name) !== 0) {
      return a.item_name.localeCompare(b.item_name);
    }
    return Number(a.package_weight) - Number(b.package_weight);
  });

  return {
    success: true,
    total: products.length,
    products,
  };
};

/**
 * Create a new packed product variant.
 */
export const createProduct = async (productData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const newDoc = {
    itemName: (productData.itemName || '').trim(),
    category: (productData.category || '').trim(),
    sku: productData.sku || null,
    description: productData.description || null,
    gst: Number(productData.gst) || 0,
    packageWeight: Number(productData.packageWeight) || 0,
    weightUnit: (productData.weightUnit || 'g').trim(),
    sellingPrice: Number(productData.sellingPrice) || 0,
    quantity: Math.floor(Number(productData.quantity) || 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, `users/${user.uid}/products`), newDoc);

  return {
    success: true,
    message: 'Product variant added successfully.',
    product: {
      id: docRef.id,
      user_id: user.uid,
      item_name: newDoc.itemName,
      category: newDoc.category,
      sku: newDoc.sku,
      description: newDoc.description,
      gst: String(newDoc.gst.toFixed(2)),
      package_weight: String(newDoc.packageWeight.toFixed(2)),
      weight_unit: newDoc.weightUnit,
      selling_price: String(newDoc.sellingPrice.toFixed(2)),
      quantity: newDoc.quantity,
    },
  };
};

/**
 * Update an existing product.
 */
export const updateProduct = async (id, productData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const prodRef = doc(db, `users/${user.uid}/products/${id}`);
  const updatePayload = {
    updatedAt: serverTimestamp(),
  };

  if (productData.itemName !== undefined) updatePayload.itemName = productData.itemName.trim();
  if (productData.category !== undefined) updatePayload.category = productData.category.trim();
  if (productData.sku !== undefined) updatePayload.sku = productData.sku;
  if (productData.description !== undefined) updatePayload.description = productData.description;
  if (productData.gst !== undefined) updatePayload.gst = Number(productData.gst) || 0;
  if (productData.packageWeight !== undefined) updatePayload.packageWeight = Number(productData.packageWeight) || 0;
  if (productData.weightUnit !== undefined) updatePayload.weightUnit = productData.weightUnit.trim();
  if (productData.sellingPrice !== undefined) updatePayload.sellingPrice = Number(productData.sellingPrice) || 0;
  if (productData.quantity !== undefined) updatePayload.quantity = Math.floor(Number(productData.quantity) || 0);

  await updateDoc(prodRef, updatePayload);

  return {
    success: true,
    message: 'Product variant updated successfully.',
  };
};

/**
 * Delete a product variant.
 * Checks existing invoices to ensure historical invoice integrity.
 */
export const deleteProduct = async (id) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Check if variant is referenced in existing invoices
  const invoicesSnapshot = await getDocs(collection(db, `users/${user.uid}/invoices`));
  let isReferenced = false;

  for (const d of invoicesSnapshot.docs) {
    const invData = d.data();
    if (Array.isArray(invData.items)) {
      if (invData.items.some((item) => item.productId === id || item.product_id === id)) {
        isReferenced = true;
        break;
      }
    }
  }

  if (isReferenced) {
    throw new Error('This variant is used in existing invoices and cannot be deleted.');
  }

  await deleteDoc(doc(db, `users/${user.uid}/products/${id}`));

  return {
    success: true,
    message: 'Product variant deleted successfully.',
  };
};
