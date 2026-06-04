'use client';

import React from 'react';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="auth-page-container animate-fade-in">
      <div className="auth-card panel animate-slide-up">
        <div className="auth-header">
          <div className="auth-logo">
            <span>H</span>
          </div>
          <h1 className="auth-title">Registration Closed</h1>
          <p className="auth-subtitle">Workspace account creation is disabled for this HANS demo vault.</p>
        </div>

        <div className="alert-error" style={{ padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          Registration is disabled to prevent unauthorized data mutation. Please use one of the pre-seeded demo user accounts to log in.
        </div>

        <div className="auth-form" style={{ gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
            Demo user credentials list is displayed on the main login screen.
          </p>
          <Link href="/login" className="btn btn-primary auth-submit-btn">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
