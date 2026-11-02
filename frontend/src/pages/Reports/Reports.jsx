import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  downloadMonthlyReportPdf,
  downloadYearlyReportPdf,
  downloadTotalReportPdf,
  getMonthlyInvoices,
  getMonthlySummary,
  getAvailableReportYears,
} from '../../services/reportService';
import './Reports.css';

const PAGE_SIZE = 10;

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  if (Number.isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const Reports = () => {
  const { user } = useAuth();
  const now = new Date();

  // Monthly report state
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState(now.getFullYear());
  const [reportMonthLabel, setReportMonthLabel] = useState('');

  // Yearly report state
  const [availableYears, setAvailableYears] = useState([now.getFullYear()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Data states
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  // Search & pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');

  // Download states (separate flags for clear visual indicators)
  const [downloadingMonthly, setDownloadingMonthly] = useState(false);
  const [downloadingYearly, setDownloadingYearly] = useState(false);
  const [downloadingTotal, setDownloadingTotal] = useState(false);

  const isDownloadingAny = downloadingMonthly || downloadingYearly || downloadingTotal;

  // Toast alert
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const hasLoadedRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Load available business years on initial render
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await getAvailableReportYears();
        if (Array.isArray(years) && years.length > 0) {
          setAvailableYears(years);
          if (!years.includes(selectedYear)) {
            setSelectedYear(years[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to load available report years:', err);
      }
    };
    fetchYears();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch monthly summary
  const fetchSummary = useCallback(async (month, year) => {
    const data = await getMonthlySummary({ month, year });
    setSummary(data.summary || null);
    setReportMonthLabel(data.reportMonth || '');
  }, []);

  // Fetch monthly invoices
  const fetchInvoices = useCallback(async (nextPage, nextSearch, month, year, { silent } = {}) => {
    if (!silent) setTableLoading(true);
    const data = await getMonthlyInvoices({
      page: nextPage,
      limit: PAGE_SIZE,
      search: nextSearch,
      month,
      year,
    });
    setInvoices(data.invoices || []);
    setPagination(
      data.pagination || {
        page: nextPage,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
      }
    );
    if (data.reportMonth) setReportMonthLabel(data.reportMonth);
  }, []);

  // Combined report loader
  const loadReports = useCallback(
    async ({ refreshAll = false } = {}) => {
      const isInitial = !hasLoadedRef.current || refreshAll;
      if (isInitial) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      setError('');
      try {
        await Promise.all([
          fetchSummary(selectedMonth, selectedMonthYear),
          fetchInvoices(page, debouncedSearch, selectedMonth, selectedMonthYear, { silent: true }),
        ]);
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
    },
    [fetchSummary, fetchInvoices, page, debouncedSearch, selectedMonth, selectedMonthYear]
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Month select handler
  const handleMonthChange = (e) => {
    const newMonth = Number(e.target.value);
    setSelectedMonth(newMonth);
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    const totalPages = pagination.totalPages || 1;
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  };

  // 1. Download Monthly Report PDF
  const handleDownloadMonthlyPdf = async () => {
    if (isDownloadingAny) return;
    setDownloadingMonthly(true);
    try {
      await downloadMonthlyReportPdf({
        month: selectedMonth,
        year: selectedMonthYear,
      });
      showToast(`Monthly report PDF for ${reportMonthLabel || 'selected month'} downloaded successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to download Monthly Report PDF.', 'error');
    } finally {
      setDownloadingMonthly(false);
    }
  };

  // 2. Download Yearly Report PDF
  const handleDownloadYearlyPdf = async () => {
    if (isDownloadingAny) return;
    setDownloadingYearly(true);
    try {
      await downloadYearlyReportPdf(selectedYear);
      showToast(`Yearly report PDF for Calendar Year ${selectedYear} downloaded successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to download Yearly Report PDF.', 'error');
    } finally {
      setDownloadingYearly(false);
    }
  };

  // 3. Download Total Report PDF
  const handleDownloadTotalPdf = async () => {
    if (isDownloadingAny) return;
    setDownloadingTotal(true);
    try {
      await downloadTotalReportPdf();
      showToast('Complete Lifetime Business Report PDF downloaded successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to download Complete Business Report PDF.', 'error');
    } finally {
      setDownloadingTotal(false);
    }
  };

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        title: 'Total Revenue This Month',
        value: formatCurrency(summary.totalRevenue),
        icon: IndianRupee,
        tone: 'blue',
      },
      {
        title: 'Total Sales This Month',
        value: `${Number(summary.totalSales || 0).toLocaleString('en-IN')}`,
        icon: ShoppingBag,
        tone: 'emerald',
      },
      {
        title: 'Total Invoices This Month',
        value: String(summary.totalInvoices || 0),
        icon: FileText,
        tone: 'indigo',
      },
      {
        title: 'Average Invoice Value',
        value: formatCurrency(summary.averageInvoiceValue),
        icon: TrendingUp,
        tone: 'amber',
      },
      {
        title: 'Best Selling Product This Month',
        value: summary.bestSellingProduct?.productName || '—',
        icon: Package,
        tone: 'blue',
        sub: summary.bestSellingProduct
          ? `${Number(summary.bestSellingProduct.quantitySold || 0).toLocaleString('en-IN')} sold`
          : 'No sales this month',
      },
    ];
  }, [summary]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const current = pagination.page || 1;
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push('ellipsis-start');

    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    for (let i = start; i <= end; i += 1) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (current < totalPages - 2) pages.push('ellipsis-end');
    if (!pages.includes(totalPages)) pages.push(totalPages);

    return pages;
  }, [pagination.page, pagination.totalPages]);

  const fromItem = pagination.total === 0
    ? 0
    : ((pagination.page || 1) - 1) * (pagination.limit || PAGE_SIZE) + 1;
  const toItem = Math.min(
    (pagination.page || 1) * (pagination.limit || PAGE_SIZE),
    pagination.total || 0
  );

  return (
    <div className="reports-container">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`reports-toast ${toast.type}`} role="alert">
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Download size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Reports Header */}
      <header className="reports-header animate-slide-up">
        <div className="header-info">
          <p className="page-kicker">
            <BarChart3 size={14} />
            Insights &amp; Audits
          </p>
          <h1>Financial Reports</h1>
          <p>
            Generate and export official business reports for {user?.name || 'your business'} — Monthly, Yearly, and Lifetime.
          </p>
        </div>

        {/* Toolbar: Selectors & 3 PDF Download Buttons */}
        <div className="reports-header-actions">
          {/* Month Selector for Monthly Report */}
          <div className="report-select-wrapper" title="Filter monthly report view">
            <Calendar size={15} className="report-select-icon" />
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="report-select"
              aria-label="Select report month"
              disabled={isDownloadingAny}
            >
              {MONTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {selectedMonthYear}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="report-select-arrow" />
          </div>

          {/* Year Selector for Yearly Report */}
          <div className="report-select-wrapper" title="Select year for annual report">
            <Calendar size={15} className="report-select-icon" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="report-select"
              aria-label="Select report year"
              disabled={isDownloadingAny}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="report-select-arrow" />
          </div>

          {/* Action 1: Download Monthly Report PDF */}
          <button
            className="download-report-btn monthly-btn"
            onClick={handleDownloadMonthlyPdf}
            disabled={isDownloadingAny}
            type="button"
            title="Download PDF report for the selected month"
          >
            {downloadingMonthly ? (
              <Loader2 size={16} className="spin-icon" />
            ) : (
              <Download size={16} />
            )}
            <span>{downloadingMonthly ? 'Generating Monthly…' : 'Download Monthly Report PDF'}</span>
          </button>

          {/* Action 2: Download Yearly Report PDF */}
          <button
            className="download-report-btn yearly-btn"
            onClick={handleDownloadYearlyPdf}
            disabled={isDownloadingAny}
            type="button"
            title={`Download PDF report for Calendar Year ${selectedYear}`}
          >
            {downloadingYearly ? (
              <Loader2 size={16} className="spin-icon" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            <span>{downloadingYearly ? `Generating ${selectedYear}…` : 'Download Yearly Report PDF'}</span>
          </button>

          {/* Action 3: Download Total Report PDF */}
          <button
            className="download-report-btn total-btn"
            onClick={handleDownloadTotalPdf}
            disabled={isDownloadingAny}
            type="button"
            title="Download Complete Lifetime Business Report PDF"
          >
            {downloadingTotal ? (
              <Loader2 size={16} className="spin-icon" />
            ) : (
              <FileText size={16} />
            )}
            <span>{downloadingTotal ? 'Generating Total…' : 'Download Total Report PDF'}</span>
          </button>
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="reports-loading">
          <Loader2 size={32} className="spin-icon" />
          <p>Loading your financial reports…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="reports-error">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button
            className="retry-btn"
            onClick={() => loadReports({ refreshAll: true })}
            type="button"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Monthly KPI Summary Cards */}
          <section className="reports-stats-grid animate-slide-up delay-1">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <article
                  className={`report-stat-card tone-${card.tone} animate-scale-up delay-${idx + 1}`}
                  key={card.title}
                >
                  <div className="stat-card-top">
                    <div className={`stat-icon-wrapper ${card.tone}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="stat-card-body">
                    <p className="stat-card-title">{card.title}</p>
                    <h3 className="stat-card-value">{card.value}</h3>
                    {card.sub && <p className="stat-card-sub">{card.sub}</p>}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Monthly Invoices Section */}
          <section className="reports-table-card animate-slide-up delay-2">
            <div className="filters-bar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by invoice number or customer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search invoices"
                />
              </div>

              <div className="results-count">
                <FileText size={16} />
                <span>
                  {pagination.total} invoice{pagination.total === 1 ? '' : 's'} for {reportMonthLabel}
                </span>
              </div>
            </div>

            <div className="table-wrapper">
              {tableLoading && (
                <div className="table-loading-overlay">
                  <Loader2 size={24} className="spin-icon" />
                </div>
              )}

              {invoices.length === 0 ? (
                <div className="reports-empty-state">
                  <FileText size={44} className="empty-icon" />
                  <p className="empty-title">
                    {debouncedSearch ? 'No matching invoices found' : `No bills recorded for ${reportMonthLabel}`}
                  </p>
                  <p className="empty-sub">
                    {debouncedSearch
                      ? 'Try adjusting your search criteria.'
                      : 'Invoices created during this month will appear here.'}
                  </p>
                </div>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Customer Name</th>
                      <th>Invoice Date</th>
                      <th>Items Count</th>
                      <th className="amount-col">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id || inv.invoiceNumber}>
                        <td className="invoice-num-cell">
                          <span className="invoice-pill">{inv.invoiceNumber}</span>
                        </td>
                        <td className="customer-cell">{inv.customerName}</td>
                        <td className="date-cell">{formatDate(inv.invoiceDate)}</td>
                        <td className="items-cell">{inv.itemsCount}</td>
                        <td className="amount-cell">{formatCurrency(inv.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="reports-pagination">
                <span className="pagination-info">
                  Showing {fromItem}–{toItem} of {pagination.total}
                </span>
                <div className="pagination-controls">
                  <button
                    className="page-btn prev"
                    onClick={() => handlePageChange((pagination.page || 1) - 1)}
                    disabled={(pagination.page || 1) <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                    <span>Prev</span>
                  </button>

                  <div className="page-numbers">
                    {pageNumbers.map((p, idx) =>
                      typeof p === 'number' ? (
                        <button
                          key={p}
                          className={`page-num-btn ${pagination.page === p ? 'active' : ''}`}
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={`el-${idx}`} className="page-ellipsis">
                          …
                        </span>
                      )
                    )}
                  </div>

                  <button
                    className="page-btn next"
                    onClick={() => handlePageChange((pagination.page || 1) + 1)}
                    disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Reports;
