# Comprehensive Security Guide

This document outlines the security architecture and validation guarantees implemented for the React Billing Firebase system.

---

## 1. Authentication & Role Separation

1. **User Authentication**:
   - Managed completely by Firebase Authentication.
   - User sessions are verified via cryptographically signed ID tokens.
   - All client queries use `request.auth.uid` inside Firestore Security Rules to guarantee complete tenant data isolation.

2. **Admin Authentication**:
   - Admins require custom claims: `{ admin: true, role: 'admin' }`.
   - Client-side claims are validated server-side by checking `request.auth.token.admin == true` in Firestore rules and in Cloud Functions before granting administrative read/write privileges.
   - Ordinary users cannot grant themselves custom claims. Claims can only be granted via Firebase Admin SDK or through the `setAdminClaim` function guarded by `ADMIN_BOOTSTRAP_SECRET`.

---

## 2. Firestore Security Rules

- **Isolated Tenant Data**:
  ```javascript
  match /users/{userId} {
    allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.admin == true);
    match /profile/{document=**} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.admin == true);
    }
    match /products/{productId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.admin == true);
    }
  }
  ```
- **Immutable Financial Invoices**:
  - Invoices cannot be modified or deleted directly by clients (`allow create, update, delete: if false;`).
  - Invoice creation is exclusively handled by the `createInvoice` Cloud Function running in an atomic Firestore transaction.

---

## 3. Storage Security Rules

- Images are stored under `/users/{userId}/*`.
- Only authenticated users can upload to their designated user directory.
- File size is restricted to $< 5\text{MB}$.
- Content type is verified using `request.resource.contentType.matches('image/.*')`.

---

## 4. Financial Calculation Integrity

1. **Server-Side Authoritative Pricing**:
   - The client only provides product IDs and requested quantities.
   - Unit prices, GST percentage rates, and line subtotals are pulled directly from the user's stored product variants inside the server transaction.
2. **Negative Stock Prevention**:
   - The transaction locks and checks that `currentQuantity >= requestedQuantity`. If insufficient, the transaction fails and aborts without altering stock or creating an invoice.
3. **Audit Logging & Pre-aggregations**:
   - All invoice metrics are logged and atomically increment tenant and platform overview documents.
