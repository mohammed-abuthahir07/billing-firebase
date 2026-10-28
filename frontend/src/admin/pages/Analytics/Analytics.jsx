import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  IndianRupee,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getInvoiceAnalytics,
  getProductAnalytics,
  getRevenueAnalytics,
  getUsersAnalytics,
} from "../../services/adminAnalyticsService";
import "./Analytics.css";

const toNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) =>
  `₹${toNumber(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatCount = (value) =>
  toNumber(value).toLocaleString("en-IN");

const ChartTooltip = ({ active, payload, label, prefix = "", isMoney = false }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      <p>
        {prefix}
        {isMoney ? formatCurrency(value) : formatCount(value)}
      </p>
    </div>
  );
};

const Analytics = () => {
  const [users, setUsers] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, revenueData, invoiceData, productData] = await Promise.all([
        getUsersAnalytics(),
        getRevenueAnalytics(),
        getInvoiceAnalytics(),
        getProductAnalytics(),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setRevenue(Array.isArray(revenueData) ? revenueData : []);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (err) {
      console.log("Analytics Error:", err);
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = useMemo(() => {
    const totalUsers = users.reduce((sum, row) => sum + toNumber(row.users), 0);
    const totalRevenue = revenue.reduce((sum, row) => sum + toNumber(row.revenue), 0);
    const totalInvoices = invoices.reduce((sum, row) => sum + toNumber(row.invoices), 0);
    const totalProducts = products.reduce((sum, row) => sum + toNumber(row.products), 0);

    return [
      {
        title: "Total Users",
        value: formatCount(totalUsers),
        hint: "Registered accounts",
        icon: Users,
        tone: "blue",
      },
      {
        title: "Total Revenue",
        value: formatCurrency(totalRevenue),
        hint: "All invoice collections",
        icon: IndianRupee,
        tone: "green",
      },
      {
        title: "Total Invoices",
        value: formatCount(totalInvoices),
        hint: "Bills generated",
        icon: Receipt,
        tone: "amber",
      },
      {
        title: "Total Products",
        value: formatCount(totalProducts),
        hint: "Catalog items added",
        icon: Package,
        tone: "purple",
      },
    ];
  }, [users, revenue, invoices, products]);

  const chartAxis = {
    tick: { fill: "#64748b", fontSize: 12 },
    axisLine: { stroke: "#e2e8f0" },
    tickLine: false,
  };

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <div>
          <p className="analytics-kicker">
            <TrendingUp size={14} />
            Platform insights
          </p>
          <h1>Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            Live registration, revenue, billing, and catalog trends across the SaaS.
          </p>
        </div>
        <button
          type="button"
          className="analytics-refresh"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="spin-icon" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </header>

      {error && <div className="analytics-error">{error}</div>}

      <section className="stats-grid">
        {kpis.map((card, index) => {
          const Icon = card.icon;
          return (
            <article
              className={`stat-card tone-${card.tone}`}
              key={card.title}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="stat-card-top">
                <h3>{card.title}</h3>
                <span className={`stat-icon ${card.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <p className="stat-value">{loading ? "—" : card.value}</p>
              <span className="stat-badge">{card.hint}</span>
            </article>
          );
        })}
      </section>

      {loading ? (
        <div className="charts-grid">
          {[1, 2, 3, 4].map((item) => (
            <div className="chart-card chart-skeleton" key={item}>
              <div className="skeleton-line" />
              <div className="skeleton-chart" />
            </div>
          ))}
        </div>
      ) : (
        <div className="charts-grid">
          <section className="chart-card delay-1">
            <div className="chart-card-header">
              <div>
                <h2>Users Registered Per Month</h2>
                <p>New account growth</p>
              </div>
              <span className="chart-tag">Users</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={users}>
                <defs>
                  <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis allowDecimals={false} {...chartAxis} />
                <Tooltip content={<ChartTooltip prefix="Users: " />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#usersFill)"
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1100}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="chart-card delay-2">
            <div className="chart-card-header">
              <div>
                <h2>Revenue Per Month</h2>
                <p>Collected invoice value</p>
              </div>
              <span className="chart-tag">INR</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenue} barSize={36}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis {...chartAxis} />
                <Tooltip content={<ChartTooltip isMoney />} />
                <Bar
                  dataKey="revenue"
                  fill="url(#revenueFill)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1100}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="chart-card delay-3">
            <div className="chart-card-header">
              <div>
                <h2>Invoices Created Per Month</h2>
                <p>Billing volume over time</p>
              </div>
              <span className="chart-tag">Invoices</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={invoices}>
                <defs>
                  <linearGradient id="invoiceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis allowDecimals={false} {...chartAxis} />
                <Tooltip content={<ChartTooltip prefix="Invoices: " />} />
                <Area
                  type="monotone"
                  dataKey="invoices"
                  stroke="#d97706"
                  strokeWidth={3}
                  fill="url(#invoiceFill)"
                  dot={{ r: 4, fill: "#d97706", strokeWidth: 0 }}
                  animationDuration={1100}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="chart-card delay-4">
            <div className="chart-card-header">
              <div>
                <h2>Products Added Per Month</h2>
                <p>Catalog expansion</p>
              </div>
              <span className="chart-tag">Products</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={products}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis allowDecimals={false} {...chartAxis} />
                <Tooltip content={<ChartTooltip prefix="Products: " />} />
                <Line
                  type="monotone"
                  dataKey="products"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#7c3aed", strokeWidth: 0 }}
                  activeDot={{ r: 7 }}
                  animationDuration={1100}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}
    </div>
  );
};

export default Analytics;
