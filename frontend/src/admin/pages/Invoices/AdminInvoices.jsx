import { useEffect, useState, useMemo } from "react";
import {
    Receipt,
    Search,
    Download,
    Eye,
    RefreshCw,
    Calendar,
    IndianRupee,
    Filter,
    X,
    Building2,
    CheckCircle2,
    Loader2,
    TrendingUp,
    FileText,
} from "lucide-react";
import { getAdminInvoices } from "../../services/adminInvoiceService";
import { generateInvoicePDF } from "../../../utils/invoicePdfGenerator";
import "./AdminInvoices.css";

const PAGE_SIZE = 10;

const formatMoney = (val) => `₹ ${Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
};

const AdminInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [companiesList, setCompaniesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters
    const [search, setSearch] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Detail Modal
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getAdminInvoices();
            setInvoices(data.invoices || []);
            setCompaniesList(data.companiesList || []);
        } catch (err) {
            console.error("Failed to load invoices:", err);
            setError(err.message || "Failed to load invoices.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
    }, []);

    // Filter & Sort Logic
    const filteredInvoices = useMemo(() => {
        let result = [...invoices];

        // Search (invoice number, company name, customer name)
        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (inv) =>
                    inv.invoiceNumber.toLowerCase().includes(q) ||
                    inv.companyName.toLowerCase().includes(q) ||
                    inv.customerName.toLowerCase().includes(q)
            );
        }

        // Company filter
        if (selectedCompany !== "all") {
            result = result.filter((inv) => inv.userId === selectedCompany);
        }

        // Date range filter
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((inv) => new Date(inv.invoiceDate) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((inv) => new Date(inv.invoiceDate) <= end);
        }

        // Sort order
        result.sort((a, b) => {
            const da = new Date(a.invoiceDate).getTime();
            const db = new Date(b.invoiceDate).getTime();
            return sortOrder === "newest" ? db - da : da - db;
        });

        return result;
    }, [invoices, search, selectedCompany, startDate, endDate, sortOrder]);

    // KPI Metrics derived from all loaded invoices
    const totalCount = invoices.length;
    const totalRevenue = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const totalGST = invoices.reduce((sum, i) => sum + i.gstAmount, 0);
    const avgInvoice = totalCount > 0 ? totalRevenue / totalCount : 0;

    // Pagination calculations
    const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + PAGE_SIZE);

    const handleClearFilters = () => {
        setSearch("");
        setSelectedCompany("all");
        setStartDate("");
        setEndDate("");
        setSortOrder("newest");
        setCurrentPage(1);
    };

    const handleDownloadPDF = (inv) => {
        try {
            generateInvoicePDF(inv.raw || inv);
        } catch (err) {
            console.error("PDF generation error:", err);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    return (
        <div className="admin-invoices-page">
            {/* Header */}
            <div className="invoices-header">
                <div>
                    <p className="invoices-kicker">
                        <Receipt size={14} />
                        PLATFORM MANAGEMENT
                    </p>
                    <h1 className="invoices-title">Invoice Management</h1>
                    <p className="invoices-subtitle">
                        Cross-company invoice records, GST collections, and audit logs.
                    </p>
                </div>
                <div className="invoices-actions">
                    <button
                        className="refresh-btn"
                        onClick={loadInvoices}
                        disabled={loading}
                        type="button"
                    >
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="invoices-kpi-grid">
                <div className="kpi-card blue">
                    <div className="kpi-top">
                        <span className="kpi-label">Total Invoices</span>
                        <div className="kpi-icon"><Receipt size={19} /></div>
                    </div>
                    <div className="kpi-value">{totalCount.toLocaleString("en-IN")}</div>
                    <span className="kpi-hint">Across all companies</span>
                </div>

                <div className="kpi-card emerald">
                    <div className="kpi-top">
                        <span className="kpi-label">Total Revenue</span>
                        <div className="kpi-icon"><IndianRupee size={19} /></div>
                    </div>
                    <div className="kpi-value">{formatMoney(totalRevenue)}</div>
                    <span className="kpi-hint">All-time billed sales</span>
                </div>

                <div className="kpi-card purple">
                    <div className="kpi-top">
                        <span className="kpi-label">Total GST Collected</span>
                        <div className="kpi-icon"><TrendingUp size={19} /></div>
                    </div>
                    <div className="kpi-value">{formatMoney(totalGST)}</div>
                    <span className="kpi-hint">Recorded tax component</span>
                </div>

                <div className="kpi-card amber">
                    <div className="kpi-top">
                        <span className="kpi-label">Average Ticket Size</span>
                        <div className="kpi-icon"><FileText size={19} /></div>
                    </div>
                    <div className="kpi-value">{formatMoney(avgInvoice)}</div>
                    <span className="kpi-hint">Mean order value</span>
                </div>
            </div>

            {/* Toolbar & Filters */}
            <div className="invoices-toolbar">
                <div className="toolbar-left">
                    <div className="search-input-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search invoice #, company, customer..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <select
                        className="filter-select"
                        value={selectedCompany}
                        onChange={(e) => {
                            setSelectedCompany(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="all">All Companies</option>
                        {companiesList.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <div className="date-range-group">
                        <input
                            type="date"
                            className="date-input"
                            value={startDate}
                            title="Start Date"
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <span className="date-separator">to</span>
                        <input
                            type="date"
                            className="date-input"
                            value={endDate}
                            title="End Date"
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <select
                        className="filter-select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="newest">Sort: Newest First</option>
                        <option value="oldest">Sort: Oldest First</option>
                    </select>
                </div>

                <div className="toolbar-right">
                    <span className="results-count">
                        {filteredInvoices.length} {filteredInvoices.length === 1 ? "invoice" : "invoices"}
                    </span>
                    {(search || selectedCompany !== "all" || startDate || endDate || sortOrder !== "newest") && (
                        <button className="clear-filters-btn" onClick={handleClearFilters} type="button">
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="invoices-table-card">
                {loading ? (
                    <div className="table-state">
                        <Loader2 size={32} className="spin" />
                        <h3>Loading company invoices...</h3>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="table-state">
                        <Receipt size={40} style={{ color: "#94a3b8" }} />
                        <h3>No invoices found</h3>
                        <p>No invoices match your current search or filter criteria.</p>
                    </div>
                ) : (
                    <>
                        <div className="invoices-table-container">
                            <table className="invoices-table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Company</th>
                                        <th>Customer</th>
                                        <th>Date</th>
                                        <th>Subtotal</th>
                                        <th>GST</th>
                                        <th>Grand Total</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedInvoices.map((inv) => (
                                        <tr key={inv.id}>
                                            <td>
                                                <span className="invoice-no-pill">{inv.invoiceNumber}</span>
                                            </td>
                                            <td className="company-cell">{inv.companyName}</td>
                                            <td className="customer-cell">{inv.customerName}</td>
                                            <td>{formatDate(inv.invoiceDate)}</td>
                                            <td>{formatMoney(inv.subtotal)}</td>
                                            <td>{formatMoney(inv.gstAmount)}</td>
                                            <td className="amount-cell">{formatMoney(inv.grandTotal)}</td>
                                            <td>
                                                <span className={`status-badge ${inv.status.toLowerCase()}`}>
                                                    <CheckCircle2 size={11} />
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        type="button"
                                                        className="action-btn view"
                                                        title="View Complete Details"
                                                        onClick={() => setSelectedInvoice(inv)}
                                                    >
                                                        <Eye size={14} />
                                                        <span>View</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-btn download"
                                                        title="Download Vector PDF"
                                                        onClick={() => handleDownloadPDF(inv)}
                                                    >
                                                        <Download size={14} />
                                                        <span>PDF</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="table-pagination">
                            <div className="pagination-info">
                                Showing {startIndex + 1} to {Math.min(startIndex + PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length} records
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="page-btn"
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    type="button"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, idx, arr) => {
                                        const prev = arr[idx - 1];
                                        return (
                                            <span key={p} style={{ display: "inline-flex" }}>
                                                {prev && p - prev > 1 && <span style={{ padding: "6px" }}>...</span>}
                                                <button
                                                    className={`page-btn ${currentPage === p ? "active" : ""}`}
                                                    onClick={() => setCurrentPage(p)}
                                                    type="button"
                                                >
                                                    {p}
                                                </button>
                                            </span>
                                        );
                                    })}
                                <button
                                    className="page-btn"
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    type="button"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Complete Invoice Detail Modal */}
            {selectedInvoice && (
                <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Invoice Details: {selectedInvoice.invoiceNumber}</h2>
                                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12px" }}>
                                    Generated on {formatDate(selectedInvoice.invoiceDate)} • Status: {selectedInvoice.status}
                                </p>
                            </div>
                            <button
                                className="modal-close-btn"
                                onClick={() => setSelectedInvoice(null)}
                                type="button"
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-meta-grid">
                                <div className="meta-block">
                                    <h4>Seller Company</h4>
                                    <p>{selectedInvoice.companyName}</p>
                                    {selectedInvoice.companyEmail && <small>{selectedInvoice.companyEmail}</small>}
                                    {selectedInvoice.companyGST && <small>GSTIN: {selectedInvoice.companyGST}</small>}
                                </div>
                                <div className="meta-block">
                                    <h4>Billed To (Customer)</h4>
                                    <p>{selectedInvoice.customerName}</p>
                                    {selectedInvoice.customerEmail && <small>{selectedInvoice.customerEmail}</small>}
                                    {selectedInvoice.customerAddress && <small>Address: {selectedInvoice.customerAddress}</small>}
                                    {selectedInvoice.customerGST && <small>GSTIN: {selectedInvoice.customerGST}</small>}
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div>
                                <h4 style={{ margin: "0 0 10px", fontSize: "12px", textTransform: "uppercase", color: "#64748b" }}>
                                    Line Items ({selectedInvoice.items?.length || 0})
                                </h4>
                                <table className="modal-items-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                            <th>GST %</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                                            selectedInvoice.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <strong>{item.productName || item.product_name || "Item"}</strong>
                                                        {item.category && <small style={{ display: "block", color: "#64748b" }}>{item.category}</small>}
                                                    </td>
                                                    <td>{item.quantity || 1}</td>
                                                    <td>{formatMoney(item.sellingPrice || item.price || 0)}</td>
                                                    <td>{item.gst || 0}%</td>
                                                    <td><strong>{formatMoney(item.total || 0)}</strong></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: "center", color: "#94a3b8" }}>
                                                    No itemized records available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className="modal-totals">
                                <div className="totals-row">
                                    <span>Subtotal:</span>
                                    <span>{formatMoney(selectedInvoice.subtotal)}</span>
                                </div>
                                <div className="totals-row">
                                    <span>GST Amount:</span>
                                    <span>{formatMoney(selectedInvoice.gstAmount)}</span>
                                </div>
                                <div className="totals-row grand">
                                    <span>Grand Total:</span>
                                    <span>{formatMoney(selectedInvoice.grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="close-btn"
                                onClick={() => setSelectedInvoice(null)}
                                type="button"
                            >
                                Close
                            </button>
                            <button
                                className="download-pdf-btn"
                                onClick={() => handleDownloadPDF(selectedInvoice)}
                                type="button"
                            >
                                <Download size={16} />
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInvoices;
