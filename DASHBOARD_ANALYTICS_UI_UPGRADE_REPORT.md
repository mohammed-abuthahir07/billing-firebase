# Dashboard and Analytics UI Upgrade

Date: 17 November 2026

The business Dashboard and Analytics pages were rearranged around the data they already load. Invoice math, stock thresholds, Firestore paths, authentication, and the admin portal were not changed.

## 1. Files changed

- `frontend/src/pages/Dashboard/Dashboard.jsx`
- `frontend/src/pages/Dashboard/Dashboard.css`
- `frontend/src/pages/Analytics/Analytics.jsx`
- `frontend/src/pages/Analytics/Analytics.css`
- `frontend/src/services/dashboardService.js` (recent bills now also return the stored `status` field so the badge can show it)

## 2. UI improvements

Dashboard keeps the welcome line, date, and Create Bill button. The four KPI cards no longer show an “Active” or “Loss” badge, because that label was not a real growth figure. Recent Bills, Low Stock, Top Customers, and Quick Stats remain. Low stock stays visible when nothing is at or below 10 units. A short list of best sellers from the already loaded bills was added. Three insight cards show average invoice value from the stored totals, the leading product in those bills, and how many bills are in the chart.

Analytics keeps the four revenue and invoice cards, the refresh button, both best-customer panels, the customer charts, and the yearly ranking table. The ranking table now shows each customer’s share of the year’s revenue, which was already calculated and not displayed. Three insight cards show average invoice value, the highest-revenue month, and this month against the previous month when that month exists in the series.

## 3. Charts added

Dashboard:

- Area chart of revenue from the latest loaded bills, grouped by the months those bills actually have.
- Bar chart of invoice counts for the same bills.

Analytics:

- Year revenue is an area chart. It was a bar chart.
- Year invoice count is a bar chart. It was an area chart.
- Customer charts still use the existing yearly and monthly rankings, limited to the top five names so the labels fit.

Recharts was already installed. No new chart library was added. Tooltips and axis colors still follow the active theme.

## 4. Data sources used

Dashboard numbers still come from `getDashboard`: `stats/dashboard`, the product list, and the latest 10 invoices. The charts and best-seller list are grouped from those invoices. They are not a full-year ledger. Months with no bill in that set are left out rather than drawn as zero.

Analytics still comes from `getUserAnalytics` and the existing sales-record merge for the current year. Month-to-month change is shown only when the previous month is in that series and its revenue is above zero. There is no previous-year comparison, because that service does not load the prior year.

## 5. Existing functionality preserved

Create Bill still opens `/bills`. View All still opens `/bills`. Refresh still calls `getUserAnalytics`. Stock at or below 10 units is still the low-stock rule. Customer ranking is still by purchase value. No Firestore collection, field, or security rule was renamed.

## 6. Theme verification

Cards, insight text, and chart axes use the existing theme variables. The production build completed in 0.94 seconds. The pages were not opened while signed in, so dark and light mode were not clicked through on a live session.

## 7. Responsive testing results

Layouts stack to one column at 1024px for the new chart and insight rows, and the older rules still stack KPI cards and the main dashboard grid at 1200px, 992px, 768px, and 480px. Those widths were not screenshotted in a browser.

## 8. Performance observations

The dashboard does not make a second sales-history query for the charts. Analytics still performs its existing read. Chart animation is 400ms. The production build did not add a chart package. The Firebase vendor chunk is unchanged in role and remains about 2.0 MB.

## 9. Limitations

- A payment-method donut is not shown. These invoices do not carry a payment-mode breakdown in the data already loaded, and a chart was not filled with guessed methods.
- Dashboard charts describe the latest loaded bills, not every sale for the year. The yearly trend stays on Analytics.
- Signed-in checks of Create Bill, View All, Refresh, both themes, and the listed screen widths were not run in this session.
