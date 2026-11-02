# Billing SaaS — Website Functionality Guide

This document explains **everything this website can do**, split clearly into:

1. **User side** (business owners / shopkeepers who create bills)
2. **Admin side** (platform administrators who oversee all companies)

The product is **Billing SaaS**: a GST-ready billing, inventory, and sales reporting web app. Each registered user is treated as one **business account**. Their products, invoices, and stats are stored only under their own account. Users cannot see another company’s data. Admins can view data across all companies, but they do **not** create bills or manage another user’s catalog.

---

## How the two sides are separated

| | User portal | Admin portal |
|---|---|---|
| Entry URLs | `/` landing, `/login`, `/register` | `/admin/login` |
| After login | `/dashboard` | `/admin/dashboard` |
| Who can enter | Normal business accounts | Accounts marked as admin (custom claim or `admins` record) |
| Data they see | Only **their** products, bills, reports | **All** companies on the platform |
| Can they create invoices? | Yes | No |
| Can they add/edit products? | Yes (their catalog only) | No (read-only overview) |
| Cross-login | Admin emails cannot log in on the user login page. They are sent to the admin portal. | Regular users cannot open `/admin` pages. |

If a logged-in user opens `/`, they are sent to the user dashboard. If someone who is not logged in opens a protected page (`/dashboard`, `/products`, etc.), they are sent to `/login`. If someone who is not an admin opens `/admin/...`, they are sent to `/admin/login`.

---

# PART A — USER SIDE

**Audience:** a shop / business that wants to keep product stock, create GST invoices, and see sales.

**Main menu after login:** Dashboard · Products · Bills · Analytics · Reports · Profile · Logout

---

## A1. Public pages (before login)

### Landing page (`/`)

Shown only when the visitor is **not** logged in.

What the visitor can do:

- Read what the product is (invoicing, inventory, analytics).
- Open **Login** or **Register**.
- Jump to on-page sections: Features, How it works, FAQ, Contact, Privacy Policy.
- Read FAQ, contact/privacy copy, and social links.

### Register (`/register`)

Create a new business account.

What the user enters:

- Full name
- Email
- Password (minimum 6 characters)
- Confirm password

What happens after success:

- Firebase Auth account is created.
- A user record is created.
- An empty company profile is created.
- Dashboard counters start at zero (revenue, bills, sales).
- User is taken straight to **Dashboard**.

Rules:

- Email `admin@gmail.com` cannot register as a user (reserved for admin).
- Duplicate email is rejected (“Email already exists”).

Register can also be opened from a popup **Auth modal** on some screens (same fields, same rules).

### Login (`/login`)

Sign in with email and password.

What the user can do:

- Show/hide password
- Open **Forgot password**
- Go back to the landing page
- Jump to Register

Rules:

- Admin accounts are blocked here and redirected toward `/admin/login`.
- After success, user goes to `/dashboard`.
- Too many failed attempts shows a lockout-style message from Firebase.

### Forgot password (`/forgot-password` → `/verify-otp` → `/reset-password`)

1. User enters registered email.
2. A **Firebase password-reset email** is sent (the screen still uses “OTP” wording).
3. User is taken to a 6-digit verification screen (5-minute countdown, resend available).
4. User sets a new password (minimum 8 characters on this screen) and is sent back to Login.

---

## A2. Dashboard (`/dashboard`)

Home screen after login. Read-only overview of **this user’s** business.

**KPI cards**

- Total Revenue (lifetime), with monthly sales underneath
- Total Bills, with today’s sales underneath
- Yearly Revenue, with monthly sales underneath
- Active Products, with total stock units underneath

**Other sections**

- **Recent Bills** — last invoices (customer, date, amount, status badge). Status defaults to Paid if none is stored. “View All” / “Create Bill” go to Bills.
- **Low Stock Alert** — products with quantity **10 or less**, showing pack size and remaining qty.
- **Top Customers** — built from recent bills (name, rupees purchased, order count), top 3.
- **Quick Stats** — Today’s Sales and Monthly Sales.

User can **Retry** if load fails.

---

## A3. Products (`/products`) — inventory / catalog

This is where the user maintains **packed product variants** (example: “Idli Podi 250 g” as one row, “Idli Podi 500 g” as another).

### List

- Shows all variants belonging to this user only.
- Search by product name or SKU.
- Filter by category (categories that actually exist in the catalog, plus “All”).
- Pagination: 10 rows per page.

Each row typically shows name, pack (weight + unit), category, SKU, GST %, selling price, stock quantity.

### Add product (Create)

Opens a modal. Fields:

| Field | Meaning |
|---|---|
| Item name | Product name |
| Category | Chosen from a long built-in list (Masala, Kirana, Oils, Electronics, Services, Other, etc.) |
| SKU | Optional; if empty, a random `PROD-xxxxx` code is generated |
| Description | Extra notes / packaging details |
| GST % | Tax rate on this variant |
| Package weight | Numeric pack size |
| Weight unit | e.g. g, kg |
| Selling price | Price per pack (INR) |
| Quantity | Integer stock (number of packs) |

### Edit product

Same form, pre-filled. User can change price, GST, stock, name, pack size, etc.

### Delete product

- Asks for confirmation.
- **Blocked** if this variant already appears on any past invoice (history must stay intact).
- Allowed only when it was never billed.

---

## A4. Bills (`/bills`) — create and view invoices

This is the core billing screen.

### Invoice list

- Paginated history of invoices this user created.
- Each invoice has a number like `INV-` + timestamp.
- Actions per invoice: **Preview**, **Download PDF**.

### Create a new bill (drawer / form)

User fills **customer details**:

- Customer name (required)
- Customer email
- Customer GST (optional)
- Customer address
- Invoice date
- Due date (defaults to 30 days later)

Then adds **line items** from their product catalog:

- Pick a product variant
- Set quantity (cannot exceed current stock)
- Price and GST come from the product record (not typed freely on the bill)
- Add / remove lines
- Live totals: **Subtotal + GST = Grand total**

On save, the system (in one atomic transaction):

1. Rechecks stock.
2. Recalculates amounts from live product prices (so the bill cannot undercut stored price by accident).
3. Deducts stock for each packed variant.
4. Saves an **immutable invoice** (seller name, email, GST are copied from the company profile at that moment).
5. Updates dashboard counters (total revenue, total bills, today / month / year sales).
6. Opens preview and can download the PDF.

**Users cannot edit or delete an invoice after it is created.**

### Preview / print / PDF

- On-screen invoice preview.
- **Print**.
- **Download PDF** (professional invoice with seller, customer, line items, GST, totals; uses company logo if a real profile photo was uploaded).

Seller GST and business logo are pulled from **Profile**.

---

## A5. Analytics (`/analytics`)

Sales insights for **this user only**, current calendar month and year.

**KPI cards**

- Revenue this month
- Revenue this year
- Invoices this month
- Invoices this year

**Highlights**

- Best customer this month (revenue + invoice count)
- Best customer this year

**Charts**

- Revenue this year, by month (bar chart)
- Invoices this year, by month (area chart)
- Top customers this month (bar chart)
- Top customers this year (bar chart)

**Table**

- Best customers this year, ranked, with invoice count, total purchase, and % share of yearly revenue.

Refresh button reloads the numbers.

---

## A6. Reports (`/reports`) — monthly report

Focused on the **current calendar month only**.

**Summary cards**

- Total revenue this month
- Total sales this month (invoice count)
- Total invoices this month
- Average invoice value
- Best-selling product this month (name + quantity sold)

**Invoice table for the month**

- Invoice number, customer, date, items count, total amount
- Search by invoice number or customer name
- Pagination

**Download Monthly Report PDF**

A downloadable PDF that includes:

- Company details
- Month summary (revenue, GST, averages)
- Product performance for the month
- Invoice list for the month

File name pattern: `Monthly-Sales-Report-{Month}-{Year}.pdf`

---

## A7. Profile (`/profile`)

Personal + business details used on invoices.

**Account**

- Display name (editable)
- Email (shown; login email)

**Company / tax details**

- Company name
- Mobile
- Alternate email
- GST number
- Website
- Address, city, state, country, pincode

**Photo**

- Upload image (must be an image, max 5 MB).
- Image is resized and stored with the profile.
- If no photo, an initials avatar is shown.
- This photo is used as the **invoice logo** when it is a real uploaded image (not the generated avatar).

Save updates the profile and then returns the user to Dashboard.

---

## A8. Layout, session, and limits (user)

- Top bar: product name “Billing SaaS”, avatar, name, logout.
- Side menu on desktop; hamburger menu on mobile.
- Logout signs out of Firebase and returns to `/login`.
- Each user only reads/writes `users/{theirId}/...`.
- Stock is integer packs. Billing fails if requested qty is more than stock.
- GST is per product percentage, summed on the invoice.

---

# PART B — ADMIN SIDE

**Audience:** platform operator. They do **not** run a shop here. They watch every registered business.

**Main menu after login:**

- Overview: Dashboard, User Details, Analytics
- Management: Invoice Management, Product Overview
- System: Settings
- Logout

Admins **cannot** add products for a company, create/edit/delete invoices, or change a user’s catalog. Those pages are **view / search / download** tools.

---

## B1. Admin login (`/admin/login`)

Separate login from the user portal.

- Email + password.
- Allowed only if the account has an admin custom claim **or** a matching document in the `admins` collection.
- After success: `/admin/dashboard`.
- Close button goes back to the user login page.
- Logout clears admin session and returns to `/admin/login`.

---

## B2. Admin Dashboard (`/admin/dashboard`)

Platform-wide totals (all companies combined).

**Cards**

- Total Companies (registered user accounts)
- Total Products (all packed variants listed)
- Total Invoices (all bills ever issued)
- Total Sales (all-time revenue)
- Monthly Sales (current calendar month)

**Insights**

- Bar comparison: companies vs products vs invoices
- Sales overview: all-time vs this month, plus this month’s % of all-time sales
- Average invoice value (all-time sales ÷ total invoices)
- Refresh + last-updated time

---

## B3. User Details (`/admin/companies`)

Directory of every registered business user.

**Table columns**

- User name
- Email
- Product count
- Invoice count
- Monthly revenue
- Yearly revenue
- Total revenue
- **View** button

**Search** by name or email.

**View** opens that user’s detail page: `/admin/companies/:id`

---

## B4. Company Details (`/admin/companies/:id`)

One company’s snapshot.

Shows:

- Name, email, “Active account”
- Total products
- Total invoices
- Monthly revenue
- Total revenue
- **Recent invoices** table (invoice number, customer, total, date)

Actions: Back to user list, Refresh.

Admin still cannot edit this company’s profile, products, or invoices from this screen.

---

## B5. Admin Analytics (`/admin/analytics`)

Year-to-date **platform** trends (not one shop).

**KPI cards** (summed from monthly series)

- Total users
- Total revenue
- Total invoices
- Total products

**Charts**

- Users registered per month
- Revenue per month
- Invoices created per month
- Products added per month

Refresh reloads all four series.

---

## B6. Invoice Management (`/admin/invoices`)

All invoices from **every** company on one screen.

**KPI cards**

- Total invoices
- Total revenue
- Total GST collected
- Average ticket size

**Filters**

- Search: invoice number, company name, or customer name
- Filter by company
- Date range (from / to)
- Sort newest or oldest
- Clear filters
- Pagination (10 per page)

**Per invoice**

- View full details in a modal (seller, customer, line items, GST, totals)
- Download that invoice as PDF

Admin **cannot** create, edit, void, or delete invoices.

---

## B7. Product Overview (`/admin/products`)

Read-only catalog of **every** company’s products.

**KPI cards**

- Total listed products
- Total available stock (units)
- Low stock alerts (**5 or fewer** remaining)
- Out of stock items (quantity 0)

**Filters**

- Search: product name, SKU, or company
- Company
- Category
- Stock status: All / In Stock / Low Stock / Out of Stock
- Sort: name, price high/low, quantity high/low
- Clear filters
- Pagination (10 per page)

**View** opens a detail modal (company, SKU, category, pack, price, GST, quantity, stock status, dates).

Admin **cannot** add, edit, or delete products.

Note: user dashboard treats low stock as **≤ 10**; admin product overview treats low stock as **≤ 5**.

---

## B8. Admin Settings (`/admin/settings`)

Admin’s own account, not a global “edit all users” panel.

### Profile tab

- Email (shown, cannot be changed here)
- Display name (editable, save)

### Security tab

- Change password: current password + new password + confirm (minimum 6 characters)

### Application Info tab

Read-only system details: app name, version, environment, Firebase project, database, auth, PDF engine, React version, build tool, status.

*(A light/dark theme picker exists in code but is not shown in the tab bar, so it is not a live menu item.)*

---

# PART C — What each side cannot do (important)

### User cannot

- See another company’s products, invoices, or revenue
- Log in as admin from `/login` (admin accounts are blocked)
- Edit or delete an invoice after it is saved
- Delete a product that was already used on an invoice
- Bill more packs than current stock
- Access `/admin` pages

### Admin cannot

- Create, edit, or delete a user’s invoices
- Add / edit / delete a user’s products
- Bill customers
- Use the user dashboard as if they were a shop (admin accounts are not treated as normal users)

### Shared platform rules

- Invoices snapshot seller + customer + line items at create time.
- Stock goes down only when a user successfully creates a bill.
- Money amounts are in INR (₹).
- GST is calculated as a percentage of line subtotal.

---

# PART D — Page map (quick reference)

### User

| URL | Page | What it is for |
|---|---|---|
| `/` | Landing | Marketing / FAQ / go to login or register |
| `/register` | Register | Create business account |
| `/login` | Login | Sign in as user |
| `/forgot-password` | Forgot password | Request reset email |
| `/verify-otp` | Verify | Continue reset flow |
| `/reset-password` | Reset password | Set new password |
| `/dashboard` | Dashboard | Own sales snapshot |
| `/products` | Products | Add / edit / delete packed variants |
| `/bills` | Bills | Create invoices, preview, print, PDF |
| `/analytics` | Analytics | Own month/year charts and top customers |
| `/reports` | Reports | Current-month summary + monthly PDF |
| `/profile` | Profile | Company, GST, address, logo |

### Admin

| URL | Page | What it is for |
|---|---|---|
| `/admin/login` | Admin login | Admin-only sign in |
| `/admin/dashboard` | Dashboard | Platform totals |
| `/admin/companies` | User Details | List all businesses |
| `/admin/companies/:id` | Company Details | One business + recent invoices |
| `/admin/analytics` | Analytics | Platform monthly trends |
| `/admin/invoices` | Invoice Management | All invoices, filter, view, PDF |
| `/admin/products` | Product Overview | All products, stock health |
| `/admin/settings` | Settings | Admin profile, password, app info |

---

# PART E — Typical journeys

### New shop owner (user)

1. Open landing page → Register.
2. Land on Dashboard (zeros until they bill).
3. Open Profile → fill company name, GST, address, upload logo.
4. Open Products → add packed items with price, GST, stock.
5. Open Bills → create invoice → stock decreases → PDF download.
6. Use Dashboard / Analytics / Reports to track sales and download the monthly report.

### Platform operator (admin)

1. Open `/admin/login` → Dashboard.
2. Open User Details → search a company → View.
3. Open Invoice Management → filter by company/date → view or download PDF.
4. Open Product Overview → find low / out-of-stock items across the platform.
5. Open Analytics → see growth of users, revenue, invoices, products.
6. Open Settings → change admin display name or password.

---

*This guide matches the current application screens and services in this project (user portal + admin portal). Marketing text on the landing page may mention extras such as bulk import, payment tracking, or a full CRM; those are not implemented as separate working modules. What is implemented is listed above.*
