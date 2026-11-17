import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  FileText,
  ShoppingBag,
  Plus,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Package
} from 'lucide-react';
import { getDashboard } from '../../services/dashboardService';
import { notifyOutOfStock } from '../../services/stockAlertService';
import { getUserAnalytics } from '../../services/userAnalyticsService';
import { formatPackLabel } from '../../utils/productVariant';
import './Dashboard.css';

const PIE_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#d97706', '#db2777', '#64748b'];

function billDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DashboardSkeleton = () => (
  <div className="dashboard-skeleton animate-fade-in" aria-hidden="true">
    <div className="skeleton-grid">
      {[1, 2, 3, 4].map((item) => (
        <div className="skeleton-card" key={item}>
          <div className="skeleton skeleton-circle" />
          <div className="skeleton skeleton-value" />
          <div className="skeleton skeleton-line medium" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
    <div className="dashboard-grid" style={{ opacity: 1 }}>
      <div className="skeleton-card" style={{ minHeight: 260 }}>
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-line short" />
      </div>
      <div className="skeleton-card" style={{ minHeight: 260 }}>
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line medium" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [monthInvoices, setMonthInvoices] = useState([]);
  const [daySales, setDaySales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch dashboard stats ──────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, analytics] = await Promise.all([
        getDashboard(),
        getUserAnalytics().catch(() => null),
      ]);
      setDashData(data);
      setMonthInvoices(
        (analytics?.yearSeries || []).filter((point) => Number(point.invoices) > 0)
      );
      setDaySales(analytics?.daySales || null);
    } catch (err) {
      const msg = err?.message || 'Failed to load dashboard. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    (dashData?.lowStockProducts || []).forEach((product) => {
      if (Number(product.quantity) !== 0 || product.outOfStockNotified) return;
      const pack = product.package_weight
        ? ` ${formatPackLabel(product.package_weight, product.weight_unit)}`
        : '';
      notifyOutOfStock({
        productId: product.id,
        productName: `${product.item_name || 'Product'}${pack}`,
      }).catch(() => {});
    });
  }, [dashData]);

  // ── Format currency ────────────────────────────────────────────────────────
  const fmt = (val) => {
    const num = parseFloat(val || 0);
    return isNaN(num) ? '₹0.00' : `₹${num.toFixed(2)}`;
  };

  // ── Format date ────────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    const date = billDate(dateStr);
    if (!date) return '—';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // ── Today's date ───────────────────────────────────────────────────────────
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    []
  );

  const dashboardPayload = dashData?.dashboard || dashData;

  const stats = useMemo(() => {
    if (!dashboardPayload) return [];
    return [
      {
        title: 'Total Revenue',
        value: fmt(dashboardPayload.totalRevenue),
        sub: `Monthly: ${fmt(dashboardPayload.monthlySales)}`,
        icon: <DollarSign size={22} />,
        color: 'blue'
      },
      {
        title: 'Total Bills',
        value: dashboardPayload.totalBills ?? 0,
        sub: `Today's Sales: ${fmt(dashboardPayload.todaySales)}`,
        icon: <FileText size={22} />,
        color: 'emerald'
      },
      {
        title: 'Yearly Revenue',
        value: fmt(dashboardPayload.yearlySales),
        sub: `Monthly: ${fmt(dashboardPayload.monthlySales)}`,
        icon: <TrendingUp size={22} />,
        color: 'amber'
      },
      {
        title: 'Active Products',
        value: dashboardPayload.totalProducts ?? 0,
        sub: `Total Stock: ${dashboardPayload.totalStock ?? 0} units`,
        icon: <ShoppingBag size={22} />,
        color: 'indigo'
      }
    ];
  }, [dashboardPayload]);

  // Derive top customers from dashboard recent bills (no extra API call)
  const topCustomers = useMemo(() => {
    const recent = dashData?.recentBills || [];
    return Object.values(
      recent.reduce((acc, bill) => {
        const name = bill.customer_name || bill.customerName;
        if (!name) return acc;
        if (!acc[name]) {
          acc[name] = {
            customer_name: name,
            total_purchase: 0,
            total_orders: 0
          };
        }
        acc[name].total_purchase += Number(bill.grand_total || bill.total || 0);
        acc[name].total_orders += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.total_purchase - a.total_purchase)
      .slice(0, 3);
  }, [dashData]);

  const dayCompare = useMemo(() => {
    const todayDate = new Date();
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);
    const sumOn = (date) => (dashData?.recentBills || []).reduce((sum, bill) => {
      const when = billDate(bill.created_at || bill.date);
      if (!when) return sum;
      const sameDay = when.getFullYear() === date.getFullYear()
        && when.getMonth() === date.getMonth()
        && when.getDate() === date.getDate();
      return sameDay ? sum + Number(bill.grand_total || bill.total || 0) : sum;
    }, 0);
    const today = daySales ? Number(daySales.today) || 0 : sumOn(todayDate);
    const yesterday = daySales ? Number(daySales.yesterday) || 0 : sumOn(yesterdayDate);
    const peak = Math.max(today, yesterday, 1);
    return {
      today,
      yesterday,
      bars: [
        { name: 'Yesterday', sales: yesterday, color: '#0f766e' },
        { name: 'Today', sales: today, color: '#2563eb' },
      ].map((bar) => ({
        ...bar,
        height: bar.sales > 0 ? Math.max(22, (bar.sales / peak) * 100) : 14,
      })),
    };
  }, [daySales, dashData]);

  const billCount = Number(dashboardPayload?.totalBills || 0);
  const averageInvoice = billCount > 0 ? Number(dashboardPayload?.totalRevenue || 0) / billCount : null;
  const invoiceTotal = monthInvoices.reduce((sum, point) => sum + Number(point.invoices), 0);
  const pieGradient = useMemo(() => {
    let angle = 0;
    return monthInvoices.map((point, index) => {
      const sweep = invoiceTotal > 0 ? (Number(point.invoices) / invoiceTotal) * 360 : 0;
      const start = angle;
      angle += sweep;
      return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}deg ${angle}deg`;
    }).join(', ');
  }, [monthInvoices, invoiceTotal]);

  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <header className="dashboard-header animate-slide-up">
        <div className="header-info">
          <p className="page-kicker">
            <TrendingUp size={14} />
            Overview
          </p>
          <h1>Dashboard</h1>
          <p>
            {user
              ? `Welcome back, ${user.name}! Here's how your business is performing.`
              : 'Sign in to access analytics and billing records.'}
          </p>
        </div>
        <div className="header-actions">
          <span className="date-badge">
            <Calendar size={16} />
            <span>{todayLabel}</span>
          </span>
          <button
            className="action-btn"
            onClick={() => navigate('/bills')}
          >
            <Plus size={16} />
            <span>Create Bill</span>
          </button>
        </div>
      </header>

      {/* Loading */}
      {loading && <DashboardSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="dashboard-error animate-scale-up">
          <AlertTriangle size={32} />
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchDashboard}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Dashboard content */}
      {!loading && !error && dashData && (
        <>
          {/* Grid Stats */}
          <section className="stats-grid">
            {stats.map((stat, idx) => (
              <div
                key={stat.title}
                className={`stat-card tone-${stat.color} animate-scale-up delay-${idx + 1}`}
              >
                <div className="stat-card-top">
                  <p className="stat-title">{stat.title}</p>
                  <div className={`stat-icon-wrapper ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-sub">{stat.sub}</p>
              </div>
            ))}
          </section>

          <section className="dash-chart-grid">
            <article className="dashboard-card chart-panel chart-main">
              <div className="card-header">
                <div>
                  <h3>Today vs yesterday</h3>
                  <p className="panel-note">Sales dated today compared with sales dated yesterday.</p>
                </div>
              </div>
              <div
                className="day-bars"
                role="img"
                aria-label={`Yesterday ${fmt(dayCompare.yesterday)}, today ${fmt(dayCompare.today)}`}
              >
                {dayCompare.bars.map((bar) => (
                  <div className="day-bar-col" key={bar.name}>
                    <span className="day-bar-value">{fmt(bar.sales)}</span>
                    <div className="day-bar-track">
                      <div
                        className="day-bar-fill"
                        style={{ height: `${bar.height}%`, background: bar.color }}
                      />
                    </div>
                    <span className="day-bar-label">
                      <span className="swatch" style={{ background: bar.color }} />
                      {bar.name}
                    </span>
                  </div>
                ))}
              </div>
            </article>
            <article className="dashboard-card chart-panel">
              <div className="card-header">
                <div>
                  <h3>Invoices this year</h3>
                  <p className="panel-note">How many bills were created in each month.</p>
                </div>
              </div>
              {monthInvoices.length > 0 ? (
                <div className="chart-stage">
                  <div className="year-pie-wrap">
                    <div
                      className="year-pie"
                      style={{ background: `conic-gradient(${pieGradient})` }}
                      role="img"
                      aria-label="Invoices by month this year"
                    />
                  </div>
                  <ul className="product-legend">
                    {monthInvoices.map((point, index) => (
                      <li key={point.month}>
                        <span className="swatch" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="name">{point.month}</span>
                        <strong>{point.invoices}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="empty-state"><p>No invoices recorded this year.</p></div>
              )}
            </article>
          </section>

          {/* Analytics & Table Row */}
          <div className="dashboard-grid animate-slide-up delay-3">
            {/* Recent Bills Table */}
            <div className="dashboard-card table-card">
              <div className="card-header">
                <div>
                  <h3>Billing activity</h3>
                  <p className="panel-note">Latest 10 invoices.</p>
                </div>
                <button className="text-link-btn" onClick={() => navigate('/bills')}>
                  <span>View All</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="table-responsive">
                {dashData.recentBills && dashData.recentBills.length > 0 ? (
                  <table className="recent-table saas-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashData.recentBills.slice(0, 10).map((bill, idx) => (
                        <tr key={bill.id || idx}>
                          <td className="invoice-cell">{bill.invoice_number || '—'}</td>
                          <td className="customer-cell">
                            {bill.customer_name || bill.customerName || 'N/A'}
                          </td>
                          <td className="date-cell">{fmtDate(bill.created_at || bill.date)}</td>
                          <td className="font-semibold">{fmt(bill.grand_total|| bill.total)}</td>
                          <td>
                            {(() => {
                              const status = (bill.status || "paid").toLowerCase();

                              return (
                                <span className={`status-badge-table ${status}`}>
                                  {status === "paid" && <CheckCircle size={12} />}
                                  {status === "pending" && <Clock size={12} />}
                                  {status === "unpaid" && <AlertTriangle size={12} />}

                                  <span>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <FileText size={40} style={{ opacity: 0.3 }} />
                    <p>No bills yet. Create your first bill!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Low Stock & Best Sellers */}
            <div className="dashboard-side-cards">
              {/* Low Stock Alert */}
              <div className="dashboard-card low-stock-card animate-slide-up delay-4">
                  <div className="card-header">
                    <h3>Low Stock Alert</h3>
                  </div>
                  {dashData.lowStockProducts?.length > 0 ? (
                  <ul className="low-stock-list">
                    {dashData.lowStockProducts.map((prod, idx) => (
                      <li key={prod.id || idx} className="low-stock-item" style={{ animationDelay: `${idx * 60}ms` }}>
                        <Package size={14} />
                        <span className="low-stock-name">
                          {prod.item_name}
                          {prod.package_weight
                            ? ` ${formatPackLabel(prod.package_weight, prod.weight_unit)}`
                            : ''}
                        </span>
                        <span className="low-stock-qty">{prod.quantity} left</span>
                      </li>
                    ))}
                  </ul>
                  ) : (
                    <div className="empty-state"><p>No products are at or below 10 units.</p></div>
                  )}
                </div>

              {topCustomers.length > 0 && (
                <div className="dashboard-card best-customers-card animate-slide-up delay-5">
                  <div className="card-header">
                    <h3>Top Customers</h3>
                  </div>

                  <ul className="best-sellers-list">
                    {topCustomers.map((customer, index) => (
                      <li key={customer.customer_name || index} className="best-seller-item" style={{ animationDelay: `${index * 60}ms` }}>
                        <span className="seller-rank">#{index + 1}</span>

                        <span className="seller-name">
                          {customer.customer_name}
                        </span>

                        <span className="seller-sales">
                          ₹{customer.total_purchase.toFixed(2)}
                          <small className="order-count">
                            ({customer.total_orders} Orders)
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="dashboard-card animate-slide-up delay-6">
                <div className="card-header"><h3>Quick Stats</h3></div>
                <div className="quick-stats-grid">
                  <div className="quick-stat">
                    <span className="qs-label">Today's Sales</span>
                    <span className="qs-val">{fmt(dashData.dashboard?.todaySales || dashData.todaySales)}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="qs-label">Monthly Sales</span>
                    <span className="qs-val">{fmt(dashData.dashboard?.monthlySales || dashData.monthlySales)}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="qs-label">Average invoice</span>
                    <span className="qs-val">{averageInvoice == null ? '—' : fmt(averageInvoice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
