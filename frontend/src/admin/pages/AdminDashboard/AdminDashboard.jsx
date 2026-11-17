import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { useChartColors } from "../../../theme/useChartColors";
import "./AdminDashboard.css";

const PIE_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#d97706", "#db2777", "#64748b", "#0891b2", "#65a30d", "#ea580c", "#4f46e5", "#0ea5e9", "#be123c"];

const EMPTY_DASHBOARD = {
  totalUsers: 0,
  totalProducts: 0,
  totalInvoices: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  monthlySeries: [],
  companies: [],
  salesRecordsBlocked: false,
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
        monthlySeries: Array.isArray(data?.monthlySeries) ? data.monthlySeries : [],
        companies: Array.isArray(data?.companies) ? data.companies : [],
        salesRecordsBlocked: Boolean(data?.salesRecordsBlocked),
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

  const averageInvoice = dashboard.totalInvoices > 0
    ? dashboard.totalRevenue / dashboard.totalInvoices
    : 0;
  const monthlyShare = dashboard.totalRevenue > 0
    ? (dashboard.monthlyRevenue / dashboard.totalRevenue) * 100
    : 0;
  const chartColors = useChartColors();
  const yearSeries = useMemo(() => {
    const throughNow = (dashboard.monthlySeries || []).slice(0, new Date().getMonth() + 1);
    return throughNow;
  }, [dashboard.monthlySeries]);
  const companyPie = useMemo(() => {
    const ranked = (dashboard.companies || []).filter((company) => company.revenue > 0);
    const top = ranked.slice(0, 6);
    const rest = ranked.slice(6).reduce((sum, company) => sum + company.revenue, 0);
    if (rest > 0) top.push({ name: "Other companies", revenue: Number(rest.toFixed(2)) });
    return top;
  }, [dashboard.companies]);
  const companyMonthBars = useMemo(
    () => [...(dashboard.companies || [])].sort((a, b) => b.monthRevenue - a.monthRevenue).slice(0, 8),
    [dashboard.companies]
  );
  const companyTotal = companyPie.reduce((sum, company) => sum + company.revenue, 0);
  const pieGradient = useMemo(() => {
    let angle = 0;
    return companyPie.map((company, index) => {
      const sweep = companyTotal > 0 ? (company.revenue / companyTotal) * 360 : 0;
      const start = angle;
      angle += sweep;
      return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}deg ${angle}deg`;
    }).join(", ");
  }, [companyPie, companyTotal]);
  const topCompany = companyPie[0] || null;
  const bestMonth = yearSeries.reduce((best, point, index) => (
    !best || point.value > best.value ? { ...point, index } : best
  ), null);
  const bestMonthCompany = bestMonth && bestMonth.value > 0
    ? (dashboard.companies || []).reduce((leader, company) => {
      const amount = Number(company.months?.[bestMonth.index] || 0);
      return !leader || amount > leader.amount ? { name: company.name, amount } : leader;
    }, null)
    : null;

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
            <article className="dashboard-panel dashboard-chart-wide">
              <div className="dashboard-panel-header">
                <div className="dashboard-panel-heading">
                  <span className="dashboard-panel-icon sales"><IndianRupee size={19} /></span>
                  <div><h3>Sales this year</h3><p>Recorded revenue for each month so far</p></div>
                </div>
              </div>
              <div className="admin-chart-stage">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={yearSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminSalesArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartColors.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartColors.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip formatter={(value) => [formatMoney(value), "Sales"]} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, color: "var(--text-primary)" }} />
                    <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="url(#adminSalesArea)" dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} animationDuration={1100} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-sales-summary">
                <span>Current month's share of all-time sales</span>
                <strong>{Math.max(0, monthlyShare).toFixed(1)}%</strong>
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="dashboard-panel-heading">
                  <span className="dashboard-panel-icon"><BarChart3 size={19} /></span>
                  <div><h3>Company revenue this month</h3><p>Highest bar is the company with the most sales this month</p></div>
                </div>
              </div>
              {companyMonthBars.some((company) => company.monthRevenue > 0) ? (
                <div className="admin-chart-stage">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={companyMonthBars} barSize={28}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="name" interval={0} tickFormatter={(name) => (String(name).length > 12 ? `${String(name).slice(0, 11)}…` : name)} tick={{ fill: chartColors.tick, fontSize: 11, fontFamily: "Outfit, sans-serif" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: chartColors.tick, fontSize: 12, fontFamily: "Outfit, sans-serif" }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip formatter={(value) => [formatMoney(value), "This month"]} />
                      <Bar dataKey="monthRevenue" fill="#7c3aed" radius={[8, 8, 0, 0]} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="dashboard-panel-note">No company has recorded sales this month.</p>
              )}
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="dashboard-panel-heading">
                  <span className="dashboard-panel-icon sales"><Activity size={19} /></span>
                  <div><h3>Company revenue share</h3><p>Which company has collected the most, all time</p></div>
                </div>
              </div>
              {companyPie.length > 0 ? (
                <>
                  <div className="year-pie-wrap">
                    <div className="year-pie" style={{ background: `conic-gradient(${pieGradient})` }} role="img" aria-label="Revenue share by company" />
                  </div>
                  <ul className="admin-pie-legend">
                    {companyPie.map((company, index) => (
                      <li key={company.name}>
                        <span className="swatch" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span>{company.name}</span>
                        <strong>{formatMoney(company.revenue)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="dashboard-panel-note">No company revenue has been recorded yet.</p>
              )}
            </article>
          </section>
          {dashboard.salesRecordsBlocked && (
            <p className="dashboard-panel-note">Sales records could not be read, so these totals use active invoices only.</p>
          )}

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
              <div><p>Highest company</p><strong>{topCompany?.name || "—"}</strong><small>{topCompany ? formatMoney(topCompany.revenue) : "No revenue recorded yet"}</small></div>
            </article>
            <article className="dashboard-summary-card">
              <span className="dashboard-summary-icon"><TrendingUp size={19} /></span>
              <div><p>Highest month this year</p><strong>{bestMonth && bestMonth.value > 0 ? bestMonth.label : "—"}</strong><small>{bestMonthCompany ? `${bestMonthCompany.name} · ${formatMoney(bestMonthCompany.amount)}` : "No sales in the months so far"}</small></div>
            </article>
          </section>
          <div className="dashboard-bottom-note"><ArrowUpRight size={15} /> Figures reflect the data returned by your existing Admin dashboard service.</div>
        </>
      )}
    </main>
  );
};

export default AdminDashboard;