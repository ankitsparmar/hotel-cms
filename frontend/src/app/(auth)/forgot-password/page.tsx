'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

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
            <div className="text-xl font-semibold tracking-tight text-gray-900">Forgot password</div>
            <p className="mt-1 text-sm text-gray-500">We&apos;ll email you a link to reset it</p>
          </div>
          {sent ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-gray-700">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a link to reset your password. It expires in 1 hour.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-blue-600 text-white text-sm font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
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
