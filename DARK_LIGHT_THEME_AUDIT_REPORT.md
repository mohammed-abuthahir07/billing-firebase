# Dark and Light Theme Audit

Date: 17 November 2026

The dark theme was painting headings white while several cards kept a hardcoded white or light-grey background. Company name, account cards, Quick Stats, and the analytics month chip were unreadable or still looked like light-mode pieces.

Theme preferences were not changed. Business stays in `billing_business_theme`. Admin stays in `billing_admin_theme`. Light, Dark, and System Default still apply immediately and survive refresh and logout. Invoice PDFs and the on-screen invoice sheet stay white.

## A. Initial Problems

- A global dark-mode rule forced headings to light text. Cards that still used `#ffffff` or a light gradient then showed white text on a white surface.
- Settings account header (`.settings-user-hero`) and the profile cards under it used a white background with a dark name color that the global rule overrode.
- Dashboard Quick Stats (`.quick-stat`) used a light grey gradient while the value used the theme text color, so the amount disappeared in dark mode.
- Analytics KPI hint chips (`.ua-kpi-hint`, the “Nov 2026” pill) stayed light grey.
- Admin and business stylesheets repeated `#ffffff`, `#f8fafc`, and `#0f172a` instead of theme tokens, so a dark page background did not restyle those components.
- The marketing site, login, and register screens were left on their own layouts.

## B. Business Portal Results

Signed-in pages were not clicked through in this browser. The status below is from the stylesheet after the token change, plus the production build. It is not a full visual pass.

| Page/component | Dark mode | Light mode | Responsive | Status |
|---|---|---|---|---|
| Dashboard, including Quick Stats | Tokens updated | Tokens updated | Existing breakpoints kept | NOT TESTED |
| Products and product form | Tokens updated | Tokens updated | Existing breakpoints kept | NOT TESTED |
| Bills, invoice drawer, history | Existing theme rules | Existing theme rules | Table scrolls under 768px | NOT TESTED |
| Invoice preview and PDF | Forced white paper | Forced white paper | Not a theme surface | NOT TESTED |
| Deleted Invoices | Toolbar uses tokens | Toolbar uses tokens | Filters stack under 860px | NOT TESTED |
| Analytics charts and KPI chips | Hint and cards use tokens | Tokens updated | Grid collapses under 768px | NOT TESTED |
| Reports | Tokens updated | Tokens updated | Header stacks under 900px | NOT TESTED |
| Profile | Tokens updated | Tokens updated | Existing breakpoints kept | NOT TESTED |
| Settings hero, cards, forms | Hero and panels use card tokens | Same tokens, light values | Grid stacks in existing CSS | NOT TESTED |
| Sidebar and navbar | Navy brand bar kept | Navy brand bar kept | Drawer under 768px | NOT TESTED |

## C. Admin Portal Results

| Page/component | Dark mode | Light mode | Responsive | Status |
|---|---|---|---|---|
| Admin login | Unchanged branded screen | Unchanged branded screen | Existing layout | NOT TESTED |
| Admin dashboard | Card and text tokens | Same tokens | Existing layout | NOT TESTED |
| Companies and company details | Tokens updated | Tokens updated | Padding tightens under 768px | NOT TESTED |
| Invoices and deleted invoices | Toolbar and tables use tokens | Same tokens | Toolbar stacks under 900px | NOT TESTED |
| Products | Tokens updated | Tokens updated | Existing layout | NOT TESTED |
| Analytics | Tokens updated | Tokens updated | Charts use theme axis colors | NOT TESTED |
| Settings and appearance | Theme picker plus tokens | Theme picker plus tokens | Picker stacks under 900px | NOT TESTED |

## D. CSS and Component Fixes

Portal styles now read `--bg-card`, `--bg-muted`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`, and `--border-color` instead of fixed hex values for surfaces and body text.

Files updated include Settings, Dashboard, Analytics, Profile, Reports, Products, the admin dashboard, companies, company details, invoices, products, analytics, settings, navbar, sidebar, and the shared theme stylesheet.

The global rule that forced every heading to white was removed. Dark mode still darkens known cards, but each heading keeps the color set on that component. Quick Stats use the elevated surface. The analytics month chip uses the muted surface and secondary text. The settings hero, profile panels, and side cards use the card surface, so the company name follows `--text-primary` on that same surface.

Colored status chips (paid, active, warning icons) keep a tinted background and a matching text color. Primary buttons stay blue with white text. The invoice sheet stays white.

## E. Accessibility Results

No contrast ratio was measured with a contrast checker in the browser. The previous failure was white text (`#f8fafc`) on a white or `#f8fafc` card, which is far below 4.5:1. Those pairs now use the dark card (`#1e293b`) with primary text (`#f8fafc`) in dark mode, and a white card with `#0f172a` text in light mode. Placeholder and muted text stay on `--text-muted` (`#94a3b8`), which is weaker than body text and should be checked on a signed-in screen.

## F. Screenshots

The three screenshots supplied with this request are the before state: Settings hero, Analytics “Nov 2026” chip, and Dashboard Quick Stats. After screenshots were not captured from a signed-in session.

## G. Remaining Issues

- Every business and admin page still needs a signed-in click-through in Dark, Light, and System Default, at phone, tablet, and desktop widths.
- A few warning chips still use a pale amber background. They stay readable, but they are lighter than the surrounding dark cards.
- Login, register, and the marketing page are not part of the portal theme.
- Invoice PDF generation was not re-exported after this CSS change. The generator does not read these theme variables.

## H. Final Assessment

Business portal visual test: NOT TESTED  
Admin portal visual test: NOT TESTED  
Production build after the token change: PASS (1.61 seconds)

The theme data model is unchanged and the conflicting white surfaces called out in the screenshots now use the same tokens as the rest of the dark page. That is not a substitute for opening every page while signed in.
