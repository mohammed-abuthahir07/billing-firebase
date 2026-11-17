# Complete Bug Fix Report

Date: 17 November 2026  
Only defects that were confirmed in the current source were changed. Invoice totals, GST, stock rules, Firestore field names, security rules, and Cloud Function deploys were not changed.

## 1. Dashboard dates showed an invalid date for Firestore timestamps

- Severity: Medium
- Status: Fixed in source. Screen not reopened.
- Root cause: The billing table formatted `created_at` with `new Date(value)`. A Firestore Timestamp is an object. `new Date` of that object is Invalid Date. The chart on the same page already used `billDate`, which understands `toDate()` and `seconds`.
- Files: `frontend/src/pages/Dashboard/Dashboard.jsx`
- Fix: `fmtDate` now calls `billDate` and prints the local `en-IN` date, or an em dash when the value is empty or invalid.
- Verification: The same branching rules were run in Node. A value with `toDate()` and a value with `seconds: 1762992000` both became `2025-11-13T00:00:00.000Z`. A plain object returned null. A date string `2026-11-13` parsed. The dashboard table itself was not rendered in a browser. Status of the on-screen cell: NOT TESTED.

## 2. Load failures hid the Firebase error

- Severity: Low
- Status: Fixed in source. Not triggered against Firebase.
- Root cause: Dashboard, Products, and Reports read `err.response.data.message`. The Firebase SDK puts the text on `err.message` and does not set `response`. Users saw only the generic fallback, including when a permission error had a specific message.
- Files: `frontend/src/pages/Dashboard/Dashboard.jsx`, `frontend/src/pages/Products/Products.jsx`, `frontend/src/pages/Reports/Reports.jsx`
- Fix: Use `err.message`, then the existing fallback sentence.
- Verification: Production build succeeded. The failure path was not forced in a browser. NOT TESTED against a live permission error.

## 3. Admin Analytics forced light colors and a circular border token

- Severity: Medium for dark mode
- Status: Fixed in CSS. Not viewed signed in.
- Root cause: `.analytics-container` set `--text-primary` and `--text-secondary` to light-theme hex, set `--border-color: var(--border-color)` (a cycle, so the border token becomes invalid), and set the page background to `#f8fafc`.
- Files: `frontend/src/admin/pages/Analytics/Analytics.css`
- Fix: Stop overriding text and border tokens. Point `--card-bg` at `--bg-card`. Page background is transparent so the admin shell shows through.
- Verification: Production build succeeded. Dark mode click-through: NOT TESTED.

## 4. Admin Analytics grid CSS leaked onto other pages

- Severity: Medium
- Status: Fixed in CSS. Not viewed after navigation.
- Root cause: `.stats-grid`, `.stat-card`, and `.chart-card` were global. The business dashboard uses those names. Once the admin analytics chunk loaded, its rules could win for the rest of the session.
- Files: `frontend/src/admin/pages/Analytics/Analytics.css`
- Fix: Those selectors, including the icon, tooltip, and the 1200 px and 768 px breakpoints, are prefixed with `.analytics-container`.
- Verification: The stylesheet was read back and the media queries are prefixed. A signed-in before/after layout was NOT TESTED.

## 5. Recharts surfaces could collapse

- Severity: Medium on analytics charts
- Status: Fixed in CSS. Charts not opened.
- Root cause: `frontend/src/index.css` sets `svg { max-width: 100% }`. Recharts measures its SVG. The business and admin dashboards already cancel that with `.recharts-surface { max-width: none }`. User Analytics and Admin Analytics did not.
- Files: `frontend/src/pages/Analytics/Analytics.css`, `frontend/src/admin/pages/Analytics/Analytics.css`
- Fix: The same `max-width: none` rule was added on those pages.
- Verification: Build succeeded. Chart render: NOT TESTED.

## 6. Cloud Functions build failed on a test import

- Severity: Low (build), the test itself was already unwired
- Status: Compile fixed. Test not run.
- Root cause: `tsconfig.json` included all of `src`. `src/utils/formatters.test.ts` imports `vitest`, which is not a dependency. `tsc` exited 2.
- Files: `firebase/functions/tsconfig.json`
- Fix: Exclude `src/**/*.test.ts` from the functions compile.
- Verification: `npm run build` in `firebase/functions` exited 0. Vitest was not installed, so the test file status is NOT TESTED.

## Regression after these fixes

| Check | Status |
|---|---|
| `npm run build` in `frontend` | PASS, 1.01 s, exit 0 |
| `tsc` in `firebase/functions` | PASS, exit 0 |
| Public pages at 13 widths | PASS for document overflow, 65 checks, no page scrollbar |
| Login Lighthouse on production preview | Measured. LCP 5.0 s and FCP 4.7 s miss the stated targets. CLS 0 and TBT 60 ms meet them. |
| Signed-in invoice, stock, analytics, admin | NOT TESTED |
| Flutter | NOT TESTED |

## Remaining issues (not fixed)

| Issue | Severity | Why it was left |
|---|---|---|
| Repository rules omit `sales_records` and `deleted_invoices` | High if those rules are deployed | Rules changes need approval. Deployed rules were not read. |
| Any signed-in user can write `admins/{their uid}` and `platform_stats` in the repo rules | High if those rules are deployed | Not exploited. Needs an approved rules change. |
| Hardcoded admin email and password in `adminAuthService.js`, plus auth logs | High | Behavior change needs an explicit decision. The secret is not copied here. |
| Stock email callable has no SMTP settings and is not deployed | Medium | Cannot send mail from the client. Deploy needs approval. |
| Company Details still has global `.stats-grid` and `.stat-card` | Medium | Same class of leak as item 4. Not restyled in this pass. |
| Login LCP 5.0 s on a throttled mobile lab run | Medium | No bundle split was measured, so none was shipped. |
| Admin loaders scan every company | Medium at higher user counts | Query redesign was not timed and was not approved as a behavior change. |
| Flutter app missing from the workspace | Blocks mobile QA | Nothing to run. |
| No concurrency evidence | Blocks the 1,000-user claim | Production was not load-tested. Emulators were not started. |

## Files modified for this audit

- `frontend/src/pages/Dashboard/Dashboard.jsx`
- `frontend/src/pages/Products/Products.jsx`
- `frontend/src/pages/Reports/Reports.jsx`
- `frontend/src/pages/Analytics/Analytics.css`
- `frontend/src/admin/pages/Analytics/Analytics.css`
- `firebase/functions/tsconfig.json`

Reports-page font work from the previous request also remains in `frontend/src/pages/Reports/Reports.css` and `frontend/src/pages/Analytics/Analytics.css`. Stock-email client and function source from the previous request remains undeployed.
