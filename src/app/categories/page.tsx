'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  // Custom toast notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
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
        setLoading(true);
        setError('');
        const res = await fetch('/api/categories');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to load categories');
        const data = await res.json();
        if (active) {
          setCategories(data);
        }
      } catch (err: unknown) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred loading categories';
          setError(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCategories();
    return () => {
      active = false;
    };
  }, [refetchTrigger, router]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!newCatName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setNewCatName('');
      triggerNotification('Category created successfully.', 'success');
      setRefetchTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim()) {
      setEditError('Category name cannot be empty.');
      return;
    }

    setEditSubmitting(true);

    try {
      const res = await fetch(`/api/categories/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setEditId(null);
      setEditName('');
      triggerNotification('Category renamed successfully.', 'success');
      setRefetchTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setEditError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDeleteDialog = (category: Category) => {
    setDeleteId(category.id);
    setDeleteName(category.name);
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }
      setDeleteId(null);
      setDeleteName('');
      triggerNotification('Category deleted. Associated products moved to Uncategorized.', 'success');
      setRefetchTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting category';
      triggerNotification(errorMessage, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <Navigation />

      <main className="container">
        <div className="products-header-row">
          <div>
            <h2 className="products-title">Category Management</h2>
            <p className="products-subtitle">Define and organize product categories in HANS workspace</p>
          </div>
        </div>

        {/* Floating Custom Notification Banner */}
        {notification && (
          <div className={`animate-fade-in ${notification.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {notification.message}
          </div>
        )}

        <div className="categories-split-layout">
          {/* Create Category Panel */}
          <section className="categories-left-panel panel">
            <h3 className="categories-panel-title">Create New Category</h3>
            {formError && <div className="alert-error modal-alert-error">{formError}</div>}
            <form onSubmit={handleCreateCategory} className="modal-form categories-create-form">
              <div className="form-group">
                <label className="form-label" htmlFor="cat-name">Category Name</label>
                <input
                  id="cat-name"
                  type="text"
                  placeholder="e.g. Office Supplies"
                  className="form-input"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary categories-create-btn"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Add Category'}
              </button>
            </form>
          </section>

          {/* Categories List Panel */}
          <section className="categories-right-panel panel">
            <h3 className="categories-panel-title">Existing Categories ({categories.length})</h3>
            
            {error && <div className="alert-error modal-alert-error">{error}</div>}

            {loading ? (
              <div className="skeleton-categories-list">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-glow skeleton-rect skeleton-categories-item" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="empty-state-panel">
                <p className="empty-state-text">No categories defined. Use the creation form to register new tags.</p>
              </div>
            ) : (
              <div className="categories-list categories-list-container">
                {categories.map((cat) => {
                  const isEditing = editId === cat.id;
                  const isUncategorized = cat.name.toLowerCase() === 'uncategorized';

                  return (
                    <div key={cat.id} className="categories-item animate-slide-up">
                      {isEditing ? (
                        <form onSubmit={handleEditCategory} className="categories-edit-form">
                          <input
                            type="text"
                            className="form-input categories-edit-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={editSubmitting}
                            required
                            autoFocus
                          />
                          <div className="categories-edit-actions">
                            <button
                              type="submit"
                              className="btn btn-primary btn-ghost categories-edit-actions-btn"
                              disabled={editSubmitting}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-ghost categories-edit-actions-btn"
                              onClick={() => setEditId(null)}
                              disabled={editSubmitting}
                            >
                              Cancel
                            </button>
                          </div>
                          {editError && <div className="alert-error categories-edit-error">{editError}</div>}
                        </form>
                      ) : (
                        <>
                          <div className="categories-details">
                            <span className="categories-name">{cat.name}</span>
                            {isUncategorized && <span className="categories-system-badge">System Default</span>}
                          </div>
                          {!isUncategorized && (
                            <div className="categories-actions">
                              <button
                                onClick={() => {
                                  setEditId(cat.id);
                                  setEditName(cat.name);
                                  setEditError('');
                                }}
                                className="products-action-btn"
                                title="Rename Category"
                              >
                                <svg className="categories-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openDeleteDialog(cat)}
                                className="products-action-btn"
                                style={{ color: 'var(--danger)' }}
                                title="Delete Category"
                              >
                                <svg className="categories-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* CONFIRM DELETE DIALOG */}
      {deleteId && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content panel animate-slide-up modal-dialog-small">
            <div className="modal-header">
              <h2 className="modal-warning-text">Delete Category</h2>
              <button onClick={() => setDeleteId(null)} className="modal-close-btn">
                <svg className="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="delete-text">
              Are you sure you want to remove the category <strong>&quot;{deleteName}&quot;</strong>?
            </p>
            <div className="modal-warning-box">
              <strong>Warning:</strong> Any products referencing this category will automatically be moved to the <strong>&quot;Uncategorized&quot;</strong> default pool. No products will be deleted.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="btn btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
