# Business Dashboard UI Redesign

Date: 17 November 2026

The business Dashboard was rearranged to follow the reference layout: KPI cards, a wide chart beside a smaller chart, then a billing table beside a side panel. The numbers still come from the existing dashboard load. No new Firestore query was added.

The Financial Reports invoice list and the admin Deleted Invoices filters were restyled in the same pass because those screens were marked in the screenshots. Their data and actions were not changed. Analytics was not edited.

## Files changed

- `frontend/src/pages/Dashboard/Dashboard.jsx`
- `frontend/src/pages/Dashboard/Dashboard.css`
- `frontend/src/pages/Reports/Reports.css`
- `frontend/src/admin/pages/DeletedInvoices/AdminDeletedInvoices.jsx` (page class and stylesheet import only)
- `frontend/src/admin/pages/DeletedInvoices/AdminDeletedInvoices.css`

## Existing data sources reused

`getDashboard` is unchanged. The page still uses:

- `stats/dashboard` for total revenue, yearly sales, monthly sales, today’s sales, and bill count
- the product list for active products, total stock, and low stock at or below 10 units
- the latest 10 invoices for the billing table, top customers, and the revenue chart
- product lines on those same invoices for the product chart

Average invoice value is total revenue divided by the stored bill count, and only when that count is above zero.

## Dashboard layout

- Header still shows the title, welcome line, date, and Create Bill. There is no search box and no extra button, because the dashboard does not have those actions.
- Four KPI cards: Total Revenue, Total Bills, Yearly Revenue, Active Products. Each card shows the existing subtitle. No growth percentage was added.
- The wide chart is recent bill revenue. The smaller chart is units sold by product in those bills. If a bill has no product lines, the smaller chart shows invoice counts for the same bills instead.
- Billing activity lists invoice number, customer, date, amount, and status. View All still opens Bills.
- The side panel keeps low stock, top customers from those bills, and today’s sales, monthly sales, and average invoice.

## Charts

Recharts was already installed. Revenue is an area chart. Product performance is a horizontal bar chart. Tooltips format revenue in rupees. Months that are not in the loaded bills are omitted. Chart grid and tick colors still follow the active theme.

## Existing functionality

Create Bill still navigates to `/bills`. View All still navigates to `/bills`. Loading and error states are unchanged. Refresh is the existing retry button on a failed load. Stock threshold and invoice calculations were not edited.

Reports search, month and year filters, PDF download, and share buttons were not changed. The invoice table and search now sit in one card.

Admin deleted-invoice search, company, month, and year filters, refresh, view, and download were not changed. The toolbar now keeps the search field from collapsing, and the empty state is a centered panel.

## Theme and responsive results

Colors use the existing theme variables. The production build completed in 0.80 seconds. The signed-in Dashboard, Reports page, and admin Deleted Invoices page were not opened in a browser in this session, so dark mode, light mode, and the listed widths were not visually confirmed.

## Limitations

- The revenue chart is the latest loaded bills, not a full-year series. A full-year trend already lives on Analytics, which was left as it is.
- There is no payment-method or traffic chart. Those fields are not in the dashboard data.
- KPI cards do not include sparklines. A sparkline on lifetime revenue would have reused only the latest bills and would not match the card total.
