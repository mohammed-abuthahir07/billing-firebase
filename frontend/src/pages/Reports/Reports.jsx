import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  downloadMonthlyReportPdf,
  getMonthlyInvoices,
  getMonthlySummary
} from '../../services/reportService';
import './Reports.css';

const PAGE_SIZE = 10;

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  if (Number.isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const Reports = () => {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1
  });
  const [reportMonth, setReportMonth] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const hasLoadedRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSummary = useCallback(async () => {
    const data = await getMonthlySummary();
    setSummary(data.summary || null);
    setReportMonth(data.reportMonth || '');
  }, []);

  const fetchInvoices = useCallback(async (nextPage, nextSearch, { silent } = {}) => {
    if (!silent) setTableLoading(true);
    const data = await getMonthlyInvoices({
      page: nextPage,
      limit: PAGE_SIZE,
      search: nextSearch
    });
    setInvoices(data.invoices || []);
    setPagination(data.pagination || {
      page: nextPage,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 1
    });
    if (data.reportMonth) setReportMonth(data.reportMonth);
  }, []);

  const loadReports = useCallback(async ({ refreshAll = false } = {}) => {
    const isInitial = !hasLoadedRef.current || refreshAll;
    if (isInitial) {
      setLoading(true);
    } else {
      setTableLoading(true);
    }
    setError('');
    try {
      if (isInitial) {
        await Promise.all([
          fetchSummary(),
          fetchInvoices(page, debouncedSearch, { silent: true })
        ]);
      } else {
        await fetchInvoices(page, debouncedSearch, { silent: true });
      }
      hasLoadedRef.current = true;
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to load monthly reports.';
      setError(msg);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [fetchSummary, fetchInvoices, page, debouncedSearch]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handlePageChange = (nextPage) => {
    const totalPages = pagination.totalPages || 1;
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadMonthlyReportPdf();
      showToast('Monthly report PDF downloaded.');
    } catch (err) {
      showToast(err.message || 'Failed to download PDF.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        title: 'Total Revenue This Month',
        value: formatCurrency(summary.totalRevenue),
        icon: IndianRupee,
        tone: 'blue'
      },
      {
        title: 'Total Sales This Month',
        value: `${Number(summary.totalSales || 0).toLocaleString('en-IN')}`,
        icon: ShoppingBag,
        tone: 'emerald'
      },
      {
        title: 'Total Invoices This Month',
        value: String(summary.totalInvoices || 0),
        icon: FileText,
        tone: 'indigo'
      },
      {
        title: 'Average Invoice Value',
        value: formatCurrency(summary.averageInvoiceValue),
        icon: TrendingUp,
        tone: 'amber'
      },
      {
        title: 'Best Selling Product This Month',
        value: summary.bestSellingProduct?.productName || '—',
        icon: Package,
        tone: 'blue',
        sub: summary.bestSellingProduct
          ? `${Number(summary.bestSellingProduct.quantitySold || 0).toLocaleString('en-IN')} sold`
          : 'No sales this month'
      }
    ];
  }, [summary]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const current = pagination.page || page;
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pagination, page]);

  const fromItem = pagination.total === 0
    ? 0
    : ((pagination.page || 1) - 1) * (pagination.limit || PAGE_SIZE) + 1;
  const toItem = Math.min(
    (pagination.page || 1) * (pagination.limit || PAGE_SIZE),
    pagination.total || 0
  );

  return (
    <div className="reports-container">
      {toast.show && (
        <div className={`reports-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Download size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <header className="reports-header animate-slide-up">
        <div className="header-info">
          <p className="page-kicker">
            <BarChart3 size={14} />
            Insights
          </p>
          <h1>Monthly Report</h1>
          <p>
            Sales, invoices, and product performance for {user?.name || 'your account'} — current month only.
          </p>
        </div>
        <div className="reports-header-actions">
          <span className="date-badge">
            <Calendar size={16} />
            {reportMonth || 'Current month'}
          </span>
          <button
            className="download-report-btn"
            onClick={handleDownloadPdf}
            disabled={downloading}
            type="button"
          >
            {downloading ? <Loader2 size={18} className="spin-icon" /> : <Download size={18} />}
            <span>{downloading ? 'Generating PDF…' : 'Download Monthly Report PDF'}</span>
          </button>
        </div>
      </header>

      {loading && (
        <div className="reports-loading">
          <Loader2 size={32} className="spin-icon" />
          <p>Loading your monthly report…</p>
        </div>
      )}

      {!loading && error && (
        <div className="reports-error">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className="retry-btn" onClick={() => loadReports({ refreshAll: true })} type="button">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="reports-stats-grid animate-slide-up delay-1">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <article className={`report-stat-card tone-${card.tone} animate-scale-up delay-${idx + 1}`} key={card.title}>
                  <div className="stat-card-top">
                    <div className={`stat-icon-wrapper ${card.tone}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="stat-title">{card.title}</p>
                    <h2 className="stat-value">{card.value}</h2>
                    {card.sub && <p className="stat-sub">{card.sub}</p>}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="filters-bar animate-slide-up delay-2">
            <div className="search-box">
  
              <input
                type="text"
                placeholder="Search by invoice number or customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="reports-table-meta">
              <BarChart3 size={16} />
              <span>{pagination.total || 0} invoices this month</span>
            </div>
          </section>

          <section className="reports-card animate-slide-up delay-3">
            {tableLoading && (
              <div className="reports-table-overlay">
                <Loader2 size={22} className="spin-icon" />
              </div>
            )}

            <div className="table-responsive">
              <table className="reports-table saas-table">
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Customer Name</th>
                    <th>Invoice Date</th>
                    <th>Items Count</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="invoice-number-cell">{invoice.invoiceNumber}</td>
                        <td>{invoice.customerName || '—'}</td>
                        <td>{formatDate(invoice.invoiceDate)}</td>
                        <td>{invoice.itemsCount}</td>
                        <td className="price-cell">{formatCurrency(invoice.totalAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        <FileText size={40} style={{ opacity: 0.3 }} />
                        <p>
                          {debouncedSearch
                            ? 'No invoices match your search.'
                            : 'No invoices created this month yet.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="reports-pagination">
              <p className="pagination-info">
                Showing {fromItem}–{toItem} of {pagination.total || 0}
              </p>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange((pagination.page || 1) - 1)}
                  disabled={(pagination.page || 1) <= 1}
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`page-btn number ${(pagination.page || 1) === num ? 'active' : ''}`}
                    onClick={() => handlePageChange(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange((pagination.page || 1) + 1)}
                  disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Reports;
