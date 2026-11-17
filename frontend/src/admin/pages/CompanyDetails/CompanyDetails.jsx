import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    IndianRupee,
    Loader2,
    Mail,
    Package,
    Receipt,
    RefreshCw,
    User,
} from "lucide-react";
import { getCompany } from "../../services/adminCompanyService";
import "./CompanyDetails.css";

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");
const formatMoney = (value) => `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const CompanyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [salesNotice, setSalesNotice] = useState("");

    const loadCompany = async () => {
        try {
            setLoading(true);
            const data = await getCompany(id);
            setCompany(data.company);
            setRecentInvoices(data.recentInvoices || []);
            setSalesNotice(
                data.salesRecordsBlocked
                    ? "Sales records could not be read. Revenue uses active invoices only, so completely deleted invoices may be missing."
                    : ""
            );
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompany();
    }, [id]);

    const stats = company
        ? [
            { title: "Total Products", value: formatCount(company.totalProducts), hint: "Catalog items", icon: Package, tone: "purple" },
            { title: "Total Invoices", value: formatCount(company.totalInvoices), hint: "Bills generated", icon: Receipt, tone: "amber" },
            { title: "Monthly Revenue", value: formatMoney(company.monthlyRevenue), hint: "This month", icon: Calendar, tone: "blue" },
            { title: "Total Revenue", value: formatMoney(company.totalRevenue), hint: "All-time collections", icon: IndianRupee, tone: "green" },
        ]
        : [];

    return (
        <div className="company-details">
            <header className="details-header">
                <div>
                    <p className="details-kicker">
                        <User size={14} />
                        User profile
                    </p>
                    <h1 className="page-title">Company Details</h1>
                    <p className="details-subtitle">Billing activity and catalog stats for this account.</p>
                </div>
                <div className="details-actions">
                    <button type="button" className="ghost-btn" onClick={() => navigate("/admin/companies")}>
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    <button type="button" className="ghost-btn" onClick={loadCompany} disabled={loading}>
                        {loading ? <Loader2 size={16} className="spin-icon" /> : <RefreshCw size={16} />}
                        Refresh
                    </button>
                </div>
            </header>
            {salesNotice && <p className="details-subtitle">{salesNotice}</p>}

            {loading || !company ? (
                <>
                    <div className="company-card card-skeleton" style={{ minHeight: 120 }} />
                    <div className="stats-grid">
                        {[1, 2, 3, 4].map((item) => (
                            <div className="stat-card card-skeleton" key={item} />
                        ))}
                    </div>
                    <div className="invoice-section card-skeleton" style={{ minHeight: 220 }} />
                </>
            ) : (
                <>
                    <section className="company-card">
                        <div className="company-header">
                            <div className="company-avatar">
                                {(company.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <span className="status-chip">Active account</span>
                                <h2>{company.name}</h2>
                                <p>
                                    <Mail size={16} />
                                    {company.email}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="stats-grid">
                        {stats.map((card, index) => {
                            const Icon = card.icon;
                            return (
                                <article
                                    className={`stat-card tone-${card.tone}`}
                                    key={card.title}
                                    style={{ animationDelay: `${index * 80}ms` }}
                                >
                                    <div className="stat-top">
                                        <h3>{card.title}</h3>
                                        <span className={`stat-icon ${card.tone}`}>
                                            <Icon size={18} />
                                        </span>
                                    </div>
                                    <h2>{card.value}</h2>
                                    <span className="stat-hint">{card.hint}</span>
                                </article>
                            );
                        })}
                    </section>

                    <section className="invoice-section">
                        <div className="invoice-head">
                            <div>
                                <h2>Invoices</h2>
                                <p>Latest 5 bills only. Select a bill to see its line items. This view does not change the company's records.</p>
                            </div>
                            <span className="invoice-count">
                                {Number(company?.totalInvoices) > recentInvoices.length
                                    ? `Latest ${recentInvoices.length} of ${company.totalInvoices}`
                                    : `${recentInvoices.length} records`}
                            </span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Customer</th>
                                    <th>Total</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.length > 0 ? (
                                    recentInvoices.map((invoice, index) => (
                                        <tr
                                            key={invoice.id || invoice.invoice_number}
                                            style={{ animationDelay: `${index * 50}ms`, cursor: "pointer" }}
                                            onClick={() => setSelectedInvoice(invoice)}
                                        >
                                            <td className="invoice-id">{invoice.invoice_number}</td>
                                            <td>{invoice.customer_name}</td>
                                            <td>{formatMoney(invoice.grand_total)}</td>
                                            <td>
                                                {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="empty-row">
                                            No invoices found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                    {selectedInvoice && (
                        <section className="invoice-section" role="dialog" aria-label="Invoice lines">
                            <div className="invoice-head">
                                <div>
                                    <h2>{selectedInvoice.invoice_number}</h2>
                                    <p>{selectedInvoice.customer_name} · {formatMoney(selectedInvoice.grand_total)}</p>
                                </div>
                                <button type="button" className="back-btn" onClick={() => setSelectedInvoice(null)}>Close</button>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>GST</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedInvoice.items || []).length > 0 ? selectedInvoice.items.map((item, index) => (
                                        <tr key={`${item.productId || item.product_id || index}`}>
                                            <td>{item.product_name || item.productName || "Item"}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.sellingPrice || item.price}</td>
                                            <td>{item.gst}%</td>
                                            <td>{item.total}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="empty-row">No line items stored on this invoice.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

export default CompanyDetails;
