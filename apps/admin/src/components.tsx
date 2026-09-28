'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { adminGet, getAdminToken, setAdminToken, signInAdmin, type AdminUser } from './api';

const nav = [
  ['/', 'Dashboard'],
  ['/data-sources', 'Data Sources'],
  ['/ingestion-runs', 'Ingestion Runs'],
  ['/brochures', 'Brochures'],
  ['/reviews', 'Review Queue'],
  ['/ingestion-reviews', 'Ingestion Reviews'],
  ['/products', 'Products'],
  ['/retailer-products', 'Retailer Products'],
  ['/prices', 'Prices'],
  ['/promotions', 'Promotions'],
  ['/deals', 'Deals'],
  ['/alerts', 'Alerts'],
  ['/notifications', 'Notifications'],
  ['/audit-logs', 'Audit Logs'],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('admin@market.local');
  const [password, setPassword] = useState('admin-demo');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }
    adminGet<{ user: AdminUser }>('/admin/auth/me')
      .then(result => setUser(result.user))
      .catch(() => setAdminToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try { setUser(await signInAdmin(email, password)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  }

  if (loading) return <div className="auth-screen"><LoadingBlock /></div>;
  if (!user) return (
    <div className="auth-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand">
          <strong>Market Ops</strong>
          <span>internal review</span>
        </div>
        <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <button type="submit">Sign in</button>
        {error ? <div className="empty error">{error}</div> : null}
      </form>
    </div>
  );

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Market Ops</strong>
          <span>internal review</span>
        </div>
        <div className="session-panel">
          <strong>{user.displayName ?? user.email}</strong>
          <span>{user.role}</span>
          <button type="button" onClick={() => { setAdminToken(null); setUser(null); }}>Sign out</button>
        </div>
        <nav>
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="page-header"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</header>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function LoadingBlock() {
  return <div className="empty">Loading…</div>;
}

export function ErrorBlock({ message }: { message: string }) {
  return <div className="empty error">{message}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><span>{label}</span><strong>{children}</strong></div>;
}
