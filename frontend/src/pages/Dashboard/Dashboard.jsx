import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
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
import { formatPackLabel } from '../../utils/productVariant';
import './Dashboard.css';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch dashboard stats ──────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDashboard();
      setDashData(data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to load dashboard. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Format currency ────────────────────────────────────────────────────────
  const fmt = (val) => {
    const num = parseFloat(val || 0);
    return isNaN(num) ? '₹0.00' : `₹${num.toFixed(2)}`;
  };

  // ── Format date ────────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
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
        isPositive: parseFloat(dashboardPayload.totalRevenue) >= 0,
        icon: <DollarSign size={22} />,
        color: 'blue'
      },
      {
        title: 'Total Bills',
        value: dashboardPayload.totalBills ?? 0,
        sub: `Today's Sales: ${fmt(dashboardPayload.todaySales)}`,
        isPositive: true,
        icon: <FileText size={22} />,
        color: 'emerald'
      },
      {
        title: 'Yearly Revenue',
        value: fmt(dashboardPayload.yearlySales),
        sub: `Monthly: ${fmt(dashboardPayload.monthlySales)}`,
        isPositive: parseFloat(dashboardPayload.yearlySales) >= 0,
        icon: <TrendingUp size={22} />,
        color: 'amber'
      },
      {
        title: 'Active Products',
        value: dashboardPayload.totalProducts ?? 0,
        sub: `Total Stock: ${dashboardPayload.totalStock ?? 0} units`,
        isPositive: true,
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
                  <div className={`stat-icon-wrapper ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <span className={`stat-badge ${stat.isPositive ? 'positive' : 'negative'}`}>
                    {stat.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stat.isPositive ? 'Active' : 'Loss'}
                  </span>
                </div>
                <div className="stat-card-bottom">
                  <p className="stat-value">{stat.value}</p>
                  <h3 className="stat-title">{stat.title}</h3>
                  <p className="stat-sub">{stat.sub}</p>
                </div>
              </div>
            ))}
          </section>

          {/* Analytics & Table Row */}
          <div className="dashboard-grid animate-slide-up delay-3">
            {/* Recent Bills Table */}
            <div className="dashboard-card table-card">
              <div className="card-header">
                <h3>Recent Bills</h3>
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
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashData.recentBills.map((bill, idx) => (
                        <tr key={bill.id || idx}>
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
              {dashData.lowStockProducts && dashData.lowStockProducts.length > 0 && (
                <div className="dashboard-card low-stock-card animate-slide-up delay-4">
                  <div className="card-header">
                    <h3>Low Stock Alert</h3>
                  </div>
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
                </div>
              )}

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
                          <small style={{ marginLeft: "6px", color: "#888" }}>
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
