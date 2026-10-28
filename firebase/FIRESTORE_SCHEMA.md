# Cloud Firestore Database Schema

This document details the complete Firestore document structure, field specifications, data types, indexes, and access rules for the Firebase billing application.

---

## 1. Hierarchy Overview

```text
users/{userId}
  ├── profile/company
  ├── products/{productId}
  ├── invoices/{invoiceId}
  └── stats/dashboard

platform_stats/overview
admins/{adminId}
```

---

## 2. Collections and Documents

### 2.1 `users/{userId}`
Represents an individual business account.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Business owner's display name |
| `email` | `string` | Yes | Unique email address |
| `createdAt` | `timestamp` / `ISO string` | Yes | Registration timestamp |
| `updatedAt` | `timestamp` / `ISO string` | Yes | Last profile update |

### 2.2 `users/{userId}/profile/company`
Contains merchant / tax details for invoice generation and branding.

| Field | Type | Description |
|---|---|---|
| `companyName` | `string` | Registered business trade name |
| `mobile` | `string` | Primary contact number |
| `alternateEmail` | `string` | Billing / notification email |
| `gstNumber` | `string` | Business GSTIN |
| `address` | `string` | Street address |
| `city` | `string` | City |
| `state` | `string` | State |
| `country` | `string` | Country |
| `pincode` | `string` | Postal code |
| `website` | `string` | Merchant website |
| `profileImage` | `string` | Download URL from Firebase Storage |
| `updatedAt` | `timestamp` | Server timestamp of last edit |

### 2.3 `users/{userId}/products/{productId}`
Packed product inventory variants.

| Field | Type | Description |
|---|---|---|
| `itemName` | `string` | Base product name (e.g., "idli podi") |
| `category` | `string` | Product category |
| `sku` | `string` | SKU code |
| `description` | `string` | Variant packaging details |
| `packageWeight` | `number` | Weight of packed unit (e.g., 250) |
| `weightUnit` | `string` | Unit of weight (e.g., "g", "kg") |
| `sellingPrice` | `number` | Price per pack in rupees |
| `gst` | `number` | Applicable GST percentage (e.g., 2.0) |
| `quantity` | `number` | Integer inventory of packs in stock |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

### 2.4 `users/{userId}/invoices/{invoiceId}`
Immutable finalized customer invoices.

| Field | Type | Description |
|---|---|---|
| `invoiceNumber` | `string` | Human-readable ID (e.g. `INV-1787659641138`) |
| `seller_name` | `string` | Seller business name snapshot |
| `seller_email` | `string` | Seller email snapshot |
| `seller_gst` | `string` | Seller GSTIN snapshot |
| `customer_name` | `string` | Customer name |
| `customer_email` | `string` | Customer email |
| `customer_gst` | `string` | Optional customer GSTIN |
| `customer_address` | `string` | Delivery/billing address |
| `subtotal` | `string` | Sum of item prices before GST |
| `gst_amount` | `string` | Total GST amount |
| `grand_total` | `string` | Final invoice total |
| `items` | `array<object>` | Immutable array of line item snapshots |
| `year` | `number` | Calendar year (e.g., 2026) |
| `month` | `number` | Calendar month (1–12) |
| `created_at` | `string` | ISO timestamp |
| `timestamp` | `timestamp` | Server timestamp for ordering |

### 2.5 `users/{userId}/stats/dashboard`
Atomic counters updated via Cloud Function transactions.

| Field | Type | Description |
|---|---|---|
| `totalRevenue` | `number` | Lifetime cumulative revenue |
| `totalBills` | `number` | Total number of invoices issued |
| `todaySales` | `number` | Sales on the current day |
| `monthlySales` | `number` | Sales in current month |
| `yearlySales` | `number` | Sales in current calendar year |
| `updatedAt` | `timestamp` | Last increment timestamp |

### 2.6 `platform_stats/overview`
Platform-wide administration metrics.

| Field | Type | Description |
|---|---|---|
| `totalUsers` | `number` | Total registered businesses |
| `totalProducts` | `number` | Total catalog products |
| `totalInvoices` | `number` | All-time platform invoice count |
| `totalRevenue` | `number` | All-time platform gross revenue |
| `monthlyRevenue` | `number` | Current month platform revenue |
| `updatedAt` | `timestamp` | Last update timestamp |

---

## 3. Security Rules
- Full tenant isolation: `match /users/{userId}/{document=**} { allow read, write: if request.auth.uid == userId; }`
- Invoice immutability: Invoices cannot be modified or deleted directly by clients; they are created atomically via the `createInvoice` Cloud Function.
- Admin platform stats: Access is strictly protected by `request.auth.token.admin == true`.
