'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function VerifyEmailStatus() {
  const token = useSearchParams().get('token') ?? '';
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<'checking' | 'done' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    api
      .post<{ verified: boolean; email: string }>('/auth/verify-email', { token })
      .then((res) => {
        setState('done');
        setMessage(`${res.email} is now verified.`);
        if (user) refreshUser().catch(() => {});
      })
      .catch((err) => {
        setState('error');
        setMessage(err instanceof ApiError ? err.message : 'Something went wrong');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state === 'checking') {
    return <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-gray-500">Verifying…</div>;
  }
  if (state === 'error') {
    return <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-red-700">{message}</div>;
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-gray-700">
      <p className="font-medium text-gray-900 mb-1">Email verified</p>
      <p>{message}</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { user } = useAuth();
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
            <div className="text-xl font-semibold tracking-tight text-gray-900">Verify email</div>
          </div>
          <Suspense fallback={<div className="text-sm text-gray-400 text-center">Loading…</div>}>
            <VerifyEmailStatus />
          </Suspense>
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href={user ? (user.role === 'super_admin' ? '/platform' : '/calendar') : '/login'} className="text-blue-600 font-medium hover:underline">
              {user ? 'Back to dashboard' : 'Back to sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
