import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Loader2, RefreshCw, Search } from "lucide-react";
import { getAdminDeletedInvoices } from "../../services/adminDeletedInvoiceService";
import { generateInvoicePDF } from "../../../utils/invoicePdfGenerator";
import "../Invoices/AdminInvoices.css";
import "./AdminDeletedInvoices.css";

const MONTHS = ["All months", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const AdminDeletedInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(0);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminDeletedInvoices();
      setInvoices(data.invoices || []);
      setCompanies(data.companies || []);
      setYears(data.years || []);
      setNotice(data.readBlocked ? "Some company archives could not be read because Firestore denied access. Rules were not changed." : "");
    } catch (err) {
      setError(err.message || "Failed to load deleted invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const haystack = `${invoice.invoice_number || invoice.invoiceNumber || ""} ${invoice.customer_name || invoice.customerName || ""} ${invoice.companyName || ""}`.toLowerCase();
      const matchesTerm = !term || haystack.includes(term);
      const matchesCompany = companyId === "all" || invoice.userId === companyId;
      const matchesMonth = !month || Number(invoice.month) === Number(month);
      const matchesYear = !year || Number(invoice.year) === Number(year);
      return matchesTerm && matchesCompany && matchesMonth && matchesYear;
    });
  }, [invoices, search, companyId, month, year]);

  return (
    <div className="admin-invoices-page admin-deleted-page">
      <div className="invoices-header">
        <div>
          <h1 className="invoices-title">Deleted Invoices</h1>
          <p className="invoices-subtitle">Read-only archive of invoices removed with Complete Delete.</p>
        </div>
        <button className="refresh-btn" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {notice && <p className="invoices-subtitle">{notice}</p>}
      {error && <p className="invoices-subtitle">{error}</p>}

      <div className="invoices-toolbar">
        <label className="search-box">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, customer, or company" />
        </label>
        <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="all">All companies</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
        <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
          {MONTHS.map((label, index) => <option key={label} value={index}>{label}</option>)}
        </select>
        <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
          <option value={0}>All years</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="invoices-loading"><Loader2 className="spin" /><h3>Loading deleted invoices...</h3></div>
      ) : (
        <div className="invoices-table-card">
          {filtered.length === 0 ? (
            <div className="empty-state"><h3>No deleted invoices found</h3><p>Nothing matches the current filters.</p></div>
          ) : (
            <div className="invoices-table-container">
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Deleted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invoice) => (
                    <tr key={`${invoice.userId}-${invoice.id}`}>
                      <td>{invoice.companyName}</td>
                      <td>{invoice.invoice_number || invoice.invoiceNumber}</td>
                      <td>{invoice.customer_name || invoice.customerName || "Customer"}</td>
                      <td>{invoice.grand_total || invoice.grandTotal}</td>
                      <td>{invoice.deletedAt ? new Date(invoice.deletedAt).toLocaleDateString("en-IN") : "—"}</td>
                      <td>
                        <button type="button" className="icon-btn" onClick={() => setSelected(invoice)} title="View"><Eye size={15} /></button>
                        <button type="button" className="icon-btn" onClick={() => generateInvoicePDF(invoice)} title="Download"><Download size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.invoice_number || selected.invoiceNumber}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <p>{selected.companyName} · {selected.customer_name || selected.customerName}</p>
              <p>{selected.deletionType || "Completely Delete"}</p>
              <table className="modal-items-table">
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

export default AdminDeletedInvoices;
