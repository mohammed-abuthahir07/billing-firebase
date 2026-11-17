# Complete Application Final Audit Report

Date: 17 November 2026  
Workspace: `billing-firebase`  
Firebase project named in the client config: `billing-firebase-1b0e4`  
This report separates code inspection from tests that were actually executed.

## Executive summary

The React business portal and React admin portal build and the Cloud Functions TypeScript project compiles. Public pages (marketing home, business login, register, forgot password, and admin login) loaded in headless Chrome at all 13 requested viewport sizes without a page-level horizontal scrollbar.

Signed-in business and admin workflows were not executed. No Firebase emulator was running. No production data was written. The Flutter application is not in this workspace, so it was not tested. No concurrent-user load test was run, so this audit does not show that the application can serve 10, 100, 250, 500, or 1,000 simultaneous users.

A small set of verified defects was fixed: dashboard dates that ignore Firestore timestamps, load errors that hide the Firebase message, admin Analytics forcing a light theme and leaking grid CSS, chart SVGs squeezed by a global rule, and the Functions build failing because a test file imported Vitest. Production `npm run build` passed after those edits.

## Architecture overview

### React business portal

Vite 8.1.5 and React 19. Routes are lazy-loaded in `frontend/src/App.jsx`. State is local React state plus `AuthContext` and `ThemeContext`. There is no Redux. Data access is the Firebase JS SDK in `frontend/src/services` and `frontend/src/admin/services`. Invoice creation, wrong-entry reversal, and complete deletion are Firestore transactions in `billService.js`. Money on invoices stays decimal strings. Dashboard counters stay numbers. GST is added on top of the selling price. Those calculations were not changed in this audit.

### React admin portal

Separate admin routes under `/admin`, with `AdminAuthContext`. Admin screens read across `users/{uid}` and nested products, invoices, and deleted invoices. Several admin loaders loop every user and then every nested collection. That is an N+1 read pattern. It was not changed, because changing it would alter query behavior and needs a measured plan plus approval before any rules or index deploy.

### Flutter

No `pubspec.yaml` and no Dart sources were found in this repository or under `Documents`. Flutter could not be inspected or run from this workspace.

### Firebase

Auth, Firestore, Storage rules, and Cloud Functions source live under `firebase/`. `firebase.json` defines Auth, Firestore, Functions, and Storage emulators. Those emulators were not started. Functions export invoice, product, report, and admin callables, plus `sendOutOfStockEmail`. The stock-email function is not deployed from this machine, and SMTP settings were not present, so no stock email was sent.

### What was not trusted from older documents

Older reports correctly marked authenticated Firebase behavior as blocked. This audit re-read the current source. The rules file still has no `sales_records` or `deleted_invoices` match. The stock-email callable exists in source only.

## Functional testing results

Environment: Windows, Node.js v24.19.0, Vite dev server `http://localhost:5173`, production preview `http://localhost:4173`. No signed-in session. No emulator.

| Area | Status | Evidence |
|---|---|---|
| Production frontend build | PASS | `npm run build` in `frontend` finished in 1.01s, 2688 modules, exit 0, after the fixes below. |
| Cloud Functions compile | PASS | `npm run build` (`tsc`) in `firebase/functions` exited 0 after test files were excluded from the compile. |
| Dashboard date parsing logic | PASS | The same timestamp rules were executed in Node. A Timestamp-shaped value and a `{seconds}` value became valid dates. A plain object became null. The dashboard screen was not opened. |
| Unauthenticated route guard | PASS | Opening `/reports` in the Cursor browser redirected to `/login`. |
| Public page load and overflow | PASS | 65 headless Chrome checks, listed in the responsive report. Document `scrollWidth` never exceeded `clientWidth`. |
| Login Lighthouse on the production preview | PASS as a measurement, FAIL against the LCP and FCP targets | Mobile simulated throttling. Score 0.70. LCP 5.0s. FCP 4.7s. CLS 0. TBT 60ms. Details are in the performance report. |
| Registration, login, logout, password reset delivery | BLOCKED | No test account was used. Reset code calls `sendPasswordResetEmail`. Delivery was not observed. |
| Products, invoices, stock, PDFs, share, analytics, reports, profile, settings | BLOCKED | These require a signed-in Firebase session. Pages were not opened with data. |
| Dark and light theme on signed-in pages | NOT TESTED | Styles were inspected. No signed-in theme click-through was done. |
| Admin dashboard, companies, invoices, products, deleted invoices, settings | BLOCKED | No admin session. |
| Flutter, every feature | NOT TESTED | Application source is not in this workspace. |
| Concurrent users 10 through 1,000 | NOT TESTED | No load tool was pointed at production, and the emulator was not started. |
| Invoice math, stock, and cross-platform data | NOT TESTED | Not executed against Firestore. |

`/verify-otp` still exists. `verifyOTP` throws and tells the user to use the email link. It does not pretend a code succeeded. That path was not clicked.

## Bug findings

### Fixed in this audit

1. Dashboard billing dates called `new Date` on a Firestore Timestamp object, which is an invalid date. The table now uses the existing `billDate` helper (`toDate`, `seconds`, or a date string).
2. Dashboard, Products, and Reports showed a generic failure when Firebase threw, because they read `err.response` (an Axios shape). They now surface `err.message`.
3. Admin Analytics redefined `--text-primary` and `--border-color` on itself, including a circular `--border-color: var(--border-color)`, and painted the page `#f8fafc`. Dark mode could not restyle that page. Local text and border overrides were removed. Cards use `--bg-card`.
4. Admin Analytics `.stats-grid`, `.stat-card`, and `.chart-card` were global. After that route loaded, those rules could restyle the business dashboard. They are now under `.analytics-container`.
5. A global `svg { max-width: 100% }` rule can collapse Recharts. User Analytics and Admin Analytics now set `.recharts-surface { max-width: none }`, matching the business and admin dashboards.
6. `firebase/functions` `tsc` failed because `formatters.test.ts` imports Vitest, which is not installed. Test files are excluded from the functions compile. The test was not executed.

### Remaining, not changed

1. `firebase/firestore.rules` does not match `sales_records` or `deleted_invoices`. If this file is what is deployed, invoice create, reversal, and complete delete fail closed. Rules were not edited or deployed. Deployed rules were not read from the cloud.
2. The same rules allow any signed-in user to write `platform_stats` and to write `admins/{their uid}` when the document id equals their uid. `isAdmin()` then becomes true if that admin document exists. This is a privilege-escalation risk in the repository rules. It was not changed, because rules changes need approval, and it was not exploited.
3. `frontend/src/admin/services/adminAuthService.js` contains a hardcoded default admin email and password and logs the admin sign-in email. The password is not repeated in this report. It was not removed in this pass because changing admin bootstrap behavior needs an explicit decision.
4. `sendOutOfStockEmail` cannot deliver mail until SMTP environment values exist and the function is deployed. The client calls it and ignores failure. No email was received during this audit.
5. Company Details still publishes global `.stats-grid` and `.stat-card` rules. The same leak fixed on Admin Analytics remains on that page.
6. Admin dashboard and a few chips still use fixed light hex colors. Signed-in dark mode was not visually confirmed.
7. Dashboard also calls `getUserAnalytics()` on every load, which reads the year’s merged sales on top of the dashboard query. Admin loaders read every user, then every product and invoice collection. Invoice search reads every invoice for that user. These are scalability risks, not silently rewritten.
8. The Firebase vendor chunk is 2,074.61 kB minified (620.41 kB gzip). It loads with the app shell.

## Security findings

Client route guards exist for business and admin routes. An unsigned browser hit on `/reports` was redirected to `/login`. That is not access control. Firestore rules are the real boundary, and the repository rules have the gaps above.

No `dangerouslySetInnerHTML` usage was found in `frontend/src`. No new secrets were printed. Dependency `npm audit` was not re-run in this pass. A previous functions install reported vulnerabilities in that package tree; they were not patched here.

One business user cannot be shown, from a live test, to be blocked from another company’s documents. That check is BLOCKED.

## Database findings

Collections used by the website remain `users`, `profile/company`, `stats/dashboard`, `products`, `invoices`, `sales_records`, and `deleted_invoices`. Schema and field names were not changed. Invoice writes still use one transaction for stock, invoice, sales record, and counters. Concurrent stock behavior was not executed.

Pagination exists for the default invoice list. Search, admin company scans, and analytics year loads are unbounded reads. Listener usage: no `onSnapshot` calls were found under `frontend/src`, so there is no snapshot listener to leak. Dashboard stock alerts run in an effect and can retry on the next load if the email callable fails. They do not mark the product notified until the callable succeeds.

## Cross-platform consistency

NOT TESTED. Flutter source is absent. React and Flutter were not pointed at the same invoice.

## Final application health assessment

The frontend production build is healthy. Public screens do not create a horizontal page scroll at the sizes that were measured. The production login page misses the LCP and FCP targets under mobile Lighthouse throttling and meets CLS and TBT.

The application is not production-proven for 1,000 users. Authenticated billing, admin operations, security-rule enforcement, email delivery, Flutter, and concurrency were not tested. Rules and the hardcoded admin bootstrap secret should be reviewed before a production launch. Do not treat this document as evidence of 1,000-user capacity.
