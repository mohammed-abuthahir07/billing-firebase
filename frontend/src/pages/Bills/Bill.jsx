import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useReactToPrint } from "react-to-print";
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Eye,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Package,
  User,
  Save,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getProducts } from '../../services/productService';
import { createBill, getBills } from '../../services/billService';
import { getProfile } from '../../services/profileService';
import { getVariantLabel, formatPackLabel } from '../../utils/productVariant';
import { SERVER_ORIGIN } from '../../services/api';
import './Bills.css';

const PAGE_SIZE = 10;

const resolveLogoSrc = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  return `${SERVER_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

const isBusinessLogo = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('dicebear.com')) return false;
  return /\/uploads\/profile\/|\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
};

const waitForImages = (root) => {
  const images = Array.from(root.querySelectorAll('img'));
  if (!images.length) return Promise.resolve();
  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 2500);
        })
    )
  );
};

const toDataUrl = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const inlineImagesForPdf = async (root) => {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      try {
        img.src = await toDataUrl(src);
      } catch {
        // Keep the original src if conversion fails.
      }
    })
  );
};

const buildLineItem = (product) => {
  if (!product) {
    return {
      productId: '',
      productName: '',
      quantity: 1,
      price: 0,
      gst: 0,
      stock: 0,
      packageWeight: '',
      weightUnit: '',
    };
  }

  return {
    productId: product.id,
    productName: getVariantLabel(product),
    quantity: 1,
    price: Number(product.selling_price ?? product.sellingPrice ?? 0),
    gst: Number(product.gst) || 0,
    stock: Number(product.quantity) || 0,
    packageWeight: product.package_weight ?? product.packageWeight ?? '',
    weightUnit: product.weight_unit || product.weightUnit || '',
  };
};

const Bill = () => {
  const { user } = useAuth();
  const printRef = useRef(null);

  // Bills list
  const [invoices, setInvoices] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Available products (from API) for the bill drawer — loaded on demand
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [sellerGST, setSellerGST] = useState("");
  const [businessLogo, setBusinessLogo] = useState(() => {
    const avatar = user?.avatar || "";
    return isBusinessLogo(avatar) ? resolveLogoSrc(avatar) : "";
  });

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stockError, setStockError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // New bill form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  
  // Line item initialization
  const [lineItems, setLineItems] = useState([]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // ── Fetch products for dropdown ────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await getProducts();
      const list = Array.isArray(data) ? data : (data.products || []);
      setAvailableProducts(list);
      return list;
    } catch (err) {
      console.error('Failed to load products', err);
      return [];
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // ── Fetch existing bills ───────────────────────────────────────────────────
  const fetchBills = useCallback(async (nextPage = 1) => {
    setBillsLoading(true);
    setBillsError('');
    try {
      const data = await getBills({ page: nextPage, limit: PAGE_SIZE });
      const list = Array.isArray(data) ? data : (data.bills || data.invoices || []);
      setInvoices(list);
      setPage(data.currentPage || nextPage);
      setTotalPages(data.totalPages || 0);
      setTotalRecords(data.totalRecords ?? data.totalBills ?? list.length);
    } catch (err) {
      if (err.response?.status === 404) {
        setInvoices([]);
        setTotalPages(0);
        setTotalRecords(0);
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load bills.';
        setBillsError(msg);
      }
    } finally {
      setBillsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills(page);
  }, [fetchBills, page]);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((data) => {
        if (cancelled) return;
        const imagePath = data.profile?.profile_image || "";
        const src = resolveLogoSrc(imagePath);
        if (isBusinessLogo(src) || isBusinessLogo(imagePath)) {
          setBusinessLogo(src);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Running totals calculation ─────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const unitPrice = Number(item.price) || 0;
      return sum + unitPrice * (Number(item.quantity) || 0);
    }, 0);

    const gst = lineItems.reduce((sum, item) => {
      const unitPrice = Number(item.price) || 0;
      return sum + (unitPrice * (Number(item.quantity) || 0) * (Number(item.gst) || 0)) / 100;
    }, 0);

    return { subtotal, gst, total: subtotal + gst };
  }, [lineItems]);

  // ── Line item helpers ──────────────────────────────────────────────────────
  const handleAddLineItem = () => {
    if (availableProducts.length === 0) return;
    const selectedIds = new Set(lineItems.map((item) => Number(item.productId)));
    const nextProduct = availableProducts.find((product) => !selectedIds.has(Number(product.id))) || availableProducts[0];
    setLineItems([...lineItems, buildLineItem(nextProduct)]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...lineItems];

    if (field === 'productId') {
      const product = availableProducts.find((p) => String(p.id) === String(value));
      if (product) {
        newItems[index] = buildLineItem(product);
      }
    } else if (field === 'quantity') {
      newItems[index].quantity = value === "" ? "" : parseInt(value, 10);
    }

    setLineItems(newItems);
    setStockError('');
  };

  // ── Open drawer ────────────────────────────────────────────────────────────
  const handleOpenCreateDrawer = async () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerGST('');
    setCustomerAddress('');
    setStockError('');
    setIsDrawerOpen(true);

    const products = (await fetchProducts()) || [];

    if (products.length > 0) {
      setLineItems([buildLineItem(products[0])]);
    } else {
      setLineItems([buildLineItem(null)]);
    }
  };

  // ── Stock validation ───────────────────────────────────────────────────────
  const validateStock = () => {
    const requestedByVariant = {};

    for (const item of lineItems) {
      if (!item.productId) {
        return 'Please select a product variant for every line item.';
      }

      const qty = Number(item.quantity) || 0;
      if (qty <= 0) {
        return 'Quantity must be greater than zero.';
      }

      requestedByVariant[item.productId] = (requestedByVariant[item.productId] || 0) + qty;
    }

    for (const item of lineItems) {
      const requested = requestedByVariant[item.productId];
      if (item.stock !== undefined && item.stock !== null && requested > item.stock) {
        return `Insufficient stock for "${item.productName}". Available: ${item.stock}, Requested: ${requested}`;
      }
    }

    return null;
  };

  // ── Print & PDF Handlers ───────────────────────────────────────────────────
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${selectedInvoice?.invoice_number || selectedInvoice?.bill_number || 'Receipt'}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 12mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-printable-area {
        width: 100%;
        padding: 0;
        margin: 0;
        transform: none !important;
      }
    `
  });

  const handleDownloadPDF = async (inv) => {
    const targetInvoice = inv || selectedInvoice;
    if (!targetInvoice) return;
    try {
      generateInvoicePDF(targetInvoice);
      showToast("Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download failed:", err);
      showToast("Failed to generate PDF.", "error");
    }
  };
  // ── Submit bill payload ─────────────────────────────────────────────────────
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    setStockError('');

    if (!customerName.trim()) return;

    const stockIssue = validateStock();
    if (stockIssue) {
      setStockError(stockIssue);
      return;
    }

    setSubmitting(true);

    const trimmedSellerGST = sellerGST.trim();
    const trimmedCustomerGST = customerGST.trim();

    const payload = {
      sellerName: user?.name,
      sellerEmail: user?.email,
      sellerGST: trimmedSellerGST,

      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || 'customer@example.com',
      customerGST: trimmedCustomerGST,
      customerAddress: customerAddress.trim(),

      products: lineItems.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity)
      }))
    };

    try {
      const data = await createBill(payload);

      const rawInvoice = data.invoice || data || {};
      const newInvoice = {
        ...rawInvoice,
        items: data.items || rawInvoice.items || [],
        sellerGST: rawInvoice.sellerGST || rawInvoice.seller_gst || trimmedSellerGST,
        seller_gst: rawInvoice.seller_gst || rawInvoice.sellerGST || trimmedSellerGST,
        customerGST: rawInvoice.customerGST || rawInvoice.customer_gst || trimmedCustomerGST,
        customer_gst: rawInvoice.customer_gst || rawInvoice.customerGST || trimmedCustomerGST,
      };

      setSelectedInvoice(newInvoice);
      setIsPreviewOpen(true);

      // Wait for preview DOM to paint before PDF capture
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      await handleDownloadPDF(newInvoice);

      setIsPreviewOpen(false);
      showToast("Bill created successfully!");
      setIsDrawerOpen(false);

      await Promise.all([
        page === 1 ? fetchBills(1) : Promise.resolve(),
        fetchProducts()
      ]);
      if (page !== 1) setPage(1);

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to create bill.';
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes('stock') ||
        lowerMsg.includes('insufficient') ||
        lowerMsg.includes('out of stock') ||
        lowerMsg.includes('quantity')
      ) {
        setStockError(`⚠️ ${msg}`);
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };

  // const fmt = (val) => `₹${parseFloat(val || 0).toFixed(2)}`;
  const fmt = useCallback((val)=>{
   return `₹${parseFloat(val || 0).toFixed(2)}`;
},[]);
  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { 
      return dateStr; 
    }
  };

  const getBillStatus = (bill) => bill?.status || 'paid';

  const formatPackSize = (item) => {
    return formatPackLabel(
      item?.weight ?? item?.package_weight ?? item?.packageWeight,
      item?.unit || item?.weight_unit || item?.weightUnit
    );
  };

  const lineGstAmount = (item) => {
    const unitPrice = Number(item.selling_price || item.sellingPrice || item.price || 0);
    const qty = Number(item.quantity || 1);
    const gstPct = Number(item.gst || 0);
    return (unitPrice * qty * gstPct) / 100;
  };

  const pageNumbers = useMemo(() => {
    if (!totalPages) return [];
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  };

  const showPagination = totalRecords > PAGE_SIZE;

  return (
    <div className="bills-container">
      {/* Toast */}
      {toast.show && (
        <div className={`bills-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bills-header animate-slide-up">
        <div className="header-info">
          <p className="page-kicker">
            <Receipt size={14} />
            Invoicing
          </p>
          <h1>Bills &amp; Invoices</h1>
          <p>Generate bills, track revenue, and manage transactions.</p>
        </div>
        <button className="create-bill-btn" onClick={handleOpenCreateDrawer}>
          <Plus size={18} />
          <span>New Invoice</span>
        </button>
      </header>

      {/* Bills List */}
      <section className="bills-card animate-slide-up delay-1">
        {billsLoading && (
          <div className="bills-loading">
            <Loader2 size={32} className="spin-icon" />
            <p>Loading bills...</p>
          </div>
        )}

        {!billsLoading && billsError && (
          <div className="bills-error">
            <AlertTriangle size={28} />
            <p>{billsError}</p>
            <button className="retry-btn" onClick={() => fetchBills(page)}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {!billsLoading && !billsError && (
          <>
          <div className="table-responsive">
            <table className="bills-table saas-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Issued</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th className="action-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? invoices.map((inv, idx) => {
                  const status = getBillStatus(inv);
                  const statusKey = String(status).toLowerCase();
                  return (
                  <tr key={inv.id || idx}>
                    <td>
                      <div className="recipient-meta">
                        <span className="customer-name">{inv.customer_name || inv.customerName || 'N/A'}</span>
                        <span className="customer-email">{inv.customer_email || inv.customerEmail || ''}</span>
                      </div>
                    </td>
                    <td className="date-cell">{fmtDate(inv.created_at || inv.date)}</td>
                    <td className="font-semibold text-primary-color">
                      {fmt(inv.grand_total || inv.total_amount || inv.total)}
                    </td>
                    <td>
                      <span className={`status-badge-table ${statusKey}`}>
                        {statusKey === 'paid' && <CheckCircle size={12} />}
                        {statusKey === 'pending' && <Clock size={12} />}
                        {statusKey === 'unpaid' && <AlertTriangle size={12} />}
                        <span>{status}</span>
                      </span>
                    </td>
                    <td className="action-column">
                      <div className="invoice-actions">
                        <button
                          className="preview-action"
                          onClick={() => handlePreviewInvoice(inv)}
                          title="Preview Invoice"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="empty-table-cell">
                      <Receipt size={40} style={{ opacity: 0.3 }} />
                      <p>No bills yet. Create your first invoice!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {showPagination && (
            <nav className="bills-pagination" aria-label="Invoice pagination">
              <button
                type="button"
                className="bills-page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="bills-page-numbers">
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`bills-page-btn number ${page === num ? 'active' : ''}`}
                    onClick={() => handlePageChange(num)}
                    aria-current={page === num ? 'page' : undefined}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="bills-page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
          </>
        )}
      </section>

      {/* Invoice Creator Drawer — portaled to body so layout transforms don't clip it */}
      {isDrawerOpen && createPortal(
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-topbar">
              <div className="drawer-header">
                <h2>New Invoice</h2>
                <p>Add client details and line items to generate a bill.</p>
              </div>
              <button className="drawer-close" onClick={() => setIsDrawerOpen(false)} type="button" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="drawer-form">
              <div className="drawer-form-scroll">
                {stockError && (
                  <div className="stock-error-banner">
                    <AlertTriangle size={18} />
                    <span>{stockError}</span>
                  </div>
                )}

                <section className="drawer-section">
                  <h3 className="drawer-section-title">Seller &amp; Client</h3>

                  <div className="form-group">
                    <label htmlFor="seller-gst">Seller GST</label>
                    <input
                      id="seller-gst"
                      value={sellerGST}
                      onChange={(e) => setSellerGST(e.target.value)}
                      placeholder="e.g. 22AAAAA0000A1Z5"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="client-name">Client Name <span className="req">*</span></label>
                    <div className="input-with-icon">
                      <User size={16} className="field-icon" />
                      <input
                        id="client-name"
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="client-email">Client Email</label>
                    <input
                      id="client-email"
                      type="email"
                      placeholder="e.g. invoices@acme.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="client-gst">Client GST</label>
                      <input
                        id="client-gst"
                        type="text"
                        placeholder="GSTIN Number"
                        value={customerGST}
                        onChange={(e) => setCustomerGST(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="client-address">Client Address</label>
                      <input
                        id="client-address"
                        type="text"
                        placeholder="Billing address"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="issued-date">Issued Date</label>
                      <input
                        id="issued-date"
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="due-date">Due Date</label>
                      <input
                        id="due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="drawer-section line-items-section">
                  <div className="section-title">
                    <h3>Products</h3>
                    <button
                      type="button"
                      className="add-line-btn"
                      onClick={handleAddLineItem}
                      disabled={availableProducts.length === 0}
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  {productsLoading ? (
                    <div className="products-loading-inline">
                      <Loader2 size={18} className="spin-icon" /> Loading products...
                    </div>
                  ) : availableProducts.length === 0 ? (
                    <div className="no-products-warning">
                      <Package size={16} />
                      <span>
                        No products found. <a href="/products">Add products first.</a>
                      </span>
                    </div>
                  ) : (
                    <div className="line-items-scroll-wrapper">
                      <div className="line-items-table">
                        {lineItems.map((item, idx) => {
                          const unitPrice = Number(item.price) || 0;
                          const total = unitPrice * Number(item.quantity || 0);
                          const packLabel = formatPackLabel(item.packageWeight, item.weightUnit);

                          return (
                            <div className="line-item-row" key={idx}>
                              {item.stock !== undefined && item.stock < item.quantity && (
                                <div className="item-stock-warning">
                                  Only {item.stock} packs in stock
                                </div>
                              )}

                              <div className="line-item-content variant-line-item">
                                <div className="col-product">
                                  <label className="col-label">Product Variant</label>
                                  <select
                                    value={item.productId}
                                    onChange={(e) =>
                                      handleItemChange(idx, "productId", e.target.value)
                                    }
                                    required
                                  >
                                    {availableProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {getVariantLabel(p)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="col-qty">
                                  <label className="col-label">Qty</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9]/g, "");
                                      handleItemChange(idx, "quantity", value);
                                    }}
                                    required
                                  />
                                </div>

                                <div className="col-info">
                                  <label className="col-label">Variant Details</label>
                                  <div className="variant-meta">
                                    <span>Price: ₹{unitPrice.toFixed(2)}</span>
                                    <span>GST: {item.gst}%</span>
                                    <span>Stock: {item.stock}</span>
                                    <span>Pack: {packLabel}</span>
                                  </div>
                                </div>

                                <div className="col-total">
                                  <span className="col-label">Total</span>
                                  <strong>₹{total.toFixed(2)}</strong>
                                </div>

                                <div className="col-action">
                                  <button
                                    type="button"
                                    className="remove-line-btn"
                                    onClick={() => handleRemoveLineItem(idx)}
                                    disabled={lineItems.length === 1}
                                    aria-label="Remove item"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="drawer-footer">
                <div className="breakdown-card">
                  <div className="breakdown-row">
                    <span>Subtotal</span>
                    <span>{fmt(totals.subtotal)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>GST</span>
                    <span>+{fmt(totals.gst)}</span>
                  </div>
                  <div className="breakdown-row final-total">
                    <span>Grand Total</span>
                    <span>{fmt(totals.total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="save-invoice-btn"
                  disabled={submitting || availableProducts.length === 0}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="spin-icon" /> Generating Bill...</>
                  ) : (
                    <><Save size={16} /><span>Generate Bill</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Invoice Preview Modal */}
      {isPreviewOpen && selectedInvoice && createPortal(
        <div className="modal-overlay" onClick={() => setIsPreviewOpen(false)}>
          <div className="receipt-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-actions-top print-hide">
              <button className="print-btn" onClick={handlePrint}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="print-btn" onClick={() => handleDownloadPDF(selectedInvoice)} style={{ marginLeft: '8px' }}>
                <Download size={16} /> Download PDF
              </button>
              <button className="close-btn" onClick={() => setIsPreviewOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="receipt-printable-area" ref={printRef}>
              <div className="inv-sheet">
                <header className="inv-header">
                  <div className="inv-brand">
                    <div className="inv-logo">
                      {businessLogo ? (
                        <img src={businessLogo} alt="" crossOrigin="anonymous" />
                      ) : (
                        "BS"
                      )}
                    </div>
                    <div className="inv-brand-copy">
                      <h1>Billing SaaS</h1>
                      <p>{selectedInvoice.seller_name || selectedInvoice.sellerName || user?.name || 'Business Owner'}</p>
                      <p>{selectedInvoice.seller_email || selectedInvoice.sellerEmail || user?.email || ''}</p>
                      {(selectedInvoice.seller_gst || selectedInvoice.sellerGST) && (
                        <p>GSTIN: {selectedInvoice.seller_gst || selectedInvoice.sellerGST}</p>
                      )}
                    </div>
                  </div>
                  <div className="inv-doc-meta">
                    <h2>INVOICE</h2>
                    <table className="inv-meta-table">
                      <tbody>
                        <tr>
                          <td>Invoice No.</td>
                          <td>{selectedInvoice.invoice_number || selectedInvoice.bill_number || '—'}</td>
                        </tr>
                        <tr>
                          <td>Date</td>
                          <td>{fmtDate(selectedInvoice.created_at || selectedInvoice.date)}</td>
                        </tr>
                        <tr>
                          <td>Status</td>
                          <td>
                            <span className={`inv-status ${getBillStatus(selectedInvoice).toLowerCase()}`}>
                              {String(getBillStatus(selectedInvoice)).toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </header>

                <section className="inv-party-row">
                  <div className="inv-billto">
                    <h3>Bill To</h3>
                    <p className="inv-party-name">
                      {selectedInvoice.customer_name || selectedInvoice.customerName || 'N/A'}
                    </p>
                    <p>{selectedInvoice.customer_email || selectedInvoice.customerEmail || '—'}</p>
                    <p>{selectedInvoice.customer_phone || selectedInvoice.customerPhone || selectedInvoice.mobile || '—'}</p>
                    <p>{selectedInvoice.customer_address || selectedInvoice.customerAddress || '—'}</p>
                    {(selectedInvoice.customer_gst || selectedInvoice.customerGST) && (
                      <p>GSTIN: {selectedInvoice.customer_gst || selectedInvoice.customerGST}</p>
                    )}
                  </div>
                  <div className="inv-billto inv-payinfo">
                    <h3>Payment</h3>
                    <p>Status: {String(getBillStatus(selectedInvoice)).toUpperCase()}</p>
                    <p>Generated: {fmtDate(selectedInvoice.created_at || selectedInvoice.date)}</p>
                  </div>
                </section>

                <table className="inv-items-table">
                  <thead>
                    <tr>
                      <th className="col-sno">S.No</th>
                      <th className="col-name">Product Name</th>
                      <th className="col-pack">Pack Size</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-center">GST %</th>
                      <th className="text-right">GST Amount</th>
                      <th className="text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || selectedInvoice.bill_items || selectedInvoice.products || []).length > 0 ? (
                      (selectedInvoice.items || selectedInvoice.bill_items || selectedInvoice.products || []).map((item, idx) => {
                        const unitPrice = item.selling_price || item.sellingPrice || item.price || 0;
                        const qty = item.quantity || 1;
                        const gstPct = item.gst || 0;
                        const itemTotal = item.total || (unitPrice * qty);

                        return (
                          <tr key={idx}>
                            <td className="col-sno">{idx + 1}</td>
                            <td className="col-name">{item.name || item.product_name || item.productName || 'Item'}</td>
                            <td className="col-pack">{formatPackSize(item)}</td>
                            <td className="text-center">{qty}</td>
                            <td className="text-right">{fmt(unitPrice)}</td>
                            <td className="text-center">{Number(gstPct)}%</td>
                            <td className="text-right">{fmt(lineGstAmount(item))}</td>
                            <td className="text-right col-line-total">{fmt(itemTotal)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="inv-empty-row">No line items</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <section className="inv-bottom">
                  <p className="inv-thanks">Thank you for your business.</p>
                  <table className="inv-totals">
                    <tbody>
                      <tr>
                        <td>Subtotal</td>
                        <td>{fmt(selectedInvoice.subtotal || selectedInvoice.sub_total || totals.subtotal)}</td>
                      </tr>
                      <tr>
                        <td>GST Total</td>
                        <td>{fmt(selectedInvoice.gst || selectedInvoice.gst_amount)}</td>
                      </tr>
                      <tr>
                        <td>Discount</td>
                        <td>{fmt(selectedInvoice.discount || 0)}</td>
                      </tr>
                      <tr className="inv-grand">
                        <td>Grand Total</td>
                        <td>{fmt(selectedInvoice.grand_total || selectedInvoice.total_amount || selectedInvoice.total || totals.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Bill;