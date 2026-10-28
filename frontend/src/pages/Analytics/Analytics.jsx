import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'recharts';
import {
  AlertCircle,
  Calendar,
  IndianRupee,
  Loader2,
  Receipt,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserAnalytics } from '../../services/userAnalyticsService';
import './Analytics.css';

const toNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) =>
  `₹${toNumber(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCount = (value) => toNumber(value).toLocaleString('en-IN');

const ChartTooltip = ({ active, payload, label, prefix = '', isMoney = false }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="ua-tooltip">
      <p className="ua-tooltip-label">{label}</p>
      <p>
        {prefix}
        {isMoney ? formatCurrency(value) : formatCount(value)}
      </p>
    </div>
  );
};

const Analytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await getUserAnalytics();
      setData(payload);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load analytics. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {};
  const period = data?.period || {};
  const yearSeries = data?.yearSeries || [];
  const topCustomersYear = data?.topCustomersYear || [];
  const topCustomersMonth = data?.topCustomersMonth || [];
  const bestMonth = data?.bestCustomerMonth;
  const bestYear = data?.bestCustomerYear;

  const kpis = useMemo(
    () => [
      {
        title: 'Revenue This Month',
        value: formatCurrency(summary.monthRevenue),
        hint: period.monthLabel || 'Current month',
        icon: IndianRupee,
        tone: 'blue',
      },
      {
        title: 'Revenue This Year',
        value: formatCurrency(summary.yearRevenue),
        hint: period.yearLabel || 'Current year',
        icon: TrendingUp,
        tone: 'green',
      },
      {
        title: 'Invoices This Month',
        value: formatCount(summary.monthInvoices),
        hint: 'Bills created',
        icon: Receipt,
        tone: 'amber',
      },
      {
        title: 'Invoices This Year',
        value: formatCount(summary.yearInvoices),
        hint: 'Bills created',
        icon: Calendar,
        tone: 'purple',
      },
    ],
    [summary, period]
  );

  const yearRevenueTotal = toNumber(summary.yearRevenue);
  const rankedCustomers = topCustomersYear.map((customer, index) => ({
    ...customer,
    rank: index + 1,
    share: yearRevenueTotal > 0
      ? ((toNumber(customer.revenue) / yearRevenueTotal) * 100).toFixed(1)
      : '0.0',
  }));

  const chartAxis = {
    tick: { fill: '#64748b', fontSize: 12 },
    axisLine: { stroke: '#e2e8f0' },
    tickLine: false,
  };

  return (
    <div className="user-analytics">
      <header className="ua-header animate-slide-up">
        <div>
          <p className="page-kicker">
            <TrendingUp size={14} />
            Insights
          </p>
          <h1>Analytics</h1>
          <p>
            {user?.name ? `${user.name}'s` : 'Your'} sales, invoices, and best customers for this month and year.
          </p>
        </div>
        <button
          type="button"
          className="ua-refresh"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="spin-icon" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </header>

      {error && (
        <div className="ua-error animate-scale-up">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button type="button" className="ua-retry" onClick={fetchAnalytics}>
            Retry
          </button>
        </div>
      )}

      <section className="ua-kpi-grid">
        {kpis.map((card, index) => {
          const Icon = card.icon;
          return (
            <article
              className={`ua-kpi tone-${card.tone} animate-scale-up delay-${index + 1}`}
              key={card.title}
            >
              <div className="ua-kpi-top">
                <h3>{card.title}</h3>
                <span className={`ua-kpi-icon ${card.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <p className="ua-kpi-value">{loading ? '—' : card.value}</p>
              <span className="ua-kpi-hint">{card.hint}</span>
            </article>
          );
        })}
      </section>

      <section className="ua-best-grid animate-slide-up delay-2">
        <article className="ua-best-card">
          <p className="ua-best-kicker">Best customer this month</p>
          <h2>{bestMonth?.customerName || 'No sales yet'}</h2>
          <p className="ua-best-meta">
            {bestMonth
              ? `${formatCurrency(bestMonth.revenue)} · ${formatCount(bestMonth.invoices)} invoices`
              : `No invoices in ${period.monthLabel || 'this month'}.`}
          </p>
        </article>
        <article className="ua-best-card year">
          <p className="ua-best-kicker">Best customer this year</p>
          <h2>{bestYear?.customerName || 'No sales yet'}</h2>
          <p className="ua-best-meta">
            {bestYear
              ? `${formatCurrency(bestYear.revenue)} · ${formatCount(bestYear.invoices)} invoices`
              : `No invoices in ${period.yearLabel || 'this year'}.`}
          </p>
        </article>
      </section>

      {loading ? (
        <div className="ua-charts">
          {[1, 2, 3, 4].map((item) => (
            <div className="ua-chart-card ua-skeleton" key={item}>
              <div className="ua-skel-line" />
              <div className="ua-skel-chart" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="ua-charts">
            <section className="ua-chart-card animate-slide-up delay-3">
              <div className="ua-chart-head">
                <div>
                  <h2>Revenue This Year</h2>
                  <p>Collected invoice value by month</p>
                </div>
                <span className="ua-tag">INR</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={yearSeries} barSize={28}>
                  <defs>
                    <linearGradient id="uaRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" {...chartAxis} />
                  <YAxis {...chartAxis} />
                  <Tooltip content={<ChartTooltip isMoney />} />
                  <Bar dataKey="revenue" fill="url(#uaRevenueFill)" radius={[8, 8, 0, 0]} animationDuration={1100} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="ua-chart-card animate-slide-up delay-4">
              <div className="ua-chart-head">
                <div>
                  <h2>Invoices This Year</h2>
                  <p>Bills created each month</p>
                </div>
                <span className="ua-tag">Invoices</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={yearSeries}>
                  <defs>
                    <linearGradient id="uaInvoiceFill" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#uaInvoiceFill)"
                    dot={{ r: 4, fill: '#d97706', strokeWidth: 0 }}
                    animationDuration={1100}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="ua-chart-card animate-slide-up delay-5">
              <div className="ua-chart-head">
                <div>
                  <h2>Top Customers This Month</h2>
                  <p>Highest purchase value</p>
                </div>
                <span className="ua-tag">Month</span>
              </div>
              {topCustomersMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topCustomersMonth} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="customerName" {...chartAxis} interval={0} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis {...chartAxis} />
                    <Tooltip content={<ChartTooltip isMoney />} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} animationDuration={1100} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="ua-empty">No customer purchases this month.</div>
              )}
            </section>

            <section className="ua-chart-card animate-slide-up delay-6">
              <div className="ua-chart-head">
                <div>
                  <h2>Top Customers This Year</h2>
                  <p>Customers who buy the most from you</p>
                </div>
                <span className="ua-tag">Year</span>
              </div>
              {topCustomersYear.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topCustomersYear} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="customerName" {...chartAxis} interval={0} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis {...chartAxis} />
                    <Tooltip content={<ChartTooltip isMoney />} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[8, 8, 0, 0]} animationDuration={1100} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="ua-empty">No customer purchases this year.</div>
              )}
            </section>
          </div>

          <section className="ua-table-card animate-slide-up delay-6">
            <div className="ua-chart-head">
              <div>
                <h2>Best Customers This Year</h2>
                <p>Ranked by total purchase value</p>
              </div>
              <span className="ua-count">
                <Users size={14} />
                {rankedCustomers.length} customers
              </span>
            </div>
            <div className="table-responsive">
              <table className="ua-table saas-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Customer</th>
                    <th>Invoices</th>
                    <th>Total Purchase</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedCustomers.length > 0 ? (
                    rankedCustomers.map((customer) => (
                      <tr key={`${customer.rank}-${customer.customerName}`}>
                        <td>
                          <span className="ua-rank">#{customer.rank}</span>
                        </td>
                        <td className="ua-customer">{customer.customerName}</td>
                        <td>{formatCount(customer.invoices)}</td>
                        <td className="ua-money">{formatCurrency(customer.revenue)}</td>
                        <td>
                          <span className="ua-share">{customer.share}%</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        <Users size={36} style={{ opacity: 0.3 }} />
                        <p>No customer purchases yet this year.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Analytics;
