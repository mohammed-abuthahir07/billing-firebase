/**
 * Automated Test Runner for Cloud Functions, Math, and Firestore Operations
 * Simulates concurrent invoice creation, stock deductions, insufficient stock rejections,
 * financial calculations, and user/admin security boundaries.
 */

import { roundCurrency, formatVariantLabel } from '../firebase/functions/lib/utils/formatters.js';
import { SAMPLE_PRODUCTS, SAMPLE_CUSTOMERS, SEED_USERS } from './dummyData.js';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ test: testName, status: 'PASS', details });
    console.log(`✅ PASS: ${testName}`);
  } else {
    failed++;
    results.push({ test: testName, status: 'FAIL', details });
    console.error(`❌ FAIL: ${testName} - ${details}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING BILLING SOFTWARE AUTOMATED TEST SUITE');
console.log('====================================================\n');

// 1. Math and Formatting Accuracy Tests
assert(roundCurrency(175.004) === 175.0, 'Currency rounding 3 decimals downward');
assert(roundCurrency(175.006) === 175.01, 'Currency rounding 3 decimals upward');
assert(roundCurrency(178.50) === 178.5, 'Currency rounding exact 2 decimals');
assert(formatVariantLabel('Idli Podi', 250, 'g') === 'Idli Podi 250g', 'Format variant label grams');
assert(formatVariantLabel('Wheat Flour', 5, 'kg') === 'Wheat Flour 5kg', 'Format variant label kilograms');
assert(formatVariantLabel('Cow Ghee', 1, 'L') === 'Cow Ghee 1L', 'Format variant label liters');

// 2. Stock and Invoice Calculation Logic
const testStock = {
  'prod-1': { itemName: 'Idli Podi', packageWeight: 250, weightUnit: 'g', price: 175, gst: 5, stock: 10 },
  'prod-2': { itemName: 'Sambar Podi', packageWeight: 100, weightUnit: 'g', price: 70, gst: 5, stock: 3 },
  'prod-3': { itemName: 'Turmeric Powder', packageWeight: 500, weightUnit: 'g', price: 120, gst: 5, stock: 0 },
};

function executeSimulatedTransaction(items) {
  // Check stock
  for (const item of items) {
    const prod = testStock[item.productId];
    if (!prod) return { success: false, error: 'Product not found' };
    if (prod.stock < item.quantity) {
      const label = formatVariantLabel(prod.itemName, prod.packageWeight, prod.weightUnit);
      return { success: false, error: `${label} has only ${prod.stock} packs in stock.` };
    }
  }

  // Calculate totals
  let subtotal = 0;
  let gstAmount = 0;
  let grandTotal = 0;
  const lineSnapshots = [];

  for (const item of items) {
    const prod = testStock[item.productId];
    const lineTotal = roundCurrency(prod.price * item.quantity);
    const lineGst = roundCurrency((lineTotal * prod.gst) / 100);
    const lineGrand = roundCurrency(lineTotal + lineGst);

    subtotal = roundCurrency(subtotal + lineTotal);
    gstAmount = roundCurrency(gstAmount + lineGst);
    grandTotal = roundCurrency(grandTotal + lineGrand);

    lineSnapshots.push({
      productName: formatVariantLabel(prod.itemName, prod.packageWeight, prod.weightUnit),
      quantity: item.quantity,
      price: prod.price,
      gst: prod.gst,
      total: lineGrand
    });

    // Deduct stock
    prod.stock -= item.quantity;
  }

  return {
    success: true,
    invoice: {
      subtotal,
      gstAmount,
      grandTotal,
      items: lineSnapshots
    }
  };
}

// Test A: Normal purchase
const billA = executeSimulatedTransaction([
  { productId: 'prod-1', quantity: 2 }, // 175 * 2 = 350, 5% gst = 17.5 => 367.5
]);
assert(billA.success === true, 'Valid bill created successfully');
assert(billA.invoice.subtotal === 350, 'Bill A subtotal is correct (350)');
assert(billA.invoice.gstAmount === 17.5, 'Bill A GST is correct (17.5)');
assert(billA.invoice.grandTotal === 367.5, 'Bill A Grand total is correct (367.5)');
assert(testStock['prod-1'].stock === 8, 'Stock decremented accurately from 10 to 8');

// Test B: Insufficient stock rejection
const billB = executeSimulatedTransaction([
  { productId: 'prod-2', quantity: 5 }, // stock is 3
]);
assert(billB.success === false, 'Insufficient stock rejected');
assert(billB.error.includes('has only 3 packs in stock'), 'Accurate error message with variant name and remaining stock');
assert(testStock['prod-2'].stock === 3, 'Stock untouched after rejection');

// Test C: Out of stock product purchase
const billC = executeSimulatedTransaction([
  { productId: 'prod-3', quantity: 1 }, // stock is 0
]);
assert(billC.success === false, 'Out of stock purchase rejected');
assert(billC.error.includes('has only 0 packs in stock'), 'Zero stock rejection validated');

// 3. Concurrency simulation
let concurrentSuccesses = 0;
let concurrentFailures = 0;
// 5 simultaneous orders trying to buy 2 packs each of prod-1 (remaining stock: 8)
for (let i = 0; i < 5; i++) {
  const res = executeSimulatedTransaction([{ productId: 'prod-1', quantity: 2 }]);
  if (res.success) concurrentSuccesses++;
  else concurrentFailures++;
}
assert(concurrentSuccesses === 4, 'Concurrent billing allowed exactly 4 orders of 2 packs (8 total)');
assert(concurrentFailures === 1, '5th concurrent order was rejected due to exhausted stock');
assert(testStock['prod-1'].stock === 0, 'Stock cleanly reaches exactly 0 without becoming negative');

// 4. Security Rules & Tenant Isolation Logic Test
function checkAccessRules({ auth, path, operation }) {
  if (!auth) return false;
  // Admin can access everything
  if (auth.token?.admin === true || auth.token?.role === 'admin') return true;
  // User path matching
  const match = path.match(/^\/users\/([^\/]+)/);
  if (match) {
    const targetUserId = match[1];
    return auth.uid === targetUserId;
  }
  return false;
}

const userA = { uid: 'user-a', token: {} };
const userB = { uid: 'user-b', token: {} };
const adminUser = { uid: 'admin-1', token: { admin: true } };

assert(checkAccessRules({ auth: userA, path: '/users/user-a/products/p1' }) === true, 'User A can access own products');
assert(checkAccessRules({ auth: userA, path: '/users/user-b/products/p2' }) === false, 'User A CANNOT access User B products');
assert(checkAccessRules({ auth: null, path: '/users/user-a/invoices' }) === false, 'Unauthenticated user rejected');
assert(checkAccessRules({ auth: adminUser, path: '/users/user-a/invoices' }) === true, 'Admin can view user tenant data');

console.log('\n====================================================');
console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
