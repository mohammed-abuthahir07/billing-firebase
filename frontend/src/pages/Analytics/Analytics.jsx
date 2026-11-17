import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
import { useChartColors } from '../../theme/useChartColors';
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

const PIE_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#d97706', '#db2777', '#64748b'];

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
      setError(err.message || 'Failed to load analytics. Please try again.');
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
  const topProductsMonth = data?.topProductsMonth || [];
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

  const chartColors = useChartColors();
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const onChange = () => setCompact(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  const chartHeight = compact ? 230 : 320;
  const currentPoint = yearSeries[yearSeries.length - 1];
  const previousPoint = yearSeries.length > 1 ? yearSeries[yearSeries.length - 2] : null;
  const monthChange = previousPoint && toNumber(previousPoint.revenue) > 0 && currentPoint
    ? ((toNumber(currentPoint.revenue) - toNumber(previousPoint.revenue)) / toNumber(previousPoint.revenue)) * 100
    : null;
  const peakMonth = yearSeries.reduce((best, point) => (
    !best || toNumber(point.revenue) > toNumber(best.revenue) ? point : best
  ), null);
  const averageYearInvoice = toNumber(summary.yearInvoices) > 0
    ? toNumber(summary.yearRevenue) / toNumber(summary.yearInvoices)
    : null;
  const chartAxis = {
    tick: { fill: chartColors.tick, fontSize: 12 },
    axisLine: { stroke: chartColors.grid },
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
      {data?.salesRecordsBlocked && (
        <div className="ua-error animate-scale-up">
          <AlertCircle size={20} />
          <span>Sales records could not be read. These totals use active invoices only, so completely deleted invoices may be missing.</span>
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
            <section className="ua-chart-card ua-chart-wide animate-slide-up delay-3">
              <div className="ua-chart-head">
                <div>
                  <h2>Revenue This Year</h2>
                  <p>Collected invoice value by month</p>
                </div>
                <span className="ua-tag">INR</span>
              </div>
              <div className="ua-chart-stage">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={yearSeries} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uaRevenueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis
                    dataKey="month"
                    interval={compact ? 1 : 0}
                    angle={compact ? -35 : 0}
                    textAnchor={compact ? 'end' : 'middle'}
                    height={compact ? 52 : 32}
                    tick={{ fill: chartColors.tick, fontSize: compact ? 10 : 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis {...chartAxis} width={compact ? 40 : 56} />
                  <Tooltip content={<ChartTooltip isMoney />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#uaRevenueArea)"
                    dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </section>

            <section className="ua-chart-card animate-slide-up delay-4">
              <div className="ua-chart-head">
                <div>
                  <h2>Invoices This Year</h2>
                  <p>Bills created each month</p>
                </div>
                <span className="ua-tag">Invoices</span>
              </div>
              <div className="ua-chart-stage">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={yearSeries} barCategoryGap={compact ? '28%' : '22%'}>
                  <defs>
                    <linearGradient id="uaInvoiceBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5eead4" />
                      <stop offset="100%" stopColor="#0f766e" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis
                    dataKey="month"
                    interval={compact ? 1 : 0}
                    angle={compact ? -35 : 0}
                    textAnchor={compact ? 'end' : 'middle'}
                    height={compact ? 52 : 32}
                    tick={{ fill: chartColors.tick, fontSize: compact ? 10 : 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} {...chartAxis} width={compact ? 28 : 36} />
                  <Tooltip content={<ChartTooltip prefix="Invoices: " />} cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }} />
                  <Bar dataKey="invoices" fill="url(#uaInvoiceBar)" radius={[8, 8, 0, 0]} maxBarSize={42} animationDuration={1100} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
              </div>
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
                  <BarChart data={topCustomersMonth.slice(0, 5)} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="customerName" interval={0} tickFormatter={(name) => (String(name).length > 12 ? `${String(name).slice(0, 11)}…` : name)} tick={{ fill: chartColors.tick, fontSize: compact ? 10 : 11 }} axisLine={false} tickLine={false} height={compact ? 48 : 32} angle={compact ? -30 : 0} textAnchor={compact ? 'end' : 'middle'} />
                    <YAxis {...chartAxis} />
                    <Tooltip content={<ChartTooltip isMoney />} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={1100} animationEasing="ease-out" />
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
                  <BarChart data={topCustomersYear.slice(0, 5)} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="customerName" interval={0} tickFormatter={(name) => (String(name).length > 12 ? `${String(name).slice(0, 11)}…` : name)} tick={{ fill: chartColors.tick, fontSize: compact ? 10 : 11 }} axisLine={false} tickLine={false} height={compact ? 48 : 32} angle={compact ? -30 : 0} textAnchor={compact ? 'end' : 'middle'} />
                    <YAxis {...chartAxis} />
                    <Tooltip content={<ChartTooltip isMoney />} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={1200} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="ua-empty">No customer purchases this year.</div>
              )}
            </section>

            <section className="ua-chart-card animate-slide-up delay-6">
              <div className="ua-chart-head">
                <div>
                  <h2>Top products this month</h2>
                  <p>Units sold, from this month’s invoices</p>
                </div>
                <span className="ua-tag">Products</span>
              </div>
              {topProductsMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={compact ? 300 : 260}>
                  <PieChart>
                    <Pie
                      data={topProductsMonth.slice(0, 6)}
                      dataKey="quantity"
                      nameKey="name"
                      cx={compact ? '50%' : '38%'}
                      cy="50%"
                      outerRadius={compact ? 78 : 88}
                      paddingAngle={2}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {topProductsMonth.slice(0, 6).map((product, index) => (
                        <Cell key={product.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${formatCount(value)} sold`, name]} />
                    <Legend
                      layout={compact ? 'horizontal' : 'vertical'}
                      align={compact ? 'center' : 'right'}
                      verticalAlign={compact ? 'bottom' : 'middle'}
                      wrapperStyle={{ fontSize: 12, color: chartColors.tick }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="ua-empty">No product sales recorded this month.</div>
              )}
            </section>
          </div>

          <section className="ua-insight-row">
            <article className="ua-insight">
              <p>Average invoice this year</p>
              <strong>{averageYearInvoice == null ? '—' : formatCurrency(averageYearInvoice)}</strong>
              <span>Year revenue divided by the invoice count already calculated.</span>
            </article>
            <article className="ua-insight">
              <p>Highest revenue month</p>
              <strong>{peakMonth && toNumber(peakMonth.revenue) > 0 ? peakMonth.month : '—'}</strong>
              <span>{peakMonth && toNumber(peakMonth.revenue) > 0 ? formatCurrency(peakMonth.revenue) : 'No revenue recorded this year.'}</span>
            </article>
            <article className="ua-insight">
              <p>{previousPoint ? `${currentPoint?.month || 'This month'} vs ${previousPoint.month}` : 'Month comparison'}</p>
              <strong>
                {monthChange == null
                  ? formatCurrency(currentPoint?.revenue)
                  : `${monthChange > 0 ? '+' : ''}${monthChange.toFixed(1)}%`}
              </strong>
              <span>
                {!previousPoint
                  ? 'The previous month is not in this year’s series.'
                  : toNumber(previousPoint.revenue) <= 0
                    ? `${previousPoint.month} has no revenue, so a percentage is not shown.`
                    : `${formatCurrency(currentPoint?.revenue)} against ${formatCurrency(previousPoint.revenue)}.`}
              </span>
            </article>
          </section>

          <section className="ua-best-grid">
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
                          <span className="ua-rank">{customer.rank}</span>
                        </td>
                        <td className="ua-customer">{customer.customerName}</td>
                        <td>{formatCount(customer.invoices)}</td>
                        <td className="ua-money">{formatCurrency(customer.revenue)}</td>
                        <td><span className="ua-share">{customer.share}%</span></td>
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
