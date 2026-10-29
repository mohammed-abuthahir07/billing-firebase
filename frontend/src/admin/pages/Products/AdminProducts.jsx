import { useEffect, useState, useMemo } from "react";
import {
    Package,
    Search,
    Eye,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Boxes,
    Building2,
    Tag,
    IndianRupee,
    Loader2,
    X,
} from "lucide-react";
import { getAdminProducts } from "../../services/adminProductService";
import "./AdminProducts.css";

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

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [companiesList, setCompaniesList] = useState([]);
    const [categoriesList, setCategoriesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters
    const [search, setSearch] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [stockFilter, setStockFilter] = useState("all"); // "all" | "instock" | "lowstock" | "outofstock"
    const [sortBy, setSortBy] = useState("name"); // "name" | "price_desc" | "price_asc" | "qty_asc" | "qty_desc"

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Detail Modal
    const [selectedProduct, setSelectedProduct] = useState(null);

    const loadProducts = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getAdminProducts();
            setProducts(data.products || []);
            setCompaniesList(data.companiesList || []);
            setCategoriesList(data.categoriesList || []);
        } catch (err) {
            console.error("Failed to load products:", err);
            setError(err.message || "Failed to load products.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    // Filter & Sort Logic
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Search
        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (p) =>
                    p.productName.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q) ||
                    p.companyName.toLowerCase().includes(q)
            );
        }

        // Company filter
        if (selectedCompany !== "all") {
            result = result.filter((p) => p.userId === selectedCompany);
        }

        // Category filter
        if (selectedCategory !== "all") {
            result = result.filter((p) => p.category === selectedCategory);
        }

        // Stock status filter
        if (stockFilter === "instock") {
            result = result.filter((p) => p.stockStatus === "In Stock");
        } else if (stockFilter === "lowstock") {
            result = result.filter((p) => p.stockStatus === "Low Stock");
        } else if (stockFilter === "outofstock") {
            result = result.filter((p) => p.stockStatus === "Out of Stock");
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === "name") return a.productName.localeCompare(b.productName);
            if (sortBy === "price_desc") return b.sellingPrice - a.sellingPrice;
            if (sortBy === "price_asc") return a.sellingPrice - b.sellingPrice;
            if (sortBy === "qty_desc") return b.quantity - a.quantity;
            if (sortBy === "qty_asc") return a.quantity - b.quantity;
            return 0;
        });

        return result;
    }, [products, search, selectedCompany, selectedCategory, stockFilter, sortBy]);

    // KPI Metrics
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockCount = products.filter((p) => p.stockStatus === "Low Stock").length;
    const outOfStockCount = products.filter((p) => p.stockStatus === "Out of Stock").length;

    // Pagination calculations
    const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);

    const handleClearFilters = () => {
        setSearch("");
        setSelectedCompany("all");
        setSelectedCategory("all");
        setStockFilter("all");
        setSortBy("name");
        setCurrentPage(1);
    };

    return (
        <div className="admin-products-page">
            {/* Header */}
            <div className="products-header">
                <div>
                    <p className="products-kicker">
                        <Package size={14} />
                        PLATFORM CATALOG
                    </p>
                    <h1 className="products-title">Product Overview</h1>
                    <p className="products-subtitle">
                        Cross-company inventory, catalog items, pricing, and stock health monitor.
                    </p>
                </div>
                <div className="invoices-actions">
                    <button
                        className="refresh-btn"
                        onClick={loadProducts}
                        disabled={loading}
                        type="button"
                    >
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="products-kpi-grid">
                <div className="kpi-card blue">
                    <div className="kpi-top">
                        <span className="kpi-label">Total Listed Products</span>
                        <div className="kpi-icon"><Package size={19} /></div>
                    </div>
                    <div className="kpi-value">{totalProducts.toLocaleString("en-IN")}</div>
                    <span className="kpi-hint">Distinct catalog variants</span>
                </div>

                <div className="kpi-card emerald">
                    <div className="kpi-top">
                        <span className="kpi-label">Total Available Stock</span>
                        <div className="kpi-icon"><Boxes size={19} /></div>
                    </div>
                    <div className="kpi-value">{totalStock.toLocaleString("en-IN")} units</div>
                    <span className="kpi-hint">Across all active inventories</span>
                </div>

                <div className="kpi-card amber">
                    <div className="kpi-top">
                        <span className="kpi-label">Low Stock Alerts</span>
                        <div className="kpi-icon"><AlertTriangle size={19} /></div>
                    </div>
                    <div className="kpi-value">{lowStockCount.toLocaleString("en-IN")}</div>
                    <span className="kpi-hint">5 units or fewer remaining</span>
                </div>

                <div className="kpi-card purple">
                    <div className="kpi-top">
                        <span className="kpi-label">Out of Stock Items</span>
                        <div className="kpi-icon"><XCircle size={19} /></div>
                    </div>
                    <div className="kpi-value">{outOfStockCount.toLocaleString("en-IN")}</div>
                    <span className="kpi-hint">Requires vendor replenishment</span>
                </div>
            </div>

            {/* Toolbar & Filters */}
            <div className="invoices-toolbar">
                <div className="toolbar-left">
                    <div className="search-input-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search product, SKU, company..."
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
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="all">All Categories</option>
                        {categoriesList.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={stockFilter}
                        onChange={(e) => {
                            setStockFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="all">All Stock Statuses</option>
                        <option value="instock">In Stock (&gt; 5)</option>
                        <option value="lowstock">Low Stock (1 - 5)</option>
                        <option value="outofstock">Out of Stock (0)</option>
                    </select>

                    <select
                        className="filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="name">Sort: Name (A-Z)</option>
                        <option value="price_desc">Sort: Price (High to Low)</option>
                        <option value="price_asc">Sort: Price (Low to High)</option>
                        <option value="qty_desc">Sort: Stock (High to Low)</option>
                        <option value="qty_asc">Sort: Stock (Low to High)</option>
                    </select>
                </div>

                <div className="toolbar-right">
                    <span className="results-count">
                        {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                    </span>
                    {(search || selectedCompany !== "all" || selectedCategory !== "all" || stockFilter !== "all" || sortBy !== "name") && (
                        <button className="clear-filters-btn" onClick={handleClearFilters} type="button">
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="products-table-card">
                {loading ? (
                    <div className="table-state">
                        <Loader2 size={32} className="spin" />
                        <h3>Loading catalog products...</h3>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="table-state">
                        <Package size={40} style={{ color: "#94a3b8" }} />
                        <h3>No products found</h3>
                        <p>No products match your current search or filter criteria.</p>
                    </div>
                ) : (
                    <>
                        <div className="products-table-container">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>Company</th>
                                        <th>SKU</th>
                                        <th>Category</th>
                                        <th>Selling Price</th>
                                        <th>GST %</th>
                                        <th>Available Qty</th>
                                        <th>Stock Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedProducts.map((p) => {
                                        const statusCls = p.stockStatus === "In Stock" ? "instock" : p.stockStatus === "Low Stock" ? "lowstock" : "outofstock";
                                        const qtyCls = p.quantity <= 0 ? "danger" : p.quantity <= 5 ? "warning" : "safe";

                                        return (
                                            <tr key={`${p.userId}_${p.id}`}>
                                                <td className="product-name-cell">
                                                    <div>{p.productName}</div>
                                                    {p.packageWeight && (
                                                        <small style={{ color: "#64748b", fontSize: "11px" }}>
                                                            {p.packageWeight} {p.weightUnit}
                                                        </small>
                                                    )}
                                                </td>
                                                <td className="company-cell">{p.companyName}</td>
                                                <td><span className="sku-pill">{p.sku}</span></td>
                                                <td><span className="category-pill">{p.category}</span></td>
                                                <td style={{ fontWeight: 700 }}>{formatMoney(p.sellingPrice)}</td>
                                                <td>{p.gst}%</td>
                                                <td>
                                                    <span className={`qty-val ${qtyCls}`}>
                                                        {p.quantity.toLocaleString("en-IN")}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`stock-badge ${statusCls}`}>
                                                        {p.stockStatus === "In Stock" && <CheckCircle2 size={11} />}
                                                        {p.stockStatus === "Low Stock" && <AlertTriangle size={11} />}
                                                        {p.stockStatus === "Out of Stock" && <XCircle size={11} />}
                                                        {p.stockStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="action-btn view"
                                                        title="View Product Specifications"
                                                        onClick={() => setSelectedProduct(p)}
                                                    >
                                                        <Eye size={14} />
                                                        <span>View</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="table-pagination">
                            <div className="pagination-info">
                                Showing {startIndex + 1} to {Math.min(startIndex + PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length} items
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

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{selectedProduct.productName}</h2>
                                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12px" }}>
                                    Owner: {selectedProduct.companyName} • SKU: {selectedProduct.sku}
                                </p>
                            </div>
                            <button
                                className="modal-close-btn"
                                onClick={() => setSelectedProduct(null)}
                                type="button"
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-meta-grid">
                                <div className="meta-block">
                                    <h4>Catalog Information</h4>
                                    <p>{selectedProduct.productName}</p>
                                    <small>Category: {selectedProduct.category}</small>
                                    <small>Package: {selectedProduct.packageWeight} {selectedProduct.weightUnit || ""}</small>
                                </div>
                                <div className="meta-block">
                                    <h4>Inventory &amp; Pricing</h4>
                                    <p>Selling Price: {formatMoney(selectedProduct.sellingPrice)}</p>
                                    <small>Applicable GST: {selectedProduct.gst}%</small>
                                    <small>Current Stock: {selectedProduct.quantity} units ({selectedProduct.stockStatus})</small>
                                </div>
                            </div>

                            {selectedProduct.description && (
                                <div>
                                    <h4 style={{ margin: "0 0 6px", fontSize: "12px", textTransform: "uppercase", color: "#64748b" }}>
                                        Description / Product Details
                                    </h4>
                                    <p style={{ margin: 0, fontSize: "13.5px", color: "#334155", background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", lineHeight: "1.6" }}>
                                        {selectedProduct.description}
                                    </p>
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                                <span>Created: {formatDate(selectedProduct.createdAt)}</span>
                                <span>Last Updated: {formatDate(selectedProduct.updatedAt)}</span>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="close-btn"
                                onClick={() => setSelectedProduct(null)}
                                type="button"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
