# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## 19 November 2026 — Invoice seller details

### Root cause

Invoice headers were using the personal account. Registration copied the person's name into `companyName` and the Firebase Authentication email into `alternateEmail`. New invoices stored those values, and the preview also fell back to `user.name` and `user.email` when a field was empty. Reports did the same with the user document and the login email.

### Company profile

Business details stay on the existing document `users/{uid}/profile/company`. No new collection was added.

- `companyName` — business name printed on invoices
- `alternateEmail` — business email
- `mobile` — business phone
- `address`, `city`, `state`, `pincode`, `country` — business address
- `gstNumber` — optional GSTIN
- `profileImage` — optional logo
- `businessConfigured` — set to `true` only when the owner saves the business profile

Login email is not copied into this document for new accounts. It is printed only after the owner saves the business profile, including when the saved business email is the same as the login email. The invoice header prints the saved `companyName`.

### Files

- `frontend/src/utils/companySeller.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/services/profileService.js`
- `frontend/src/services/billService.js`
- `frontend/src/services/reportService.js`
- `frontend/src/pages/Bills/Bill.jsx`
- `frontend/src/pages/Bills/Bills.css`
- `frontend/src/pages/DeletedInvoices/DeletedInvoices.jsx`
- `frontend/src/pages/Profile/Profile.jsx`
- `frontend/src/pages/Settings/Settings.jsx`
- `frontend/src/utils/invoicePdfGenerator.js`
- `frontend/src/utils/reportPdfGenerator.js`

### Invoice and PDF integration

Preview, print, download, and share on Bills all read the saved company profile. Deleted-invoice PDFs and the monthly, yearly, and total report PDFs use the same helper. Empty optional fields are omitted. Invoice totals, stock, and payment math were not changed.

### Testing

A Node check of `sellerFromCompany` confirmed that a profile copied from the personal name and login email is not printed, a different company name and business email are printed, and a saved profile may reuse the login email. The signed-in invoice preview was not opened in the browser for this change.

### What you need to do

Open Profile, enter the company name and business email, and save. Existing invoices then show those saved details instead of the login account.

## 19 November 2026 — Custom date range report

### Feature

The Financial Reports page can generate a report for any From Date and To Date. Monthly, yearly, and lifetime downloads, sharing, selectors, summary cards, and the invoice table are unchanged.

The new section sits below the existing report buttons. It has From Date, To Date, Generate Report, and Share Custom Range PDF. On screens 768px and narrower, the date fields and buttons stack vertically. Generate Report downloads the PDF. Share uses the existing file-share helper and downloads the PDF when the browser cannot share files.

### Date filtering

Invoices are included from the selected From Date through the selected To Date, inclusive. The filter uses the invoice calendar date stored as `year`, `month`, and `day`. If those fields are missing, it uses `created_at`, `date`, or the Firestore `timestamp` converted to the local calendar day. A date-only value such as `2026-11-01` is not parsed as UTC midnight. The PDF generation date is not used as the invoice date.

Records come from the existing merged sales-record and invoice list, so each invoice id is counted once. A wrong-entry deletion is already removed from both collections and is excluded. A completely deleted invoice is included only when its sales record is still in that merged list, which is the same rule the monthly, yearly, and lifetime reports already use. Totals use the stored grand total, subtotal, GST, line quantity, and line total. Product GST uses the same selling-price, quantity, and GST-rate formula used when the invoice was created.

### PDF

`generateCustomRangeReportPDF` adds an A4 report with the company profile, the title Custom Date Range Financial Report, the selected dates, the generation date, financial summary, product sales, invoice details with payment status when stored, and a final revenue, GST, and grand total. It reuses the existing company card, currency formatting, and PDF save/share finish path. The monthly, yearly, and lifetime drawing functions were not changed.

### Testing

`node scripts/check-custom-range-report.mjs` passed 69 checks: one day, seven days, a full month, a range across two months, an empty range, an invalid range, local date boundaries, Firestore timestamps, duplicate ids, wrong-entry and completely deleted invoice rules, totals against the source invoices, an A4 multi-page PDF, file sharing output, and a smoke run of the monthly, yearly, and lifetime PDF generators. The date controls stack vertically at 768px and wrap on tablet widths. A signed-in browser pass was not run.

### Files

- `frontend/src/utils/reportDateRange.js`
- `frontend/src/utils/reportPdfGenerator.js`
- `frontend/src/services/reportService.js`
- `frontend/src/pages/Reports/Reports.jsx`
- `frontend/src/pages/Reports/Reports.css`
- `frontend/scripts/check-custom-range-report.mjs`
- `frontend/README.md`

## 19 November 2026 — Profile completion reminder

### Requirements

A business profile is complete only when the saved company document has a company name, a phone number of 7 to 15 digits, and a street address. GSTIN, business email, and the company logo are optional. The Firebase Authentication email is not used as the business email. The stored `businessConfigured` flag cannot mark a profile complete while one of those fields is empty.

### Dashboard reminder

The Dashboard listens to the existing document `users/{uid}/profile/company`. While that read is in progress, the reminder stays hidden so a completed profile does not flash. If the saved fields are incomplete, a banner is shown in the space above the Dashboard heading with the title “Complete Your Business Profile”, a short explanation, and a Complete Profile button that opens `/profile`. Saving a complete profile updates the same document, the listener recalculates completeness, and the banner is removed without a dismiss action. Clearing the company name, phone number, or street address and saving makes the profile incomplete again, including after logout and login. A Firestore read error hides the banner instead of showing it from stale data.

Saving the profile now sets `businessConfigured` from those required fields. Image uploads still merge into the same document and do not create a second profile.

### Testing

`node scripts/check-profile-completion.mjs` passed 14 checks: an empty new profile, a completion flag with missing fields, a complete profile, optional GSTIN, email, and logo, clearing each required field, restoring the company name, a short phone number, snake_case fields, login email not replacing the company name, and city or country not replacing the street address. The banner stacks the button full-width below 768px and keeps it beside the text on wider screens. A signed-in browser pass was not run.

### Files

- `frontend/src/utils/profileCompletion.js`
- `frontend/src/services/profileService.js`
- `frontend/src/pages/Dashboard/Dashboard.jsx`
- `frontend/src/pages/Dashboard/Dashboard.css`
- `frontend/scripts/check-profile-completion.mjs`
- `frontend/README.md`
<!-- admin@gmail.com
Admin@123456 -->