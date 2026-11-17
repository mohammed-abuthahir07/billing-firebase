# Implementation and Testing Report

Date: 16 November 2026  
Project: React billing website in this repository  
Firebase project expected by both apps: `billing-firebase-1b0e4`  
Checkpoint before these changes: commit `cb0ed89` (`Record the website functionality gap analysis before Flutter parity work.`)  
Flutter application code, Firebase configuration, security rules, indexes, and Cloud Functions were not modified.

## Section 1 – Implementation Summary

The React site now follows the Flutter billing flow for the features that can be implemented in the browser without changing the backend. Invoice creation, wrong-entry reversal, and complete deletion each run in one Firestore transaction. Historical totals read `sales_records` first and then add active invoices whose IDs are not already present. A permission denial on `sales_records` or `deleted_invoices` fails that write closed, or, for a read, falls back to active invoices and shows a notice.

### Features implemented

- Password reset uses Firebase `sendPasswordResetEmail`. The old screen no longer pretends a six-digit OTP succeeded. Settings has an “Email me a password reset link” action for the signed-in business user. New business profiles store `country: India`.
- Product create and update require a name, GST from 0 to 100, a selling price above zero, a package weight above zero, and a stock quantity that is an integer of zero or more. New SKUs use `PROD-` plus a number from 10000 to 99999. Delete errors show the service message.
- Invoice creation reads the company profile, the products, and the dashboard counters in one transaction. GST is added on top of the selling price. Stock is reduced only when the available quantity is enough. The same payload is written to `invoices` and `sales_records` with the same document ID and `status: Paid`. Seller name, email, and GST come from `profile/company`. An empty customer email stays empty. Phone is optional. The preview stays open, and the PDF is not downloaded automatically. The transaction error, including an insufficient-stock message, is shown.
- Invoice history no longer stops at 100 documents. The default list uses a count plus cursor pages. Search still loads that signed-in user’s invoices and filters them in the browser, because Firestore has no substring query.
- Wrong-entry reversal restores stock, floors dashboard counters at zero, deletes the active invoice, and deletes the matching sales record. It does not write `deleted_invoices`. A confirmation dialog is required, and the button stays disabled while the transaction runs.
- Complete delete copies the invoice to `users/{userId}/deleted_invoices/{invoiceId}` with `deletedAt` and `deletionType: Completely Delete`, keeps or copies the sales record, and deletes only the active invoice. Stock and dashboard counters are not reversed.
- Business route `/deleted-invoices` lists archives with search, month, year, detail, PDF download, and share. It does not backfill archives.
- Admin route `/admin/deleted-invoices` is read-only and supports search, company, month, year, detail, and PDF download. It does not backfill and does not write another company’s data.
- Admin logout calls Firebase `signOut` through the existing admin auth context.
- User analytics, monthly, yearly, and lifetime reports, admin dashboard totals, company revenue, admin invoice KPIs, and admin analytics use the sales-record merge. Company revenue prefers `stats/dashboard` when `totalRevenue` is greater than zero, matching Flutter. Admin invoice revenue does the same. GST and the active invoice count still come from active invoices.
- Invoice PDFs use the stored company name, a Base64 logo when one is present, seller and customer details, phone, one GST amount, and the grand total on A4. There is no invented CGST/SGST split. Report PDFs use the same merge. Share uses the browser Web Share API when it can share a file, and otherwise downloads the PDF.

### Existing features preserved

Registration, login, logout, route protection, and the separate admin and business sessions remain. Product list, search, filter, and pagination remain. Invoice preview, download, and print remain. Report filters and the existing page layouts remain. Admin company, product, and invoice browsers stay read-only. Collection names, document paths, and field names were not renamed. The website still does not call the `createInvoice` Cloud Function.

### New pages and routes

| Route | Purpose |
|---|---|
| `/deleted-invoices` | Business user’s own deleted-invoice archive |
| `/admin/deleted-invoices` | Read-only admin audit of deleted invoices |

Both links were added to the existing sidebars.

### Files created

- `frontend/src/utils/salesMerge.js`
- `frontend/src/utils/salesHistory.js`
- `frontend/src/utils/pdfShare.js`
- `frontend/src/services/deletedInvoiceService.js`
- `frontend/src/pages/DeletedInvoices/DeletedInvoices.jsx`
- `frontend/src/admin/services/adminDeletedInvoiceService.js`
- `frontend/src/admin/pages/DeletedInvoices/AdminDeletedInvoices.jsx`
- `IMPLEMENTATION_AND_TESTING_REPORT.md`

### Files modified

- `frontend/src/App.jsx`
- `frontend/src/components/Sidebar/Sidebar.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/ForgotPassword/ForgotPassword.jsx`
- `frontend/src/pages/Products/Products.jsx`
- `frontend/src/pages/Bills/Bill.jsx`
- `frontend/src/pages/Analytics/Analytics.jsx`
- `frontend/src/pages/Reports/Reports.jsx`
- `frontend/src/pages/Settings/Settings.jsx`
- `frontend/src/services/billService.js`
- `frontend/src/services/forgotPasswordService.js`
- `frontend/src/services/reportService.js`
- `frontend/src/services/settingsService.js`
- `frontend/src/services/userAnalyticsService.js`
- `frontend/src/utils/invoicePdfGenerator.js`
- `frontend/src/utils/reportPdfGenerator.js`
- `frontend/src/admin/components/AdminSidebar.jsx`
- `frontend/src/admin/pages/AdminDashboard/AdminDashboard.jsx`
- `frontend/src/admin/pages/CompanyDetails/CompanyDetails.jsx`
- `frontend/src/admin/pages/Invoices/AdminInvoices.jsx`
- `frontend/src/admin/pages/Analytics/Analytics.jsx`
- `frontend/src/admin/services/adminAnalyticsService.js`
- `frontend/src/admin/services/adminCompanyService.js`
- `frontend/src/admin/services/adminDashboardService.js`
- `frontend/src/admin/services/adminInvoiceService.js`

## Section 2 – Firebase Compatibility

### Collections used

The website reads and writes only these existing paths:

```text
admins/{adminId}
users/{userId}
users/{userId}/profile/company
users/{userId}/stats/dashboard
users/{userId}/products/{productId}
users/{userId}/invoices/{invoiceId}
users/{userId}/sales_records/{invoiceId}
users/{userId}/deleted_invoices/{invoiceId}
```

`payment_modes` is still unused. `platform_stats/overview` is still not written by the website.

### Fields preserved

Invoice money fields remain decimal strings. Dashboard counters remain numbers. Invoice numbers stay `INV-` plus the epoch milliseconds. Status is `Paid`. Seller fields are copied from the company profile (`companyName`, `alternateEmail`, `gstNumber`). Customer email and phone are stored trimmed and may be empty. Both the camelCase and snake_case aliases used by Flutter are written on the invoice payload. The same map is used for the sales record. A complete-delete archive keeps the original invoice fields and adds `deletedAt` and `deletionType: Completely Delete`.

### Invoice and sales-record behavior

Create writes the invoice and the sales record with the same ID inside one transaction. If the sales-record write is denied, the invoice, stock change, and counter change roll back. Analytics and reports insert every sales record, then add an active invoice only when that ID is absent. A completely deleted invoice remains in history through its sales record. A wrong-entry reversal deletes both documents, so it drops out of the totals. The same invoice is not counted twice.

### Archive behavior

Complete delete is a transaction: read the invoice, write the archive, make sure the sales record exists, then delete the active invoice. Wrong-entry reversal does not archive. Opening either deleted-invoice page only reads. There is no automatic backfill.

### Security-rule blockers

The rules file in this repository, `firebase/firestore.rules`, allows the owner and an admin to use `profile`, `products`, `invoices`, and `stats`. It has no match for `sales_records` or `deleted_invoices`. In Firestore, a parent `match /users/{userId}` write rule does not grant those subcollections. The Flutter project’s own rules file does allow the owner to read and write both collections and allows an admin to read them.

This work did not deploy or edit either rules file. Which file is actually deployed on `billing-firebase-1b0e4` was not verified. If the rules in this repository are the ones deployed, invoice creation, wrong-entry reversal, and complete deletion will fail with a permission error and leave the previous documents unchanged. Reads of `sales_records` will fall back to active invoices and the screen will say that completely deleted invoices may be missing. Deleted-invoice pages will show the permission error.

### Unverified Firebase dependencies

No authenticated session, emulator, or safe test account was used. These behaviors are implemented in code and have not been observed against the live project:

- Registration, login, logout, and password-reset email delivery.
- Product writes and the “used on an invoice” delete guard.
- Invoice creation, stock reduction, sales-record creation, and dashboard counter updates.
- Wrong-entry reversal and complete deletion.
- Deleted-invoice reads.
- Admin reads across companies.
- Whether the deployed invoice index serves the year-and-month report query.

## Section 3 – Testing Results

Environment: Windows, Node.js v24.19.0, Vite 8.1.5, production preview at `http://127.0.0.1:4173/`. No Firebase emulator was running. No test account was signed in. Production business data was not read or written.

| Test | Result | Details |
|---|---|---|
| Business authentication | BLOCKED | Reset, registration country, and error copy were changed in code. Login, logout, invalid login, reset email delivery, and route guards were not exercised against Firebase Auth. |
| Admin authentication | BLOCKED | Admin logout now calls Firebase sign-out in code. Admin login, logout, and session separation were not exercised in a browser session. |
| Product management | BLOCKED | Validation and the real delete error are in the product form. Create, update, search, filter, pagination, and the used-product delete guard were not run against Firestore. |
| Invoice creation | BLOCKED | The transaction matches the Flutter write path in code. It was not executed against Firestore, so stock, the invoice document, the sales record, and counters were not observed. |
| Stock management | BLOCKED | The stock check and decrement are inside the invoice transaction. Concurrent sessions were not tested. |
| Wrong-entry reversal | BLOCKED | Implemented as a transaction with a confirmation dialog. Stock restore, counter reversal, and deletion of both documents were not observed. |
| Complete deletion | BLOCKED | Implemented as a transaction. Archive creation, sales-record retention, and unchanged stock were not observed. |
| Deleted invoice monitoring | BLOCKED | Both pages are read-only and do not backfill. Listing, search, filters, detail, and PDF were not loaded from Firestore. |
| Analytics | BLOCKED | User and admin analytics call the sales-record merge. Totals were not compared with Flutter on shared data. |
| Reports | BLOCKED | Monthly, yearly, and lifetime reports use the merge. PDF contents were not generated from live data. |
| PDF download and print | BLOCKED | The generator includes company name, optional logo, GST, and grand total. Download and print were not clicked in a browser. A direct Node call of the generator failed because the jsPDF default export is not a constructor under raw Node, so no generation time was recorded. |
| PDF sharing | BLOCKED | Share uses `navigator.canShare({ files })` and otherwise downloads the file. No browser share sheet was opened. |
| Admin portal | BLOCKED | Dashboard, company, invoice, analytics, and deleted-invoice code paths are read-only for business data. They were not loaded with an admin session. |
| Cross-platform synchronization | BLOCKED | Flutter was not run. None of the five scenarios (Flutter to React, React to Flutter, complete delete, wrong-entry reversal, concurrent stock updates) were executed. |
| Production build | PASS | `npm run build` in `frontend` completed twice. The latest run transformed 2675 modules and finished in 1.00 seconds. An earlier run of the same command finished in 1.87 seconds. |
| Performance checks | BLOCKED | Build size and localhost asset fetches were measured and are listed in Section 4. Dashboard, product, invoice, analytics, report, admin, and PDF timings need a signed-in session and were not measured. |

A local Node check of `mergeRecords` passed. Sales records `a` and `b` plus invoices `a` and `c` produced `a, b, c`, so the sales record keeps the shared ID and the extra invoice is added. `floorMoney(-3)` is 0, and a `grand_total` string of `12.50` parses as 12.5.

`frontend/package.json` has no unit, integration, or type-check script. `npm run lint` was not treated as a pass/fail gate. A full ESLint run on this app reports a large set of existing `react-hooks/set-state-in-effect` and unused-symbol findings, including data-load effects that were already in the project. The production build does not run ESLint, and it succeeded after these changes.

Public preview checks that did run:

- `GET http://127.0.0.1:4173/` returned HTTP 200 and 672 bytes.
- The Firebase vendor chunk and the invoice page chunk returned HTTP 200.

Those responses only prove the built files are served. They do not prove a signed-in workflow.

## Section 4 – Performance Results

Tools: Vite 8.1.5 production build, then `vite preview` on this machine at `127.0.0.1:4173`. Timings used `Invoke-WebRequest` against that preview. No Lighthouse run and no signed-in browser trace were taken. Do not treat the millisecond figures as field performance on a phone network.

| Measurement | Result |
|---|---|
| Production build | 1.00 s on the latest run (1.87 s on the earlier run) |
| `dist/index.html` | 0.67 kB, gzip 0.38 kB. Local fetch: 672 bytes in 196 ms |
| App entry `index-*.js` | 25.85 kB, gzip 6.53 kB. Local fetch of the earlier hash: 25,855 bytes in 56 ms |
| `vendor-firebase-*.js` | 2,033.59 kB, gzip 609.44 kB. Local fetch: 2,033,592 bytes in 1,085 ms. This chunk already existed and was not introduced by this work. Vite warns that it is over 800 kB |
| Invoice page chunk | 32.09 kB, gzip 9.26 kB. Local fetch of the earlier hash: 32,092 bytes in 27 ms |
| Reports page chunk | 51.85 kB, gzip 11.94 kB |
| Business deleted-invoice chunk | 6.81 kB, gzip 2.29 kB |
| Admin deleted-invoice chunk | 6.11 kB, gzip 2.09 kB |
| Dashboard, products, invoice history, analytics, admin dashboard | Not measured. Each requires Firebase authentication |
| PDF generation | Not measured. The generator did not run under raw Node |

Invoice history pages one cursor page plus a count query. Search is the path that reads all of one user’s invoices. Admin analytics still walks every company, which matches the previous admin screens and is the expensive read. It was not changed to skip companies, because the totals have to stay complete.

## Section 5 – Remaining Issues

- Live Firebase behavior is unverified. No safe test account or emulator was available, and production data was not used.
- If `firebase/firestore.rules` in this repository is what is deployed, `sales_records` and `deleted_invoices` are denied. The new transactions are written to fail closed. The Flutter rules file allows those paths. The deployed rules need to be confirmed before invoice creation can be called working. Rules were not edited.
- Password-reset delivery, print, and the Web Share API were not exercised in a browser.
- The five cross-platform scenarios were not run. The React site alone cannot prove that Flutter shows the same stock and totals.
- Full-project ESLint is still red because of existing hook and unused-symbol findings. Those rules were not disabled.
- Invoice search loads one user’s invoices into memory. Default browsing does not.
- Admin analytics still reads every company. That is required for the platform totals and was not reduced.
- The year-and-month invoice query still depends on the existing index. That index was not proven against the deployed project.
- `Verify OTP` and `Reset password` routes still exist. A six-digit code is rejected. The reset email is the supported path.

## Section 6 – Final Conclusion

The React website now contains the Flutter business flows that were missing: sales records on invoice create, both delete modes, deleted-invoice pages, sales-record-aware analytics and reports, real password-reset email, stricter product validation, and admin sign-out. The production build succeeds.

That is not the same as proving the two apps stay in sync. Invoice creation, stock, both delete modes, analytics, reports, PDFs, admin data, and every cross-platform scenario are blocked until they are run with a safe account against the deployed rules. If those rules are the copy in this repository, the new sales-record and archive writes will be denied and will roll back. Until a signed-in test shows the invoice, the sales record, the stock change, and the same totals in Flutter, the React site should not be described as functionally equivalent to the Flutter application.

## Dark Mode and Light Mode Testing

The website theme is stored in the browser. It does not write to Firestore, and it does not change Firebase rules, indexes, collections, or the Flutter app. Invoice PDFs are still drawn by jsPDF with the same print colors.

### Business theme implementation

Settings has an Appearance tab with Light Mode, Dark Mode, and System Default. The choice is saved as `billing_business_theme`. Logging out does not clear it. The next visit restores it. System Default listens to `prefers-color-scheme` and updates when the operating system theme changes.

The active theme is applied on the document with `data-theme="light"` or `data-theme="dark"`. Pages, cards, tables, inputs, drawers, the delete dialog, and chart axes use those variables. The navy sidebar and navbar stay part of the brand in both modes. The on-screen invoice sheet and the PDF capture container stay white so the document still looks like the printed invoice.

The Bills delete dialog no longer uses the tall invoice sheet. It is a compact dialog with a short explanation for Wrong Entry and Completely Delete. The invoice search field is a single bordered input, so the label no longer sits on top of the placeholder.

### Admin theme implementation

Admin Settings has an Appearance tab with the same three options. The choice is saved as `billing_admin_theme`. An older `admin_theme` value is still read once if the new key is empty, then new choices are written only to `billing_admin_theme`. Admin pages use the same document theme while an `/admin` route is open.

### Theme persistence results

The preference functions write and read the two keys separately. A production build completed in 1.31 seconds after these files were added. On a local preview, setting `billing_business_theme` to dark and reloading the login page kept `data-theme="dark"`. A signed-in click-through of logout and login was not run from this session, because this browser does not have the business or admin session.

A styled preview of the bills card and delete dialog was checked in both themes. In dark mode the card background computed to `rgb(30, 41, 59)` and the text to `rgb(248, 250, 252)`. In light mode the card computed to white. The delete dialog was about 325px tall, with the two choices and a Cancel button, instead of the old full-height invoice sheet.

### System Default results

The listener is registered in both theme providers. It was not switched from the operating system during this session, so the live system-change path is implemented and not observed.

### Independent preference results

Business and admin preferences are different localStorage keys. `ThemeRoot` applies the business theme on business routes and the admin theme on `/admin` routes. Changing one key does not write the other. Navigating between the portals in one signed-in browser was not exercised here.

### Pages covered by the theme rules

Business: Dashboard, Products and the product form, Bills, the invoice drawer, invoice preview, Analytics, Reports, Profile, Settings, Deleted Invoices, sidebar, navbar, tables, toasts, and dialogs.

Admin: Dashboard, Companies, Company Details, Invoices, Products, Analytics, Deleted Invoices, Settings, sidebar, and navbar.

Chart grid and axis colors follow the active theme on both analytics pages. Marketing pages keep their own layout.

### Remaining theme-related issues

- Signed-in desktop, tablet, and mobile passes of every page were not completed in this session. Refresh the site and walk Settings, then each page, in Light, Dark, and System Default.
- A few older components still set their own white backgrounds. The dark rules override the shared cards, tables, inputs, and dialogs. Any control that still looks light should be named so it can be added to the theme list.
- The invoice preview stays on a white sheet on purpose. The surrounding overlay follows the theme.
