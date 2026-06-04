'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Product {
  id: string;
  name: string;
  category: string;
  created_at: string;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refetchTrigger] = useState(0);
  
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const fetchDashboardData = async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        setLoading(true);
        setError('');
        
        const prodRes = await fetch('/api/products');
        if (prodRes.status === 401) {
          router.push('/login');
          return;
        }
        
        const catRes = await fetch('/api/categories');
        if (catRes.status === 401) {
          router.push('/login');
          return;
        }

        if (!prodRes.ok || !catRes.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const productsData = await prodRes.json();
        const categoriesData = await catRes.json();
        
        if (active) {
          setProducts(productsData);
          setCategories(categoriesData);
        }
      } catch (err: unknown) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred fetching stats';
          setError(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      active = false;
    };
  }, [refetchTrigger, router]);

  const totalProducts = products.length;
  const totalCategories = categories.length;
  const recentProducts = products.slice(0, 5);

  return (
    <div className="dashboard-container animate-fade-in">
      <Navigation />

      <main className="container">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <h2 className="dashboard-title">Welcome to HANS Workspace</h2>
          <p className="dashboard-subtitle">Professional inventory registry & category organization workspace</p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* Loading Skeletons */}
        {loading ? (
          <>
            <section className="dashboard-metrics-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="dashboard-metric-card panel skeleton-dashboard-card">
                  <div className="skeleton-glow skeleton-rect" style={{ width: '100px', height: '16px' }} />
                  <div className="skeleton-glow skeleton-rect" style={{ width: '60px', height: '36px', marginTop: '12px' }} />
                  <div className="skeleton-glow skeleton-rect" style={{ width: '140px', height: '12px', marginTop: '8px' }} />
                </div>
              ))}
            </section>
            
            <div className="dashboard-overview-grid">
              <div className="panel dashboard-action-panel">
                <div className="skeleton-glow skeleton-rect" style={{ width: '180px', height: '20px' }} />
                <div className="skeleton-dashboard-overview">
                  <div className="skeleton-glow skeleton-rect" style={{ height: '76px', borderRadius: '10px' }} />
                  <div className="skeleton-glow skeleton-rect" style={{ height: '76px', borderRadius: '10px' }} />
                </div>
              </div>
              <div className="panel dashboard-list-panel">
                <div className="skeleton-glow skeleton-rect" style={{ width: '160px', height: '20px' }} />
                <div className="skeleton-dashboard-list">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="skeleton-dashboard-list-item">
                      <div className="skeleton-glow skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton-glow skeleton-rect" style={{ width: '120px', height: '14px' }} />
                        <div className="skeleton-glow skeleton-rect" style={{ width: '70px', height: '10px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Core Metrics Grid */}
            <section className="dashboard-metrics-grid">
              <div className="dashboard-metric-card panel">
                <div className="dashboard-metric-header">
                  <span className="dashboard-metric-title">Active Inventory</span>
                  <div className="dashboard-icon-wrapper metric-icon-primary">
                    <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <span className="dashboard-metric-value">{totalProducts}</span>
                <span className="dashboard-metric-desc">Total registered products</span>
              </div>

              <div className="dashboard-metric-card panel">
                <div className="dashboard-metric-header">
                  <span className="dashboard-metric-title">Dynamic Categories</span>
                  <div className="dashboard-icon-wrapper metric-icon-accent">
                    <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </div>
                </div>
                <span className="dashboard-metric-value">{totalCategories}</span>
                <span className="dashboard-metric-desc">Active categories managed by user</span>
              </div>

              <div className="dashboard-metric-card panel">
                <div className="dashboard-metric-header">
                  <span className="dashboard-metric-title">Latest Entry</span>
                  <div className="dashboard-icon-wrapper metric-icon-success">
                    <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                {recentProducts.length > 0 ? (
                  <div className="dashboard-latest-container">
                    <span className="dashboard-latest-name">{recentProducts[0].name}</span>
                    <span className="dashboard-latest-cat">{recentProducts[0].category}</span>
                  </div>
                ) : (
                  <span className="dashboard-metric-desc metric-desc-italic">No items registered</span>
                )}
              </div>
            </section>

            {/* Split Overview Layout */}
            <div className="dashboard-overview-grid">
              {/* Quick Actions Panel */}
              <section className="panel dashboard-action-panel">
                <h3 className="dashboard-panel-title">Quick Workspace Actions</h3>
                <div className="dashboard-action-container">
                  <Link href="/products" className="dashboard-action-card panel-card">
                    <div className="dashboard-action-icon-wrapper metric-icon-primary">
                      <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="dashboard-action-title">Manage Products</h4>
                      <p className="dashboard-action-desc">Review and create inventory items with custom camera uploads</p>
                    </div>
                  </Link>

                  <Link href="/categories" className="dashboard-action-card panel-card">
                    <div className="dashboard-action-icon-wrapper metric-icon-accent">
                      <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="dashboard-action-title">Manage Categories</h4>
                      <p className="dashboard-action-desc">Add, edit, or delete dynamic categories. Safety cascade updates matching items.</p>
                    </div>
                  </Link>
                </div>
              </section>

              {/* Recent Registrations List */}
              <section className="panel dashboard-list-panel">
                <h3 className="dashboard-panel-title">Recent Registrations</h3>
                {recentProducts.length === 0 ? (
                  <div className="empty-state-panel">
                    <p className="empty-state-text">No products registered yet in the HANS vault.</p>
                    <Link href="/products" className="btn btn-primary empty-state-btn">
                      Register Your First Product
                    </Link>
                  </div>
                ) : (
                  <div className="dashboard-recent-list">
                    {recentProducts.map((p) => (
                      <div key={p.id} className="dashboard-list-item">
                        <div className="dashboard-list-item-left">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt={p.name} className="dashboard-list-item-img" />
                          ) : (
                            <div className="dashboard-list-item-placeholder">
                              <svg className="btn-icon text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="dashboard-list-item-meta">
                            <span className="dashboard-list-item-name">{p.name}</span>
                            <span className="dashboard-list-item-cat">{p.category}</span>
                          </div>
                        </div>
                        <span className="dashboard-list-item-date">
                          {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
