# Website Functionality Gap Report

**Date:** 16 November 2026  
**Method:** Source inspection only. The React website under this repository and `C:\Development\billing_app\PROJECT_FUNCTIONAL_DOCUMENTATION.md` were read. No Firebase console reads, no live writes, no rule or index deploys, and no application source changes were made for this report.  
**Status meaning:** **Completed** means the website source implements the same user-visible behavior with real Firebase calls. It was not executed against the live project in this pass. **Partial** means part of the behavior is present and a material part is absent or incorrect. **Missing** means the website has no implementation. **Needs Verification** means the code exists and its runtime result depends on deployed indexes or a live session that was not tested.

Flutter feature names below are taken from that document. Features the Flutter document marks as not implemented (email verification, phone login, social login, account deletion, product images, push notifications, CGST/SGST split, invoice editing, invoice restore, multi-staff companies) are not treated as website gaps.

---

## 1. Existing React website architecture

The running website is a Vite + React 19 single-page app in `frontend/`. Firebase is called from the browser. There is no repository layer and no Redux store.

```text
frontend/src/
  main.jsx                         AuthProvider, AdminAuthProvider, AdminUIProvider
  App.jsx                          React Router routes
  firebase/firebase.js             Auth, Firestore, Storage init (project billing-firebase-1b0e4)
  context/AuthContext.jsx          Business session
  services/                        User Firestore and Auth calls
  pages/                           Business screens
  components/                      Layout, Navbar, Sidebar, route guards, Auth modal
  utils/                           Invoice PDF, report PDF, product label helpers
  admin/
    context/                       Admin session and mobile drawer
    services/                      Cross-company reads and admin Auth
    pages/                         Admin screens
    layouts, routes, components
firebase/
  firestore.rules                  Rules file shipped with this repo
  firestore.indexes.json           Composite indexes declared in this repo
  functions/src/                   Cloud Functions source. The React client does not call it
```

**State.** Business login lives in `AuthContext`. Admin login lives in `AdminAuthContext`. Page data is local `useState` loaded by service functions. Both contexts listen to the same `onAuthStateChanged` stream.

**Navigation.** Signed-in business users get a left sidebar: Dashboard, Products, Bills, Analytics, Reports, Profile, Settings, Logout. Admins get a separate shell: Dashboard, User Details, Analytics, Invoice Management, Product Overview, Settings, Logout. There is no Deleted Invoices item on either menu.

**Backend call style.** User and admin services use the Firebase JS SDK (`getDoc`, `getDocs`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `runTransaction`, Auth methods). `frontend/src/services/api.js` and `adminApi.js` are empty stubs. No `httpsCallable` usage was found under `frontend/src`.

**Cloud Functions in this repo.** `firebase/functions/src/billing/createInvoice.ts` and admin/report/product functions exist. The website invoice screen calls `billService.createBill`, which runs a client transaction. The function is not on the website’s create path. That function also writes `platform_stats/overview`, which the Flutter app does not use, and it does not write `sales_records`.

**Unused duplicate config.** `frontend/firebase/firebase.js` initializes a second Firebase app and Analytics. Application imports use `frontend/src/firebase/firebase.js`.

**PDF.** Invoice PDFs are built with jsPDF (`invoicePdfGenerator.js`). Report PDFs are built with jsPDF (`reportPdfGenerator.js`). Print uses `react-to-print` on the invoice preview. There is no system share action.

**Storage SDK.** `getStorage` is initialized. Profile images are written as Base64 JPEG data URLs on `profile/company.profileImage`. No `uploadBytes` call was found.

---

## 2. Existing website pages and functionalities

### Routes

| Path | Screen | Access in source |
|---|---|---|
| `/` | Landing page | Guest. A business session is sent to `/dashboard` |
| `/login` | Business login | Public |
| `/register` | Business registration | Public |
| `/forgot-password` | Sends a Firebase reset email | Public |
| `/verify-otp` | 6-digit code screen | Public |
| `/reset-password` | New-password form | Public |
| `/dashboard` | Business dashboard | Signed-in business user |
| `/products` | Product catalog | Signed-in business user |
| `/bills` | Invoice list, create drawer, preview | Signed-in business user |
| `/analytics` | Current-year charts | Signed-in business user |
| `/reports` | Month view and PDF downloads | Signed-in business user |
| `/profile` | Company profile and logo | Signed-in business user |
| `/settings` | Display name, password, static app info | Signed-in business user |
| `/admin/login` | Admin login | Public |
| `/admin/dashboard` | Platform totals | Admin session |
| `/admin/companies` | Company directory | Admin session |
| `/admin/companies/:id` | Company KPIs and recent invoices | Admin session |
| `/admin/invoices` | Cross-company invoice browser | Admin session |
| `/admin/products` | Cross-company product browser | Admin session |
| `/admin/analytics` | Platform charts | Admin session |
| `/admin/settings` | Admin name and password | Admin session |

There is no `/bills/create`, `/bills/:id`, `/deleted-invoices`, or `/admin/deleted-invoices` route. Create and preview are overlays on `/bills`.

Guests who open a business route are sent to `/login`. Guests who open `/admin/...` are sent to `/admin/login`. The Flutter app sends guests to `/` instead of `/login`.

### What the source actually does

**Landing.** Static marketing page. No Firebase.

**Registration.** `createUserWithEmailAndPassword`, then `users/{uid}` (`name`, `email`, `role: user`, ISO `createdAt`, `updatedAt`), `users/{uid}/profile/company` (`companyName`, `alternateEmail`, `updatedAt`), and `users/{uid}/stats/dashboard` with zero counters. `admin@gmail.com` is rejected. Country is not set to `India`.

**Login.** Email and password. `admin@gmail.com` is rejected before Auth. If `admins/{uid}` exists after sign-in, the client signs out and returns an admin-portal error. Auth errors for bad credentials and too many attempts are mapped to short messages.

**Logout (business).** `signOut`, clears local user state, redirects to `/login`.

**Forgot password.** `sendPasswordResetEmail` runs. The next two screens do not complete a reset: `verifyOTP` always returns success, and `resetPassword` calls `confirmPasswordReset` only when the code string is longer than 10 characters. The verify screen collects 6 digits, so the in-app form can show success and return to login without changing the password. The real reset is the link inside the Firebase email.

**Dashboard.** Reads `stats/dashboard`, all `products`, and the latest 10 `invoices`. KPIs use the stored counters. Low stock is `quantity <= 10`. Top customers are computed from those 10 invoices, top 3. Retry exists. The service also computes best-selling products from those 10 invoices.

**Products.** Full product read, search by name or SKU, category chips from loaded products, 10-row pagination. Create and update write the Flutter field names (`itemName`, `category`, `sku`, `description`, `gst`, `packageWeight`, `weightUnit`, `sellingPrice`, `quantity`, timestamps). Blank SKU becomes `PROD-` plus a random number from 0 to 99999. Delete scans `invoices` for `productId` or `product_id` and blocks the delete with a thrown error. The page catch reads `err.response`, so that thrown message is replaced by “Failed to delete product.” Numeric validation is weaker than Flutter: GST, price, and weight are not range-checked in script before the write.

**Bills.** List loads at most 100 invoices ordered by `created_at` descending, then paginates in the browser. Create runs a client transaction that reads the company profile, each product, and `stats/dashboard`, checks stock, recalculates GST on top of `sellingPrice`, reduces `quantity`, writes `invoices/{autoId}`, and increments the five dashboard counters. Preview and print exist. Download calls jsPDF. There is no delete action, no share action, and no phone field. The form collects invoice date and due date and does not send them. Empty customer email is stored as `customer@example.com`. Seller name and email sent into the transaction are the Auth user name and email, so `companyName` is used only when that name is empty. `status` is not written. `sales_records` is not written. Create errors are read from `err.response`, so a thrown stock error becomes “Failed to create bill.” After a successful create the preview opens, a PDF downloads, and the preview closes.

**Analytics.** Current calendar year only, from `invoices` where `year` equals the current year. Month and year revenue, invoice counts, monthly bar charts, best customer cards, and a yearly customer ranking are rendered. `sales_records` is not read.

**Reports.** Month and year filters, search, on-screen month summary, and three downloads: monthly, yearly, and lifetime. Queries use `invoices` only. Lifetime PDF includes an inventory snapshot from `products` (low stock 1–10, out of stock at 0 or below). There are no share buttons.

**Profile.** Reads and merge-writes `users/{uid}` and `profile/company`, including mobile, GSTIN, address, city, state, country, PIN, website, and alternate email. Logo upload rejects non-images and files over 5 MB, resizes to a 256 px JPEG data URL, and stores `profileImage`. Auth display name is updated with the profile name.

**Settings.** Tabs for display name (`users.name` and Auth), password change with reauthentication, and static app-info strings (version `2.1.0`, Vite, Firestore project id). There is no “send password reset email” button.

**Admin login.** Email and password, then custom claims, `admins/{uid}`, an `admins` email query that copies a doc onto the UID, and a reserved-email bootstrap that can create the Auth user and `admins/{uid}` when sign-in fails and the built-in password matches. The password value is not repeated here. Failure signs the user out.

**Admin logout.** The sidebar clears `admin_token` and `admin_user` and navigates to `/admin/login`. It does not call `signOut`. `AdminAuthContext.logout` does call `signOut`, and the sidebar does not use it.

**Admin dashboard.** Counts every `users` document, every `products` subcollection, and every `invoices` subcollection. Revenue is the sum of `grand_total` on active invoices. Current-month revenue filters `year` and `month` on those invoices. The charts are proportional bars of those totals, not a 12-month series. `sales_records` and `stats/dashboard` are not read.

**Companies.** One row per user. Name prefers `profile/company.companyName`, then `users.name`. Counts and revenue come from `products` and `invoices`. Search is in the page. Detail shows an “Active account” badge, four KPIs, and the latest 10 invoices. Rows are not clickable and do not show line items.

**Admin invoices.** Read-only. Search, company dropdown, date range, newest/oldest sort, pagination, and a detail modal with lines and totals. KPIs sum the loaded active invoices. Missing `status` is displayed as Paid.

**Admin products.** Read-only. Search, company, category, and stock chips. Low stock is quantity 1–5. Out of stock is 0 or below. Detail modal shows product fields and company name.

**Admin analytics.** Current-year charts for registrations (`users.createdAt`), revenue, invoice counts, and products added. Revenue and invoice counts come from `invoices` only.

**Admin settings.** Email read-only. Display name updates Auth and also writes `name` on `admins/{uid}`. Password change reauthenticates, then calls `updatePassword`. A reset-email helper exists in the service.

---

## 3. Flutter application documented functionalities

Source of this section: `PROJECT_FUNCTIONAL_DOCUMENTATION.md` for the root Flutter app (Billing SaaS / package `ZayithBill`). The document was produced by reading Dart sources. It did not list a live database.

A business user can register and sign in with email and password, reset a password by Firebase email, maintain a company profile and a Base64 logo, and maintain products with stock, GST, pack weight, and price. Creating an invoice reduces stock, writes the same payload to `invoices` and `sales_records`, and increments dashboard counters. A wrong-entry delete reverses stock and counters and removes both copies. A complete delete archives the invoice in `deleted_invoices`, keeps `sales_records`, and leaves stock and counters unchanged. The user can view a dashboard, current-year analytics, and monthly, yearly, and lifetime reports, and can download, share, or print invoice and report PDFs.

An admin can sign in through a separate login, see platform totals, browse companies, invoices, and products, inspect completely deleted invoices, and change the admin display name and password. Admin screens do not edit another company’s products, invoices, or profile.

Documented Firestore paths:

- `admins/{adminId}`
- `users/{userId}`
- `users/{userId}/profile/company`
- `users/{userId}/stats/dashboard`
- `users/{userId}/products/{productId}`
- `users/{userId}/invoices/{invoiceId}`
- `users/{userId}/sales_records/{invoiceId}`
- `users/{userId}/deleted_invoices/{invoiceId}`
- `users/{userId}/payment_modes/{documentId}` is named in Flutter rules only. No Dart code reads or writes it.

The Flutter app does not call Cloud Functions. Invoice money fields are strings with two decimals. Stats counters are numbers and are running totals, not calendar buckets. GST is added on top of `sellingPrice`. Status is always `Paid`. Invoice number is `INV-` plus epoch milliseconds.

---

## 4. Complete App vs Website comparison

| No. | Feature | Flutter App | React Website | Status | Required Work |
|---|---|---|---|---|---|
| 1 | Marketing landing | Static page at `/`. Signed-in users leave it | Static page at `/`. A business session is sent to `/dashboard` | Completed | None for parity |
| 2 | Business registration | Auth user plus `users`, `profile/company`, and zeroed `stats/dashboard`. Reserved admin email blocked. Country set to India | Same three documents and the same email block. Country is not written | Completed | Write `country: India` on the initial profile if empty-profile parity is required |
| 3 | Business login | Email/password. Reserved admin email blocked. Existing `admins/{uid}` signs the user out | Same checks and the same rejection messages | Completed | None |
| 4 | Business logout | `signOut`, then `/` | `signOut`, then `/login` | Completed | Optional redirect alignment |
| 5 | Password reset | `sendPasswordResetEmail` only. The user finishes in the email link | The email is sent. `/verify-otp` accepts any 6 digits. `/reset-password` reports success without `confirmPasswordReset` for a 6-digit code | Partial | Keep the Firebase email. Stop treating the in-app OTP form as a successful reset |
| 6 | Route guards | Guests go to `/` or `/admin/login`. Admin and business sessions are kept apart | Guests go to `/login` or `/admin/login`. Admin email is excluded from the business user object | Completed | Confirm the two auth listeners with one live session |
| 7 | Company profile | Name, company, GSTIN, phone, alternate email, website, address, city, state, PIN. Country kept if already stored | Same fields, and country is an editable input. Writes `users` and `profile/company` | Completed | None |
| 8 | Company logo | Gallery image, 5 MB limit, Base64 JPEG data URL on `profileImage`. Max width 400 | File input, 5 MB limit, Base64 JPEG on `profileImage`. Longest side 256 | Completed | Use the stored data URL on the invoice PDF |
| 9 | Product list, search, category filter | Full read, in-memory search and chips, stock badges | Full read, search, chips, 10-row pages. Quantity shows Low or Out | Completed | None |
| 10 | Product create | Required name, GST 0–100, price > 0, weight > 0, stock ≥ 0. SKU `PROD-` plus 10000–99999 | Writes the same fields. Script does not enforce those ranges. SKU random range is 0–99999 | Partial | Match the Flutter validators before write |
| 11 | Product update | Updates the same fields and `updatedAt`. Does not rewrite `createdAt` | Same write shape | Partial | Same validators as create |
| 12 | Product delete | Refuses when an active invoice line references the id, and shows that sentence | The same invoice scan and `deleteDoc` exist. The page replaces the thrown sentence with a generic failure | Partial | Show `err.message` from the service |
| 13 | GST invoice creation | Transaction writes `invoices` and `sales_records`, `status: Paid`, seller snapshot from the company profile, optional phone, empty email | Transaction writes `invoices` only. No `status`. Seller name is the user display name. Empty email becomes `customer@example.com`. Phone, invoice date, and due date are not stored. Stock errors are not shown | Partial | Match the Flutter invoice map and the twin `sales_records` write. Surface thrown errors. Leave the preview open |
| 14 | Automatic stock reduction | Same transaction subtracts line quantity and sets `updatedAt` | Same transaction subtracts `quantity` and sets `updatedAt` | Completed | Keep this inside the create transaction when `sales_records` is added |
| 15 | Invoice history | All `invoices` ordered by `created_at`, with view, download, and delete | At most 100 invoices, then pages of 10. View and download only | Partial | Load the full history. Add the two delete choices |
| 16 | Invoice preview | Seller, buyer, lines, GST, grand total, Paid badge. Refresh of the URL cannot reload the invoice | Modal preview with the same blocks. Create closes it after download. Phone is displayed when the field already exists | Partial | Keep the preview after create. Preview can stay in memory, matching Flutter |
| 17 | Invoice PDF download | A4 tax invoice, business name, Base64 logo, GST column, no CGST/SGST split | jsPDF A4 tax invoice, header text “Billing SaaS”, no logo image | Partial | Draw `profileImage` and the company name. Keep one GST column |
| 18 | Invoice PDF share | System share sheet from the preview | No share action | Missing | Add a browser share or download handoff for the same PDF bytes |
| 19 | Invoice print | Print layout from the preview | `react-to-print` on the preview | Completed | None |
| 20 | Wrong-entry reversal | Transaction restores stock, floors the four money counters and `totalBills`, deletes `invoices` and `sales_records`. No archive | No delete control and no reversal transaction | Missing | Add the Flutter transaction before any other delete mode |
| 21 | Complete delete | Writes `deleted_invoices` with `deletedAt` and `deletionType: Completely Delete`, ensures `sales_records`, deletes only `invoices`. Stock and stats stay | No archive write and no delete | Missing | Add this path only after `sales_records` exists for new invoices |
| 22 | User deleted-invoice monitoring | `/deleted-invoices` with search, month, year, detail, and PDF. Opening the screen can backfill archives | No route, menu item, or service | Missing | Add a read screen. Decide whether the website should perform the Flutter backfill write |
| 23 | Dashboard statistics | Stored counters, stock sum, up to four low-stock rows, 10 recent bills, top 3 customers from those bills | Stored counters, all low-stock rows, 10 recent bills, top 3 customers from those bills | Completed | Optional: cap low stock at 4 |
| 24 | Sales records | Second copy of each invoice. Analytics, reports, and admin fallbacks prefer it so a complete delete still counts | No read and no write anywhere in `frontend/src` | Missing | Write the twin document on create. Merge it into analytics, reports, and admin totals |
| 25 | User analytics | Current year. Merge `sales_records`, then add `invoices` whose ids are absent. Charts and customer rank | Current year from `invoices` only. Charts and customer rank exist | Partial | Use the Flutter merge before summing |
| 26 | Monthly report on screen | Month and year filters, search, revenue, count, average, GST, best product, invoice list. Data is the sales merge | Same screen structure from `invoices` where `year` and `month` match | Partial | Merge `sales_records`. Confirm the composite query (row 44) |
| 27 | Yearly report PDF | Annual PDF for the selected year, from the sales merge | Download exists, from `invoices` for that year | Partial | Merge `sales_records` before the PDF |
| 28 | Lifetime report PDF | Lifetime totals, year breakdown, inventory snapshot | Download exists, from all `invoices`, plus a product inventory snapshot | Partial | Merge `sales_records`. Inventory thresholds already match |
| 29 | Report PDF share | Share actions for monthly, yearly, and lifetime PDFs | Download buttons only | Missing | Add share for the three PDFs, or document download as the web equivalent after approval |
| 30 | Admin login | Claims, `admins/{uid}`, email query, reserved-email bootstrap | Same order of checks and the same bootstrap shape | Completed | Leave credentials and bootstrap behavior unchanged until a later approved phase |
| 31 | Admin logout | `signOut` | Sidebar clears local admin keys and does not call `signOut` | Partial | Call the existing `AdminAuthContext.logout` |
| 32 | Admin dashboard | Companies, products, invoices, sales, current-month share. Monthly series from merged sales | Companies, products, invoices, sales, current-month share, from active invoices only. Bars compare those totals | Partial | Include `sales_records` in the totals. Add a monthly series only if visual parity is required |
| 33 | Company directory | Search, product count, invoice count, revenue. Prefers `stats/dashboard` when `totalRevenue > 0`, otherwise merged sales | Search and the same counts. Revenue is the sum of active invoices | Partial | Follow the Flutter preference, including `sales_records` when stats are zero |
| 34 | Company details | KPIs, invoice list, line-item sheet, static Active badge | KPIs, latest 10 invoices, static Active badge. No line-item sheet | Partial | Open a read-only invoice detail from a row |
| 35 | Admin invoice browser | Search, company, newest/oldest, detail modal. Sales KPI uses stats with a sales-record fallback. GST from active invoices. Read-only | Search, company, date range, sort, detail modal, PDF payload on the row. KPIs sum active invoices. Read-only | Partial | Keep it read-only. Align the sales KPI with stats and `sales_records` |
| 36 | Admin product browser | Search, stock chips at ≤5 / 0, read-only detail. Company and category lists are loaded and not shown as filters | Search, company, category, and the same stock chips. Read-only detail | Completed | None |
| 37 | Admin analytics | Current-year revenue, invoices, registrations, and products from merged sales and timestamps | The four charts exist. Revenue and invoices come from `invoices` only | Partial | Merge `sales_records` into revenue and invoice series |
| 38 | Admin deleted-invoice audit | `/admin/deleted-invoices` with search, company, month, year, detail, and PDF | No route, menu item, or service | Missing | Add a read-only audit after the archive collection is in use |
| 39 | Admin settings | Display name on Auth only. Password change reauthenticates | Display name on Auth and `admins/{uid}.name`. Password change reauthenticates | Completed | The extra `admins.name` write is compatible. Flutter does not read it for access |
| 40 | User display name | Settings updates Auth and `users.name` | Same | Completed | None |
| 41 | User password while signed in | `updatePassword` with no current password, plus a reset email button | Current password, reauthentication, then `updatePassword`. No reset-email button | Partial | Add the reset-email action. Keep reauthentication |
| 42 | Settings app info | Static strings, including a Flutter version label | Static strings for the website version and stack | Completed | None. Do not copy the Flutter “Android / 2FA” labels |
| 43 | Invoice payment status | Always stored as `Paid`. Badges do not read the field | Field is not stored. The table defaults to paid and contains unused pending and unpaid styles | Partial | Write `status: Paid` on create. Do not add a pending workflow |
| 44 | Monthly invoice query index | Flutter `firestore.indexes.json` is empty. Monthly reads filter `year` and `month` | Website monthly reads use the same two filters. This repo’s index file lists `year + month + created_at`, which may not serve a filter-only query | Needs Verification | Run the monthly report against the live project before changing indexes |

---

## 5. Missing functionalities

These exist in the Flutter documentation and have no website implementation:

1. Invoice PDF share.
2. Wrong-entry reversal, including stock and dashboard-counter rollback and deletion of `sales_records`.
3. Complete delete with a `deleted_invoices` archive while sales history stays.
4. User deleted-invoice list, filters, detail, and PDF.
5. Any use of `sales_records`.
6. Report PDF share for monthly, yearly, and lifetime files.
7. Admin deleted-invoice audit.

`payment_modes` is not missing functionality. The Flutter document says no Dart code uses it. The website does not use it either.

---

## 6. Partially implemented functionalities

1. **Password reset.** The email send is real. The OTP and new-password screens are not a working reset.
2. **Product create and update.** Firestore fields match. Range checks do not.
3. **Product delete.** The invoice guard runs. The user does not see its message.
4. **GST invoice creation.** Stock, totals, invoice insert, and dashboard counters run in one transaction. The document is not the Flutter invoice: no twin sales record, no `status`, no phone, seller identity comes from the user profile name, and a blank email is replaced with `customer@example.com`.
5. **Invoice list and preview.** History is capped at 100. Preview exists and is closed immediately after create.
6. **Invoice PDF.** Download works. The logo stored on the company profile is not drawn.
7. **Analytics and all three report scopes.** Screens and PDFs exist and ignore `sales_records`, so a Flutter “Completely Delete” disappears from the website while it remains in Flutter reports.
8. **Admin logout.** Local admin keys are cleared. Firebase Auth can remain signed in.
9. **Admin dashboard, company directory, company details, admin invoices, and admin analytics.** The screens load live Firestore data and stay read-only. Totals follow active `invoices` only. Company detail has no line-item view. The admin dashboard has no monthly series.
10. **Signed-in password change.** The website change is stricter than Flutter because it reauthenticates. The settings reset-email action is absent.
11. **Payment status.** The website can display Paid, Pending, and Unpaid, and the writer never stores a status.

---

## 7. Firebase integration differences

Both clients target project `billing-firebase-1b0e4`.

| Area | Flutter document | React website source |
|---|---|---|
| Auth | Email/password, `authStateChanges`, password reset email, display name, password update | Same Auth APIs. Business password update reauthenticates. In-app reset does not |
| Firestore access | Direct client reads and writes. Two transactions: create bill, wrong entry | Direct client reads and writes. One transaction: create bill |
| Listeners | None | None found |
| Storage | SDK present, unused. Logo is a Firestore string | SDK initialized, unused. Logo is a Firestore string |
| Cloud Functions | None in the Flutter repo. The app does not call any | Source exists in this repo. The website client does not call it |
| `platform_stats/overview` | Not used | Written only by the unused `createInvoice` function. Admin UI recomputes from subcollections |
| Security rules file | Owner read/write on profile, stats, products, invoices, `sales_records`, `deleted_invoices`, `payment_modes`, and any other subcollection. Admin read-only on those paths. Any signed-in user may write `admins/{their uid}` | Owner or admin read/write on `users/{uid}`, profile, products, invoices, and stats. No match for `sales_records`, `deleted_invoices`, or `payment_modes`. `platform_stats` is readable and writable by any signed-in user. Admin is also true when the token email is `admin@gmail.com` |
| Indexes | Empty index list | Composite indexes for invoices `year + month + created_at`, invoices `created_at`, and products `quantity` |
| Which file is deployed | Not verified by the Flutter document | Not verified in this pass |

**Rules risk.** If the rules in this repository are the ones deployed, a Flutter or future website write to `sales_records` or `deleted_invoices` is denied, because those paths have no `allow` and everything else is denied by default. If the Flutter rules are the ones deployed, the current website reads and owner writes to `users`, `profile`, `products`, `invoices`, and `stats` are allowed, and an admin write into another company’s data is denied. The current admin UI does not make those writes. Admin display-name updates write `admins/{uid}`, which both rule files allow for that UID.

Do not deploy either rules file as part of closing these gaps until both clients’ paths are allowed and the live rules have been compared. That deploy was out of scope for this analysis.

---

## 8. Data structure compatibility findings

Shared and compatible when the website writes them:

| Path | Fields the website writes that Flutter also uses |
|---|---|
| `users/{uid}` | `name`, `email`, `role`, `createdAt` as an ISO string, `updatedAt` timestamp |
| `profile/company` | `companyName`, `alternateEmail`, `mobile`, `gstNumber`, `address`, `city`, `state`, `country`, `pincode`, `website`, `profileImage`, `updatedAt` |
| `stats/dashboard` | `totalRevenue`, `totalBills`, `monthlySales`, `yearlySales`, `todaySales`, `updatedAt` as running totals |
| `products/{id}` | `itemName`, `category`, `sku`, `description`, `gst`, `packageWeight`, `weightUnit`, `sellingPrice`, `quantity`, `createdAt`, `updatedAt` |
| `invoices/{id}` | `id`, `user_id`, `invoice_number`, `invoiceNumber`, seller fields, `customer_name`, `customer_email`, `customer_gst`, `customer_address`, string money fields, `items` with both camelCase and snake_case ids and names, `created_at`, `year`, `month`, `day`, `timestamp` |

Differences that will show up across the two apps:

| Topic | Effect |
|---|---|
| No `sales_records` from the website | Flutter analytics still sees the website invoice, because Flutter adds an invoice when that id is missing from `sales_records`. A later Flutter complete delete cannot keep a sales copy that was never written |
| No `status` | Flutter parsers tolerate a missing status. Website badges assume paid. Flutter always writes `Paid` |
| `customer_email` default `customer@example.com` | Flutter stores an empty email. Website invoices will show a fake address in Flutter previews and PDFs |
| No `customer_phone` | Flutter writes the field, often empty. Website preview already reads `customer_phone` if a Flutter invoice has it |
| Seller snapshot | Flutter copies `companyName`, `alternateEmail`, and `gstNumber`. The website sends the Auth display name and Auth email first, so the printed seller can differ from the company profile. The form can also override GST |
| Invoice date and due date | Collected on the website form and ignored. `created_at` is the current time. Flutter also uses the current time and does not store a due date |
| `country` | Flutter registration writes `India`. Website registration omits it. Later profile saves can write a country |
| Logo size | Both store `data:image/jpeg;base64,...`. A logo uploaded on the website is smaller. Flutter can still load it |
| Dashboard counters | Both increment all four money fields on every invoice and neither resets them at midnight or month end. Analytics and reports on both sides are supposed to sum documents by `year` and `month`. The website report side sums `invoices` only |
| Money types | Both store invoice amounts as decimal strings and stats as numbers. Readers on both sides coerce with `Number` |
| Product delete scope | Both scan active `invoices` only. A product that appears only on an archived invoice can be deleted |
| `deleted_invoices` | Flutter writes `deletedAt` and `deletionType: Completely Delete` plus the invoice map. The website never writes this collection |
| `payment_modes` | Unused by both clients |
| `platform_stats/overview` | Not part of the Flutter model. Unused by the website UI |
| Admin `name` | Website settings write it. Flutter admin access does not read it |

Website invoices created today remain readable by the Flutter app. Flutter complete-delete archives do not remain visible in website analytics, reports, or admin totals.

---

## 9. Potential risks and dependencies

1. **Rules and `sales_records`.** Implementing Flutter-compatible deletes depends on create writing `sales_records`. That write fails if the deployed rules are the file in this repository.
2. **Do not switch create to the Cloud Function.** `createInvoice` in this repo skips `sales_records`, skips `status`, and increments `platform_stats`. Calling it would move the website further from the Flutter document.
3. **One Auth user, two contexts.** Business context treats `admin@gmail.com` and any `admins/{uid}` user as logged out of the business portal. Admin context accepts that same user. The admin sidebar logout does not end the Auth session, so a following business page can still see the Firebase user.
4. **Error handling uses an old HTTP shape.** Product delete and invoice create throw `Error`. The pages read `err.response.data`, so the real Firestore or stock message is dropped.
5. **History cap.** `getBills` stops at 100 invoices. Older bills remain in Firestore and on the phone, and disappear from the website list.
6. **Fake reset success.** A user can believe the password changed. The Firebase email link is the only working reset.
7. **Running counters.** Copying Flutter means today, month, and year dashboard numbers keep accumulating. Report screens must keep using invoice dates, not those counters.
8. **Backfill side effect.** Flutter’s deleted-invoice screen writes archive documents for any sales record that has no active invoice. Copying that behavior onto the admin screen would write under other users’ ids. Flutter’s own rules make that admin write fail. Do not copy the backfill until rules and ownership are decided.
9. **Bootstrap admin password.** Both codebases can create the reserved admin when sign-in fails and a hardcoded password matches. This report does not repeat the password. Changing it is an Auth change and was not done.
10. **Index uncertainty.** Monthly report queries can fail in the browser if the live database has no composite index for `year` and `month`. This was not executed.
11. **Seller and email mismatches.** New website invoices will look different inside the Flutter PDF until seller snapshot and the empty-email behavior match.
12. **Shared project.** A website-only field rename, a collection rename, or a rules tighten would break the working Flutter app. None of those changes were made.

---

## 10. Recommended implementation order

Do this only after review. Each step should keep existing Flutter documents readable and should not deploy rules, indexes, or functions until that step explicitly needs a live check.

1. **Invoice write parity.** In the existing client transaction, write `status: Paid`, store a blank email when the field is empty, add an optional phone field, snapshot seller fields from `profile/company`, and write the same map to `sales_records/{sameId}`. Show `err.message`. Keep the preview open. Confirm against the deployed rules before relying on the new collection. If the write is denied, stop and report that. Do not edit the rules in the same step.
2. **Wrong-entry reversal.** Add the Flutter transaction: restore stock, floor the stats counters, delete `invoices` and `sales_records`, and do not write `deleted_invoices`.
3. **Complete delete and the user archive screen.** Archive first, keep `sales_records`, delete only the active invoice, then add `/deleted-invoices` with search, month, year, detail, and the existing invoice PDF.
4. **Read-path merge.** Teach analytics, monthly, yearly, and lifetime reports, the admin dashboard, company revenue, admin invoice sales KPI, and admin analytics to prefer `sales_records` and then fill gaps from `invoices`, matching the Flutter merge.
5. **PDF and share.** Put the company name and Base64 logo on the invoice PDF. Add share for invoice and report PDFs using the browser share sheet when it exists, and download otherwise.
6. **Password reset.** Leave `sendPasswordResetEmail` in place. Remove the success path that does not call `confirmPasswordReset`. Add the settings reset-email action.
7. **Admin session.** Point the admin sidebar logout at `signOut`. Add the admin deleted-invoice screen as read-only, without the cross-user backfill, unless rules are later changed on purpose.
8. **Smaller parity items.** Product range validation, product-delete error text, full invoice history, company-detail line items, registration `country: India`, and a live check of the monthly `year + month` query.
9. **Rules and indexes, as a separate approved change.** Compare the deployed rules with both source files. Allow owner writes for `sales_records` and `deleted_invoices` if they are missing. Keep admin access read-only on business data unless a later phase says otherwise. Add a composite index only if the monthly query fails.

---

## Summary

Counts are the 44 rows in section 4. Each row is one Flutter functionality that was compared with the website source.

| Result | Count |
|---|---|
| Total features identified in the Flutter documentation and compared | 44 |
| Already implemented on the website | 16 |
| Missing | 7 |
| Partially implemented | 20 |
| Requiring verification | 1 |

**Completed (16):** landing, registration, business login, business logout, route guards, company profile, logo storage, product list and filters, stock reduction on sale, invoice print, dashboard statistics, admin login, admin product browser, admin settings, user display name, settings app info.

**Missing (7):** invoice share, wrong-entry reversal, complete delete, user deleted-invoice monitoring, `sales_records`, report PDF share, admin deleted-invoice audit.

**Partial (20):** password reset, product create, product update, product delete messaging, GST invoice document, invoice history, invoice preview, invoice PDF download, user analytics, monthly report, yearly PDF, lifetime PDF, admin logout, admin dashboard, company directory, company details, admin invoices, admin analytics, signed-in user password settings, invoice status.

**Needs verification (1):** whether the monthly `year` and `month` invoice query succeeds with the indexes currently deployed.

The website already covers accounts, catalog, a real invoice transaction with stock deduction, dashboard counters, reports and analytics screens, PDF download, and a read-only admin console on the same Firebase project. It is not yet equivalent to the Flutter app, because invoice history, deletion, and cross-app reporting depend on `sales_records` and `deleted_invoices`, which the website never touches.

No Firebase configuration, security rules, indexes, collections, or application logic were changed while producing this report.
