'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, ApiError, setToken, setStoredUser } from '@/lib/api';
import type { AuthedUser } from '@/lib/auth-context';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ accessToken: string; user: AuthedUser }>('/auth/reset-password', { token, newPassword: password });
      setToken(res.accessToken);
      setStoredUser(res.user);
      setDone(true);
      setTimeout(() => router.push(res.user.role === 'super_admin' ? '/platform' : '/calendar'), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-red-700">
        This reset link is missing its token. Please use the link from your email, or{' '}
        <Link href="/forgot-password" className="underline">
          request a new one
        </Link>
        .
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-gray-700">
        Password updated — signing you in…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-blue-600 text-white text-sm font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blue-800 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2">
          <span className="flex items-center justify-center h-7 w-7 rounded-sm bg-white text-blue-800 font-black text-sm">H</span>
          <span className="font-semibold text-white tracking-tight">Hotel CMS</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="text-xl font-semibold tracking-tight text-gray-900">Reset password</div>
            <p className="mt-1 text-sm text-gray-500">Choose a new password for your account</p>
          </div>
          <Suspense fallback={<div className="text-sm text-gray-400 text-center">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
