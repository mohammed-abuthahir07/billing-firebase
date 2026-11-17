# Complete Performance Report

Date: 17 November 2026  
Tooling: Vite 8.1.5 production build, Lighthouse 12, headless Chrome.  
No signed-in session, so dashboard, analytics, invoice history, and admin timings were not measured in the browser.

## How to read these numbers

Two Lighthouse runs exist. The production-preview run is the one that matches a production build. The dev-server run is recorded so it is not mistaken for production.

INP was not measured. Lighthouse’s lab run does not include an interaction trace. `max-potential-fid` is not INP.

## Production build

Command: `npm run build` in `frontend`.  
Result: PASS, 1.01 seconds, 2688 modules, exit 0.

Largest JavaScript chunks:

| File | Minified | Gzip |
|---|---:|---:|
| `vendor-firebase-HnqgGT02.js` | 2,074.61 kB | 620.41 kB |
| `Reports-D1lTeKeO.js` | 51.81 kB | 11.92 kB |
| `Bill-DJU7AdG9.js` | 32.49 kB | 9.42 kB |
| `index-CP6xboA1.js` | 27.81 kB | 7.13 kB |
| `LandingPage-C7qrVvUL.js` | 26.74 kB | 7.87 kB |
| `Settings-DivXS-te.js` | 21.57 kB | 5.05 kB |
| `Dashboard-CTrY-Jsg.js` | 15.05 kB | 4.67 kB |

Shared CSS `index-D1uTwJFU.css` is 35.47 kB (7.35 kB gzip). Route CSS files are all under 40 kB minified. The Bills stylesheet is the largest CSS chunk at 39.22 kB.

Routes are already `React.lazy` split. The Firebase SDK is still one vendor chunk on the initial load. It was not split in this audit, because there is no before-and-after measurement of a split, and moving Firebase imports can change auth startup.

## Lighthouse — production preview (the result that counts)

URL: `http://localhost:4173/login`  
Server: `vite preview` of the production `dist`  
Form factor: mobile  
Throttling: simulated  
Fetched: 17 November 2026, during this audit

| Metric | Result | Target | Against target |
|---|---:|---:|---|
| Performance score | 0.70 | none set | recorded |
| First Contentful Paint | 4.7 s | ≤ 1.8 s | Miss |
| Largest Contentful Paint | 5.0 s | ≤ 2.5 s | Miss |
| Total Blocking Time | 60 ms | ≤ 200 ms | Met |
| Cumulative Layout Shift | 0 | ≤ 0.1 | Met |
| Speed Index | 4.7 s | none set | recorded |
| Time to Interactive | 6.2 s | none set | recorded |
| Interaction to Next Paint | NOT TESTED | ≤ 200 ms | No interaction trace |
| Max potential FID | 110 ms | not the INP target | recorded only |
| Network requests | 18 | none set | recorded |
| Transfer size | 809 KiB | none set | recorded |

This is one lab run of the login page on localhost. It is not field data and not a signed-in dashboard.

## Lighthouse — Vite dev server (not production)

URL: `http://localhost:5173/login`  
This server sends unbundled modules. The numbers are much worse and must not be quoted as production performance.

| Metric | Result |
|---|---:|
| Performance score | 0.55 |
| First Contentful Paint | 42.5 s |
| Largest Contentful Paint | 83.7 s |
| Total Blocking Time | 40 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 42.5 s |
| Requests | 57 |
| Main-thread bootup | 0.4 s |

CLS and TBT stayed fine. Paint time did not. The request count shows why: the dev server is not the production bundle.

## React runtime measurements that were not taken

| Measurement | Status |
|---|---|
| Dashboard load time | NOT TESTED |
| Analytics load time | NOT TESTED |
| Invoice history load time | NOT TESTED |
| Route transition time while signed in | NOT TESTED |
| Memory heap | NOT TESTED |
| React re-render counts | NOT TESTED |

## Code-level costs (inspection, not timings)

These were read from source. They are not millisecond measurements.

- `getDashboard` reads `stats/dashboard`, every product, and the latest 10 invoices. The dashboard page also calls `getUserAnalytics()`, which reads the current year’s merged sales. That second read exists so the invoice-count pie can be drawn. It was not removed.
- Admin dashboard, companies, invoices, products, analytics, and deleted invoices each list users and then read nested collections per user.
- Invoice search loads that user’s invoices and filters in the browser. The default list is paginated.
- No `onSnapshot` listeners were found, so realtime listener leaks of that type are not present.
- `html2canvas`, `html2pdf.js`, `multer`, `axios`, and `file-saver` are in `package.json`. A source search did not find imports of them in `frontend/src`. They are not in the measured route chunks above. They were left installed. Removing them was not measured.

## Flutter performance

NOT TESTED. No Flutter project is in this workspace. Cold start, frame times, memory, and app size were not measured. Flutter DevTools was not opened.

## Before and after

| Change | Before | After | What was remeasured |
|---|---|---|---|
| Functions `tsc` | Failed on missing `vitest` types in `formatters.test.ts` | `tsc` exit 0 | Compile only. The unit test was not run. |
| Frontend production build | Previous successful builds were about 0.8–1.6 s | 1.01 s, exit 0 | Build time and chunk sizes. Not a user-perceived timing. |
| Login Lighthouse | No earlier login Lighthouse file in the repo | Preview: LCP 5.0 s, FCP 4.7 s, CLS 0, TBT 60 ms | One run. No second run after a bundle change, because the Firebase chunk was not split. |

No optimization in this audit has a before-and-after user timing. The LCP miss is recorded, not claimed as fixed.

## What would be required to improve the login LCP

The 620 kB gzip Firebase chunk and the Google font request are the obvious weight on first paint. A safe next step is to measure a production preview again after deferring Firebase until a route needs it, or after self-hosting the font. That change was not made here, so no improved LCP is claimed.
