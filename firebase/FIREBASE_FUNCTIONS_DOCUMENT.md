# Firebase Cloud Functions Documentation

This document describes all callable and background Cloud Functions implemented in `firebase/functions`.

---

## 1. Cloud Function List

| Function Name | Type | Auth Required | Description |
|---|---|---|---|
| `createInvoice` | `onCall` (v2) | User Auth | Validates items, runs Firestore transaction, checks stock, computes GST, snapshots items, decrements inventory, and increments stats atomically. |
| `deleteProduct` | `onCall` (v2) | User Auth | Deletes a product variant only after confirming it is not referenced by any historical invoices. |
| `getMonthlyReportSummary` | `onCall` (v2) | User Auth | Aggregates monthly revenues, GST, and product performance for the specified user, month, and year. |
| `getAdminDashboard` | `onCall` (v2) | Admin Role | Returns platform-wide statistics (users, products, invoices, revenue). |
| `getAdminCompanies` | `onCall` (v2) | Admin Role | Lists all registered businesses along with catalog count, invoice count, and revenue metrics. |
| `getAdminCompanyDetails`| `onCall` (v2) | Admin Role | Returns company details, stats, and the 10 most recent invoices for the company. |
| `getAdminAnalytics` | `onCall` (v2) | Admin Role | Returns year-to-date monthly series for users, revenue, invoices, or products. |
| `setAdminClaim` | `onCall` (v2) | Admin or Secret Key | Assigns the `{ admin: true, role: 'admin' }` custom claim to a Firebase Auth user. |

---

## 2. Callable Signatures & Payloads

### `createInvoice`
**Input Data:**
```typescript
{
  sellerName?: string;
  sellerEmail?: string;
  sellerGST?: string;
  customerName: string;
  customerEmail: string;
  customerGST?: string;
  customerAddress: string;
  products: Array<{ productId: string; quantity: number }>;
}
```

**Response Data:**
```typescript
{
  success: true,
  message: "Invoice created successfully.",
  invoice: {
    id: string;
    invoice_number: string;
    subtotal: string;
    gst_amount: string;
    grand_total: string;
    items: Array<any>;
    created_at: string;
    // ...
  },
  items: Array<any>;
}
```

### `deleteProduct`
**Input Data:**
```typescript
{
  productId: string;
}
```

**Response Data:**
```typescript
{
  success: true,
  message: "Product variant deleted successfully."
}
```
If referenced in any invoice:
Throws `HttpsError("failed-precondition", "This variant is used in existing invoices and cannot be deleted.")`.
