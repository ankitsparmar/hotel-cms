'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';

interface Me {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  active: boolean;
  emailVerified: boolean;
  propertyId: string | null;
  propertyName: string | null;
  createdAt: string;
}

// Shared "my account" page for every role, including the super admin — the
// (app) and (platform) route groups each render this inside their own
// layout/chrome. Covers viewing account info, editing name/username/email,
// resending the verification email, and changing password.
export function ProfileForm() {
  const { data: me, loading, reload, setData } = useFetch(() => api.get<Me>('/me'));

  if (loading || !me) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <AccountSection me={me} onSaved={(updated) => setData(updated)} onReload={reload} />
      <PasswordSection />
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-0.5 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

function AccountSection({ me, onSaved, onReload }: { me: Me; onSaved: (m: Me) => void; onReload: () => void }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username ?? '');
  const [email, setEmail] = useState(me.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const emailChanged = email.toLowerCase() !== me.email.toLowerCase();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.patch<Me>('/me', { name, username: username.trim() || undefined, email });
      onSaved(updated);
      await refreshUser();
      setNotice(emailChanged ? 'Saved. Check your new email address for a verification link.' : 'Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    setError(null);
    try {
      await api.post('/auth/resend-verification');
      setNotice('Verification email sent.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send verification email');
    } finally {
      setResending(false);
      onReload();
    }
  }

  return (
    <Section title="Account" description="Your name, sign-in details, and where you work.">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        {error && <div className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        {notice && <div className="sm:col-span-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{notice}</div>}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. jane-owner"
            pattern="[a-zA-Z0-9_.-]{3,32}"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">Sign in with this instead of your email.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            {me.emailVerified && !emailChanged ? (
              <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">Verified</span>
            ) : (
              <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap">Unverified</span>
            )}
          </div>
          {!me.emailVerified && !emailChanged && (
            <button
              type="button"
              onClick={resendVerification}
              disabled={resending}
              className="mt-1.5 text-xs text-blue-600 hover:underline disabled:opacity-60"
            >
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <p className="text-sm text-gray-700 capitalize py-1.5">{me.role.replace('_', ' ')}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{me.propertyId ? 'Property' : 'Scope'}</label>
          <p className="text-sm text-gray-700 py-1.5">{me.propertyName ?? 'Platform (all properties)'}</p>
        </div>

        <div className="sm:col-span-2">
          <button disabled={busy} className="rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.post('/me/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Password" description="Choose a new password. You'll need your current one to confirm.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        {error && <div className="sm:col-span-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        {saved && <div className="sm:col-span-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">Password updated.</div>}
        <input
          type="password"
          required
          placeholder="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button disabled={busy} className="sm:col-span-3 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-60 w-fit">
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </Section>
  );
}
