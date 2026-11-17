import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Eye, Loader2, RefreshCw, Search, Share2, Trash2 } from 'lucide-react';
import { getDeletedInvoices } from '../../services/deletedInvoiceService';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import { shareOrDownloadFile } from '../../utils/pdfShare';
import { getProfile } from '../../services/profileService';
import '../Bills/Bills.css';
import './DeletedInvoices.css';

const MONTHS = [
  { value: 0, label: 'All months' },
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

const messageFrom = (error, fallback) => error?.message || fallback;

const DeletedInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(0);
  const [selected, setSelected] = useState(null);
  const [logo, setLogo] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDeletedInvoices();
      setInvoices(data.invoices || []);
      setYears(data.years || []);
    } catch (err) {
      setError(messageFrom(err, 'Failed to load deleted invoices.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getProfile()
      .then((data) => setLogo(data.profile?.profile_image || ''))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesTerm = !term
        || String(invoice.invoice_number || invoice.invoiceNumber || '').toLowerCase().includes(term)
        || String(invoice.customer_name || invoice.customerName || '').toLowerCase().includes(term)
        || String(invoice.customer_phone || invoice.customerPhone || '').toLowerCase().includes(term);
      const matchesMonth = !month || Number(invoice.month) === Number(month);
      const matchesYear = !year || Number(invoice.year) === Number(year);
      return matchesTerm && matchesMonth && matchesYear;
    });
  }, [invoices, search, month, year]);

  const withLogo = (invoice) => ({ ...invoice, profileImage: logo });

  const download = (invoice) => {
    try {
      generateInvoicePDF(withLogo(invoice));
    } catch (err) {
      setError(messageFrom(err, 'Failed to generate PDF.'));
    }
  };

  const share = async (invoice) => {
    try {
      const file = generateInvoicePDF(withLogo(invoice), { delivery: 'file' });
      const result = await shareOrDownloadFile(file, `Invoice ${invoice.invoice_number || ''}`);
      if (result === 'downloaded') setError('');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(messageFrom(err, 'Sharing is not available in this browser. The PDF was not shared.'));
    }
  };

  return (
    <div className="bills-container">
      <header className="bills-header">
        <div className="header-info">
          <h1>Deleted Invoices</h1>
          <p>Invoices removed with Complete Delete. Stock and dashboard totals stay as they were.</p>
        </div>
        <button className="create-bill-btn" type="button" onClick={load}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </header>

      <section className="bills-card">
        <div className="deleted-toolbar">
          <label className="deleted-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, customer, or phone"
              aria-label="Search deleted invoices"
            />
          </label>
          <div className="deleted-filters">
            <label className="deleted-field">
              <span>Month</span>
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))} aria-label="Filter by month">
                {MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="deleted-field">
              <span>Year</span>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Filter by year">
                <option value={0}>All years</option>
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button type="button" className="deleted-reset" onClick={() => { setSearch(''); setMonth(0); setYear(0); }}>Reset</button>
          </div>
        </div>

        {loading && <div className="bills-loading"><Loader2 className="spin-icon" /><p>Loading deleted invoices...</p></div>}
        {!loading && error && (
          <div className="bills-error">
            <AlertTriangle />
            <p>{error}</p>
            <button className="retry-btn" type="button" onClick={load}>Retry</button>
          </div>
        )}
        {!loading && !error && (
          <div className="table-responsive">
            <table className="bills-table saas-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Deleted</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-table-cell">
                      <Trash2 size={36} />
                      <p>No completely deleted invoices match these filters.</p>
                    </td>
                  </tr>
                ) : filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number || invoice.invoiceNumber}</td>
                    <td>{invoice.customer_name || invoice.customerName || 'Customer'}</td>
                    <td>{invoice.grand_total || invoice.grandTotal}</td>
                    <td>{invoice.deletedAt ? new Date(invoice.deletedAt).toLocaleString('en-IN') : '—'}</td>
                    <td>{invoice.deletionType || 'Completely Delete'}</td>
                    <td className="action-column">
                      <div className="invoice-actions">
                        <button type="button" className="preview-action" onClick={() => setSelected(invoice)} title="View"><Eye size={15} /></button>
                        <button type="button" className="preview-action" onClick={() => download(invoice)} title="Download"><Download size={15} /></button>
                        <button type="button" className="preview-action" onClick={() => share(invoice)} title="Share"><Share2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer-card" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-topbar">
              <div>
                <h2>{selected.invoice_number || selected.invoiceNumber}</h2>
                <p>{selected.customer_name} · {selected.deletionType || 'Completely Delete'}</p>
              </div>
              <button type="button" className="drawer-close" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="drawer-form-scroll">
              <table className="bills-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  {(selected.items || []).map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name || item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedInvoices;
