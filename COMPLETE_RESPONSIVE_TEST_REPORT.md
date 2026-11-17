# Complete Responsive Test Report

Date: 17 November 2026  
Browser: headless Google Chrome via Puppeteer, driven against the Vite dev server at `http://localhost:5173`.  
The CSS under test is the current source, including the font and analytics fixes from this session.

Signed-in business and admin pages were not opened. Requesting them without a session returns the login screen, so those routes were not scored as layout passes.

Flutter was not installed in this workspace. No emulator, simulator, or device was used. Portrait, landscape, text scaling, and keyboard coverage on mobile apps were NOT TESTED.

## Viewports

Every size below was applied to these public routes:

- `/` marketing home
- `/login`
- `/register`
- `/forgot-password`
- `/admin/login`

That is 5 pages × 13 sizes = 65 measurements. Each waited for network idle, then read `documentElement.scrollWidth` versus `clientWidth`, and listed up to five elements whose boxes crossed the viewport.

| Viewport | Category |
|---|---|
| 320 × 568 | Small mobile |
| 360 × 800 | Mobile |
| 375 × 812 | Mobile |
| 390 × 844 | Mobile |
| 430 × 932 | Large mobile |
| 600 × 960 | Small tablet |
| 768 × 1024 | Tablet |
| 1024 × 1366 | Large tablet |
| 1280 × 720 | Laptop |
| 1366 × 768 | Laptop |
| 1440 × 900 | Desktop |
| 1920 × 1080 | Large desktop |
| 2560 × 1440 | Ultra-wide |

## Business portal public pages

| Page | Sizes | Page horizontal overflow | Status |
|---|---|---|---|
| `/` | all 13 | 0 px on every size | PASS for page scroll |
| `/login` | all 13 | 0 px | PASS for page scroll |
| `/register` | all 13 | 0 px | PASS for page scroll |
| `/forgot-password` | all 13 | 0 px | PASS for page scroll |

No public page produced `scrollWidth - clientWidth` greater than 1 px. Buttons and form fields on login and register stayed inside the document width at 320 px.

Decorative pieces still extend past the viewport edge, and an ancestor clips them so the page does not scroll:

- Home: `hero-orb`, `hero-right`, `dashboard-card1` (about 5 px past the edge at 320 px), and `marquee-track` (the marquee is intentionally wider than the screen).
- Forgot password: `forgot-orb` circles sit partly outside the viewport at 320 and at 1920.

Those are clipped decorations, not a scrollbar. They were not redesigned in this pass. A visual screenshot of each size was not saved.

Signed-in pages (dashboard, products, bills, analytics, reports, profile, settings, deleted invoices), including tables, charts, invoice preview, and modals: NOT TESTED.

## Admin portal

| Page | Sizes | Page horizontal overflow | Status |
|---|---|---|---|
| `/admin/login` | all 13 | 0 px | PASS for page scroll |

`admin-orb` decorations cross the viewport edge and do not create document scroll.

Admin dashboard, companies, company details, invoices, products, deleted invoices, analytics, and settings: NOT TESTED. No admin session.

## Dark mode and light mode

| Surface | Light | Dark | Status |
|---|---|---|---|
| Public login, register, marketing, admin login | Rendered in their own branded styles during the 65 checks | Theme toggle was not used | NOT TESTED as a theme matrix |
| Signed-in business portal | Not opened | Not opened | NOT TESTED |
| Signed-in admin portal | Not opened | Not opened | NOT TESTED |

Admin Analytics CSS was changed so it no longer forces `#f8fafc` and no longer overrides `--text-primary`. That fix was compiled. It was not viewed in dark mode while signed in.

## Flutter

| Check | Status |
|---|---|
| Android emulator | NOT TESTED |
| iOS simulator | NOT TESTED |
| Physical device | NOT TESTED |
| Portrait and landscape | NOT TESTED |
| Text scaling and keyboard | NOT TESTED |

## Layout defects

| Item | Severity | Status |
|---|---|---|
| Page-level horizontal scroll on the five public routes | None observed | PASS |
| Decorative orbs and the home marquee paint outside the viewport | Low, clipped | Open, not changed |
| Signed-in tables, charts, drawers, and mobile nav | Unknown | NOT TESTED |
| Company Details global `.stats-grid` can still affect other pages after that chunk loads | Medium, code-confirmed | Open |

## Screenshots

No responsive screenshot set was captured. The 65 results are numeric layout reads from headless Chrome, not pictures.

## Fixed issues that affect layout

Admin Analytics grid and card rules were scoped to `.analytics-container` so they stop overriding the business dashboard grid after an admin visit. User and admin analytics charts set `max-width: none` on the Recharts surface so the global `svg { max-width: 100% }` rule does not collapse them. Neither change was confirmed on a signed-in screen.
