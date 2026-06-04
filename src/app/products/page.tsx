'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Product {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
}

const compressImage = (file: File, maxWidth = 600, maxHeight = 600, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = () => {
      resolve('');
    };
  });
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  // Custom toast notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const router = useRouter();

  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        const res = await fetch('/api/categories');
        if (res.ok && active) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) {
            setFormCategory((prev) => prev || data[0].name);
          }
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
    return () => { active = false; };
  }, [refetchTrigger]);

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (categoryFilter !== 'All') {
          params.append('category', categoryFilter);
        }
        if (search.trim() !== '') {
          params.append('q', search);
        }
        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        if (active) {
          setProducts(data);
        }
      } catch (err: unknown) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred loading products';
          setError(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    return () => { active = false; };
  }, [refetchTrigger, categoryFilter, search, router]);

  const openCreateModal = () => {
    setModalType('create');
    setFormName('');
    setFormCategory(categories.length > 0 ? categories[0].name : 'Uncategorized');
    setFormImageUrl('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalType('edit');
    setActiveProductId(product.id);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormImageUrl(product.image_url || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmitting(true);
      try {
        const compressed = await compressImage(file);
        setFormImageUrl(compressed);
      } catch (err) {
        console.error('Image compression error:', err);
        setFormError('Failed to process image file.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formCategory) {
      setFormError('Name and Category are required.');
      return;
    }

    setSubmitting(true);

    try {
      const url = modalType === 'create' ? '/api/products' : `/api/products/${activeProductId}`;
      const method = modalType === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          image_url: formImageUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setIsModalOpen(false);
      triggerNotification(
        modalType === 'create' ? 'Product registered successfully.' : 'Product updated successfully.',
        'success'
      );
      setRefetchTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteProductId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteProductId) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/products/${deleteProductId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }
      setIsDeleteOpen(false);
      triggerNotification('Product removed from registry successfully.', 'success');
      setRefetchTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting product';
      triggerNotification(errorMessage, 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteProductId(null);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <Navigation />

      <main className="container">
        {/* Header Row */}
        <div className="products-header-row">
          <div>
            <h2 className="products-title">Product Inventory</h2>
            <p className="products-subtitle">Manage and review products registered under HANS workspace</p>
          </div>
          <button onClick={openCreateModal} className="btn btn-primary products-add-btn">
            <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register Product
          </button>
        </div>

        {/* Floating Custom Notification Banner */}
        {notification && (
          <div className={`animate-fade-in ${notification.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {notification.message}
          </div>
        )}

        {/* Filters Panel */}
        <section className="products-filter-section panel">
          <div className="products-search-container">
            <svg className="products-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products by name..."
              className="products-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="products-category-dropdown">
            <label htmlFor="cat-filter" className="products-filter-label">Category Filter</label>
            <select
              id="cat-filter"
              className="form-input form-select products-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Error alert */}
        {error && <div className="alert-error">{error}</div>}

        {/* Products Display (Skeletons vs Grid) */}
        {loading ? (
          <div className="products-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="panel-card products-card skeleton-products-card">
                <div className="skeleton-glow skeleton-image" />
                <div className="products-card-details">
                  <div className="skeleton-glow skeleton-rect skeleton-title" />
                  <div className="skeleton-footer">
                    <div className="skeleton-glow skeleton-rect skeleton-date" />
                    <div className="skeleton-glow skeleton-rect skeleton-action" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="panel animate-fade-in empty-state-panel">
            <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="empty-state-title">No products found</h3>
            <p className="empty-state-text">Add a product to get started in this HANS category view.</p>
            <button onClick={openCreateModal} className="btn btn-primary empty-state-btn">
              Add Product Item
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="panel-card products-card animate-slide-up">
                <div className="products-image-container">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="products-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="products-image-placeholder">
                      <svg className="products-placeholder-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <span className="products-category-badge">{product.category}</span>
                </div>
                <div className="products-card-details">
                  <h3 className="products-card-name">{product.name}</h3>
                  <div className="products-card-footer">
                    <span className="products-date-text">
                      Added {new Date(product.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="products-card-actions">
                      <button
                        onClick={() => openEditModal(product)}
                        className="products-action-btn"
                        title="Edit Product"
                      >
                        <svg className="products-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteDialog(product.id)}
                        className="products-action-btn delete-action-btn"
                        title="Delete Product"
                      >
                        <svg className="products-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content panel animate-slide-up">
            <div className="modal-header">
              <h2 className="modal-title-small">{modalType === 'create' ? 'Register New Product' : 'Modify Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">
                <svg className="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && <div className="alert-error modal-alert-error">{formError}</div>}

            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="prod-name">Product Name</label>
                <input
                  id="prod-name"
                  type="text"
                  placeholder="e.g. Laser Printer"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prod-category">Category</label>
                {categories.length === 0 ? (
                  <div className="modal-warning-box">
                    No categories defined. Please <Link href="/categories" className="auth-link">create a category</Link> first.
                  </div>
                ) : (
                  <select
                    id="prod-category"
                    className="form-input form-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    disabled={submitting}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Upload Image Section */}
              <div className="form-group">
                <label className="form-label">Product Image Source</label>
                <div className="modal-upload-options">
                  <div className="modal-file-input-wrapper">
                    <button type="button" className="btn btn-secondary modal-file-btn">
                      <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Choose / Take Photo
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="modal-real-file-input"
                      onChange={handleImageUpload}
                      disabled={submitting}
                    />
                  </div>
                  
                  <input
                    type="url"
                    placeholder="Or paste an image link (optional)"
                    className="form-input modal-url-input"
                    value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              {formImageUrl && (
                <div className="modal-preview-container">
                  <div className="modal-preview-header">
                    <span className="modal-preview-label">Image Preview</span>
                    <button
                      type="button"
                      className="modal-clear-img-btn"
                      onClick={() => setFormImageUrl('')}
                    >
                      Remove Image
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="modal-preview-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23e11d48" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>';
                    }}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || categories.length === 0}
                >
                  {submitting ? 'Processing...' : modalType === 'create' ? 'Register' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {isDeleteOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content panel animate-slide-up modal-dialog-confirm">
            <div className="modal-header">
              <h2 className="modal-warning-text">Confirm Deletion</h2>
              <button onClick={() => setIsDeleteOpen(false)} className="modal-close-btn">
                <svg className="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="confirm-delete-text">
              Are you sure you want to permanently remove this product from your HANS inventory records?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="btn btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Removing...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
