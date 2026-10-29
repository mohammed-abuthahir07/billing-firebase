import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  X,
  Package,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../services/productService';
import { getProductName, getVariantLabel, formatPackLabel } from '../../utils/productVariant';
import './Products.css';

const PAGE_SIZE = 10;
const PRODUCT_CATEGORIES = [
  'Masala & Spices',
  'Kirana & Groceries',
  'Grains & Pulses',
  'Oils & Ghee',
  'Beverages',
  'Dairy & Dairy Products',
  'Bakery & Confectionery',
  'Snacks & Namkeen',
  'Packaged Foods',
  'Frozen Foods',
  'Organic & Health Food',
  'Fruits & Vegetables',
  'Meat & Seafood',
  'Pharmacy',
  'Personal Care & Hygiene',
  'Beauty & Cosmetics',
  'Baby Care & Products',
  'Cleaning & Housekeeping',
  'Kitchenware',
  'Home Appliances',
  'Home Decor',
  'Furniture',
  'Bed & Bath',
  'Apparel & Clothing',
  'Footwear',
  'Fashion Accessories',
  'Jewelry & Watches',
  'Electronics',
  'Hardware',
  'Tools & Hardware',
  'Electrical Supplies',
  'Plumbing Supplies',
  'Stationery & Office Supplies',
  'School Items',
  'Books & Media',
  'Educational Materials',
  'Sports Equipment',
  'Fitness & Gym',
  'Outdoor & Camping',
  'Toys & Games',
  'Medical & Healthcare',
  'Pharmaceuticals',
  'Supplements & Nutrition',
  'Automotive Parts',
  'Vehicle Accessories',
  'Pet Supplies',
  'Gardening & Lawn Care',
  'Handicrafts & Art',
  'Gifts & Novelties',
  'Packaging Materials',
  'Raw Materials',
  'Industrial Equipment',
  'Safety & Security Gear',
  'Software',
  'Services',
  'Consulting',
  'Other',
];

const EMPTY_FORM = {
  itemName: '',
  category: 'Masala & Spices',
  sku: '',
  description: '',
  gst: '',
  packageWeight: '',
  weightUnit: '',
  sellingPrice: '',
  quantity: '',
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const categories = useMemo(() => {
    const used = [...new Set(
      products.map((product) => product.category).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
    return ['All', ...used];
  }, [products]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProducts();
      const list = Array.isArray(data) ? data : (data.products || []);
      setProducts(list);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load products.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase();
    return products.filter(product => {
      const productName = getVariantLabel(product);
      const productSku = product.sku || '';

      const matchesSearch =
        productName.toLowerCase().includes(query) ||
        productSku.toLowerCase().includes(query);

      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

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

  const showPagination = filteredProducts.length > PAGE_SIZE;

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingProductId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setModalMode('edit');
    setEditingProductId(product.id);
    setFormData({
      itemName: getProductName(product),
      sku: product.sku || '',
      category: product.category || 'Masala & Spices',
      description: product.description || '',
      gst: product.gst !== undefined && product.gst !== null ? product.gst : '',
      packageWeight: product.package_weight ?? product.packageWeight ?? '',
      weightUnit: product.weight_unit || product.weightUnit || '',
      sellingPrice: product.selling_price ?? product.sellingPrice ?? '',
      quantity: product.quantity !== undefined && product.quantity !== null ? product.quantity : '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product variant?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Product variant deleted successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete product.';
      showToast(msg, 'error');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      itemName: formData.itemName.trim(),
      category: formData.category,
      sku: formData.sku.trim() || `PROD-${Math.floor(Math.random() * 100000)}`,
      description: formData.description.trim(),
      gst: parseFloat(formData.gst) || 0,
      packageWeight: parseFloat(formData.packageWeight),
      weightUnit: formData.weightUnit.trim(),
      sellingPrice: parseFloat(formData.sellingPrice),
      quantity: parseInt(formData.quantity, 10) || 0,
    };

    try {
      if (modalMode === 'create') {
        await createProduct(payload);
        showToast('Product variant created successfully!');
      } else {
        await updateProduct(editingProductId, payload);
        showToast('Product variant updated successfully!');
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Operation failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockBadgeClass = (stock) => {
    if (stock === null || stock === undefined) return 'in-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
  };

  const formatPack = (product) => {
    return formatPackLabel(
      product.package_weight ?? product.packageWeight,
      product.weight_unit || product.weightUnit
    );
  };

  const formatPrice = (product) => {
    const price = Number(product.selling_price ?? product.sellingPrice ?? 0);
    return `₹${price.toFixed(2)}`;
  };

  return (
    <div className="products-container">
      {toast.show && (
        <div className={`products-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Package size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <header className="products-header animate-slide-up">
        <div className="header-info">
          <p className="page-kicker">
            <Package size={14} />
            Catalog
          </p>
          <h1>Products &amp; Packed Variants</h1>
          <p>Each pack size is a separate variant with its own price and stock.</p>
        </div>
        <button className="add-product-btn" onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Add Variant</span>
        </button>
      </header>

      <section className="filters-bar animate-slide-up delay-1">
        <div className="search-box">
          {/* <Search size={18} className="search-icon" /> */}
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-filters">
          <Filter size={16} className="filter-icon" />
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="products-card animate-slide-up delay-2">
        {loading && (
          <div className="products-loading">
            <Loader2 size={32} className="spin-icon" />
            <p>Loading products from the database...</p>
          </div>
        )}

        {!loading && error && (
          <div className="products-error">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchProducts}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
          <div className="table-responsive">
            <table className="products-table saas-table">
              <thead>
                <tr>
                  <th>Product Variant</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Pack</th>
                  <th>Price</th>
                  <th>GST</th>
                  <th>Stock</th>
                  <th className="action-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map(prod => (
                    <tr key={prod.id}>
                      <td className="product-info-cell">
                        <div className="prod-avatar">
                          <Package size={18} />
                        </div>
                        <div className="prod-meta">
                          <span className="prod-name">{getVariantLabel(prod)}</span>
                        </div>
                      </td>
                      <td className="font-mono text-sm">{prod.sku || '—'}</td>
                      <td>
                        <span className={`category-badge ${(prod.category || 'other').toLowerCase()}`}>
                          {prod.category || 'Other'}
                        </span>
                      </td>
                      <td>{formatPack(prod)}</td>
                      <td className="price-cell">{formatPrice(prod)}</td>
                      <td>{prod.gst}%</td>
                      <td>
                        <span className={`stock-badge ${getStockBadgeClass(prod.quantity)}`}>
                          {prod.quantity !== undefined && prod.quantity !== null ? prod.quantity : 0}
                          {prod.quantity <= 10 && prod.quantity > 0 && <span className="low-label"> Low</span>}
                          {prod.quantity === 0 && <span className="low-label"> Out</span>}
                        </span>
                      </td>
                      <td className="action-column">
                        <div className="action-buttons">
                          <button
                            className="edit-action"
                            onClick={() => handleOpenEditModal(prod)}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="delete-action"
                            onClick={() => handleDeleteProduct(prod.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-table-cell">
                      <Package size={40} style={{ opacity: 0.3 }} />
                      <p>
                        {products.length === 0
                          ? 'No packed variants yet. Click "Add Variant" to create one.'
                          : 'No products match your search filters.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {showPagination && (
            <nav className="products-pagination" aria-label="Product pagination">
              <button
                type="button"
                className="products-page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="products-page-numbers">
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`products-page-btn number ${page === num ? 'active' : ''}`}
                    onClick={() => handlePageChange(num)}
                    aria-current={page === num ? 'page' : undefined}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="products-page-btn"
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

      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)} type="button" aria-label="Close">
              <X size={18} />
            </button>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Add Packed Variant' : 'Edit Packed Variant'}</h2>
              <p>
                {modalMode === 'create'
                  ? 'Create a pre-packed product with a fixed weight, price, and stock count.'
                  : 'Update this packed variant. Stock count is saved as the new total.'}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="product-name">Product Name <span className="req">*</span></label>
                <input
                  id="product-name"
                  type="text"
                  name="itemName"
                  placeholder="e.g. Sambar Podi"
                  value={formData.itemName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="product-category">Category</label>
                  <select
                    id="product-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option value={category} key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="product-sku">SKU</label>
                  <input
                    id="product-sku"
                    type="text"
                    name="sku"
                    placeholder="e.g. SKU-SP-250"
                    value={formData.sku}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="product-description">Description</label>
                <textarea
                  id="product-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short product description"
                  rows={3}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="product-gst">GST (%) <span className="req">*</span></label>
                  <input
                    id="product-gst"
                    type="number"
                    name="gst"
                    value={formData.gst}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="product-price">Selling Price <span className="req">*</span></label>
                  <input
                    id="product-price"
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="product-weight">Package Weight <span className="req">*</span></label>
                  <input
                    id="product-weight"
                    type="number"
                    name="packageWeight"
                    value={formData.packageWeight}
                    onChange={handleChange}
                    placeholder="e.g. 250"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="product-unit">Weight Unit <span className="req">*</span></label>
                  <input
                    id="product-unit"
                    type="text"
                    name="weightUnit"
                    value={formData.weightUnit}
                    onChange={handleChange}
                    placeholder="e.g. kg, gram, liter"
                    maxLength={20}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="product-qty">Stock Count <span className="req">*</span></label>
                <input
                  id="product-qty"
                  type="number"
                  name="quantity"
                  min="0"
                  placeholder="e.g. 10"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-submit-btn" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 size={16} className="spin-icon" /> Saving...</>
                  ) : (
                    modalMode === 'create' ? 'Create Variant' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Products;
