'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';

interface PropertySummary {
  id: string;
  name: string;
  suspended: boolean;
  createdAt: string;
  userCount: number;
  roomCount: number;
  reservationCount: number;
  owner: { name: string; email: string } | null;
}

interface PlatformStats {
  propertyCount: number;
  suspendedCount: number;
  userCount: number;
  roomCount: number;
  reservationCount: number;
}

export default function PlatformPage() {
  const { data: stats, reload: reloadStats, setData: setStats } = useFetch(() =>
    api.get<PlatformStats>('/platform/stats'),
  );
  const { data: properties, loading, error, reload, setData } = useFetch(() =>
    api.get<PropertySummary[]>('/platform/properties'),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleSuspended(p: PropertySummary) {
    setBusyId(p.id);
    try {
      const updated = await api.patch<PropertySummary>(`/platform/properties/${p.id}`, { suspended: !p.suspended });
      setData((prev) => (prev ? prev.map((row) => (row.id === p.id ? { ...row, ...updated } : row)) : prev));
      setStats((prev) => (prev ? { ...prev, suspendedCount: prev.suspendedCount + (updated.suspended ? 1 : -1) } : prev));
    } catch {
      reload();
      reloadStats();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Platform overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Every property signed up to Hotel CMS.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Properties" value={stats?.propertyCount} />
        <StatCard label="Suspended" value={stats?.suspendedCount} accent={stats && stats.suspendedCount > 0 ? 'warn' : undefined} />
        <StatCard label="Users" value={stats?.userCount} />
        <StatCard label="Rooms" value={stats?.roomCount} />
        <StatCard label="Reservations" value={stats?.reservationCount} />
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Property</th>
              <th className="text-left px-4 py-2 font-medium">Owner</th>
              <th className="text-right px-4 py-2 font-medium">Users</th>
              <th className="text-right px-4 py-2 font-medium">Rooms</th>
              <th className="text-right px-4 py-2 font-medium">Reservations</th>
              <th className="text-left px-4 py-2 font-medium">Signed up</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {properties?.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {p.owner ? (
                    <>
                      {p.owner.name}
                      <div className="text-xs text-gray-400">{p.owner.email}</div>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700">{p.userCount}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{p.roomCount}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{p.reservationCount}</td>
                <td className="px-4 py-2.5 text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.suspended ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {p.suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => toggleSuspended(p)}
                    disabled={busyId === p.id}
                    className={`text-xs rounded-md px-3 py-1.5 font-medium border disabled:opacity-60 ${
                      p.suspended
                        ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                        : 'border-red-300 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {p.suspended ? 'Reinstate' : 'Suspend'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/platform/properties/${p.id}`} className="text-xs font-medium text-blue-700 hover:underline">
                    View users →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {properties?.length === 0 && !loading && (
          <p className="text-sm text-gray-400 px-4 py-6">No properties have signed up yet.</p>
        )}
      </div>

      <ReferralCodesSection />
    </div>
  );
}

interface ReferralCodeRow {
  id: string;
  code: string;
  note: string | null;
  revoked: boolean;
  usedAt: string | null;
  usedByProperty: { id: string; name: string } | null;
  createdAt: string;
}

function ReferralCodesSection() {
  const { data: codes, loading, error, reload } = useFetch(() => api.get<ReferralCodeRow[]>('/platform/referral-codes'));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      await api.post('/platform/referral-codes', { note: note || undefined });
      setNote('');
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create referral code');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.del(`/platform/referral-codes/${id}`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to revoke code');
    } finally {
      setBusyId(null);
    }
  }

  async function copy(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard not available — ignore */
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Referral codes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Signup requires one of these codes. Only a super admin can create them, and each is single-use.</p>
      </div>

      <form onSubmit={createCode} className="flex items-end gap-2 mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. For Acme Hotels"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-64"
          />
        </div>
        <button disabled={busy} className="rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Generating…' : '+ New code'}
        </button>
      </form>

      {actionError && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{actionError}</div>}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Code</th>
              <th className="text-left px-4 py-2 font-medium">Note</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {codes?.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-mono font-medium text-gray-800">
                  {c.code}{' '}
                  <button onClick={() => copy(c.id, c.code)} className="text-xs font-sans text-gray-400 hover:text-blue-700">
                    {copiedId === c.id ? 'Copied' : 'Copy'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{c.note ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5">
                  {c.usedByProperty ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Used by {c.usedByProperty.name}</span>
                  ) : c.revoked ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Revoked</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Unused</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">
                  {!c.usedByProperty && !c.revoked && (
                    <button
                      onClick={() => revoke(c.id)}
                      disabled={busyId === c.id}
                      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes?.length === 0 && !loading && <p className="text-sm text-gray-400 px-4 py-6">No referral codes yet.</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value?: number; accent?: 'warn' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent === 'warn' ? 'text-red-600' : 'text-gray-900'}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}
