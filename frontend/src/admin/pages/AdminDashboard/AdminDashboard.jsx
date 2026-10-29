    import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Package,
  Receipt,
  IndianRupee,
  Wallet,
  Loader2,
  RefreshCw,
  TrendingUp,
  Activity,
  BarChart3,
  CircleAlert,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { getAdminDashboard } from "../../services/adminDashboardService";
import "./AdminDashboard.css";

const EMPTY_DASHBOARD = {
  totalUsers: 0,
  totalProducts: 0,
  totalInvoices: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
};

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const formatCount = (value) => safeNumber(value).toLocaleString("en-IN");
const formatMoney = (value) =>
  `₹ ${safeNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async ({ initial = false } = {}) => {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      setError("");
      const data = await getAdminDashboard();
      setDashboard({
        totalUsers: safeNumber(data?.totalUsers),
        totalProducts: safeNumber(data?.totalProducts),
        totalInvoices: safeNumber(data?.totalInvoices),
        totalRevenue: safeNumber(data?.totalRevenue),
        monthlyRevenue: safeNumber(data?.monthlyRevenue),
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
      setError("Unable to load the latest dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard({ initial: true });
  }, [loadDashboard]);

  const cards = [
    { title: "Total Companies", value: formatCount(dashboard.totalUsers), icon: Users, color: "blue", change: "Registered business accounts" },
    { title: "Total Products", value: formatCount(dashboard.totalProducts), icon: Package, color: "purple", change: "Packed variants listed" },
    { title: "Total Invoices", value: formatCount(dashboard.totalInvoices), icon: Receipt, color: "green", change: "Lifetime issued bills" },
    { title: "Total Sales", value: formatMoney(dashboard.totalRevenue), icon: IndianRupee, color: "amber", change: "All-time recorded revenue" },
    { title: "Monthly Sales", value: formatMoney(dashboard.monthlyRevenue), icon: Wallet, color: "emerald", change: "Current calendar month" },
  ];

  const activity = [
    { label: "Companies", value: dashboard.totalUsers, color: "blue" },
    { label: "Products", value: dashboard.totalProducts, color: "purple" },
    { label: "Invoices", value: dashboard.totalInvoices, color: "green" },
  ];
  const maxActivity = Math.max(1, ...activity.map((item) => item.value));
  const sales = [
    { label: "All-time sales", value: dashboard.totalRevenue, color: "amber" },
    { label: "This month", value: dashboard.monthlyRevenue, color: "emerald" },
  ];
  const maxSales = Math.max(1, ...sales.map((item) => item.value));
  const averageInvoice = dashboard.totalInvoices > 0
    ? dashboard.totalRevenue / dashboard.totalInvoices
    : 0;
  const monthlyShare = dashboard.totalRevenue > 0
    ? (dashboard.monthlyRevenue / dashboard.totalRevenue) * 100
    : 0;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker"><TrendingUp size={14} /> PLATFORM OVERVIEW</p>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">System activity, registered businesses, invoices, and sales at a glance.</p>
        </div>
        <button
          type="button"
          className="dashboard-refresh"
          onClick={() => loadDashboard()}
          disabled={loading || refreshing}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw size={16} className={loading || refreshing ? "spin" : ""} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </header>

      {error && (
        <div className="dashboard-error" role="alert">
          <CircleAlert size={18} /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading" role="status">
          <Loader2 size={30} className="spin" />
          <span>Loading platform data...</span>
        </div>
      ) : (
        <>
          <section aria-label="Platform statistics" className="dashboard-cards">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className={`card ${card.color}`}>
                  <div className="card-top">
                    <span className="card-title">{card.title}</span>
                    <div className="card-icon"><Icon size={20} /></div>
                  </div>
                  <div className="card-value">{card.value}</div>
                  <div className="card-change positive"><span>{card.change}</span></div>
                </article>
              );
            })}
          </section>

          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-section-kicker">INSIGHTS</p>
              <h2>Platform performance</h2>
              <p>Live comparisons based on your existing dashboard totals.</p>
            </div>
            {lastUpdated && <span className="dashboard-updated">Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>}
          </div>

          <section className="dashboard-chart-grid" aria-label="Dashboard charts">
            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="dashboard-panel-heading">
                  <span className="dashboard-panel-icon"><BarChart3 size={19} /></span>
                  <div><h3>Platform activity</h3><p>Companies, products and invoices</p></div>
                </div>
              </div>
              <div className="dashboard-bar-list">
                {activity.map((item) => (
                  <div className="dashboard-bar-item" key={item.label}>
                    <div className="dashboard-bar-label"><span>{item.label}</span><strong>{formatCount(item.value)}</strong></div>
                    <div className="dashboard-bar-track" role="img" aria-label={`${item.label}: ${formatCount(item.value)}`}>
                      <div className={`dashboard-bar-fill ${item.color}`} style={{ width: `${Math.max(0, (item.value / maxActivity) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="dashboard-panel-note">Each bar is scaled to the highest total in this chart.</p>
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="dashboard-panel-heading">
                  <span className="dashboard-panel-icon sales"><IndianRupee size={19} /></span>
                  <div><h3>Sales overview</h3><p>Current month compared with all-time sales</p></div>
                </div>
              </div>
              <div className="dashboard-bar-list">
                {sales.map((item) => (
                  <div className="dashboard-bar-item" key={item.label}>
                    <div className="dashboard-bar-label"><span>{item.label}</span><strong>{formatMoney(item.value)}</strong></div>
                    <div className="dashboard-bar-track" role="img" aria-label={`${item.label}: ${formatMoney(item.value)}`}>
                      <div className={`dashboard-bar-fill ${item.color}`} style={{ width: `${Math.max(0, (item.value / maxSales) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="dashboard-sales-summary">
                <span>Current month's share of all-time sales</span>
                <strong>{Math.max(0, monthlyShare).toFixed(1)}%</strong>
              </div>
              <p className="dashboard-panel-note">These are aggregate totals, not a historical sales trend.</p>
            </article>
          </section>

          <section className="dashboard-summary-grid" aria-label="Quick platform summary">
            <article className="dashboard-summary-card">
              <span className="dashboard-summary-icon"><Receipt size={19} /></span>
              <div><p>Average invoice value</p><strong>{formatMoney(averageInvoice)}</strong><small>All-time sales ÷ total invoices</small></div>
            </article>
            <article className="dashboard-summary-card">
              <span className="dashboard-summary-icon purple"><Building2 size={19} /></span>
              <div><p>Registered companies</p><strong>{formatCount(dashboard.totalUsers)}</strong><small>Accounts on the platform</small></div>
            </article>
            <article className="dashboard-summary-card">
              <span className="dashboard-summary-icon green"><Activity size={19} /></span>
              <div><p>Invoices issued</p><strong>{formatCount(dashboard.totalInvoices)}</strong><small>Across all registered companies</small></div>
            </article>
          </section>
          <div className="dashboard-bottom-note"><ArrowUpRight size={15} /> Figures reflect the data returned by your existing Admin dashboard service.</div>
        </>
      )}
    </main>
  );
};

export default AdminDashboard;