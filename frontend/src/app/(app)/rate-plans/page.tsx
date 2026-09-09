'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';

interface RoomType {
  id: string;
  name: string;
  baseRate: string;
}
interface RatePlan {
  id: string;
  roomTypeId: string;
  name: string;
  price: string;
  validFrom: string;
  validTo: string;
}

export default function RatePlansPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const { data: roomTypes } = useFetch(() => api.get<RoomType[]>('/room-types'));
  const { data: plans, loading, error, reload } = useFetch(() => api.get<RatePlan[]>('/rate-plans'));
  const [showForm, setShowForm] = useState(false);

  const roomTypeName = (id: string) => roomTypes?.find((rt) => rt.id === id)?.name ?? '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Rates</h1>
          <p className="text-sm text-stone-500 mt-0.5">Base rate is set per room type. Add dated plans for seasonal or promotional pricing.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900">
            {showForm ? 'Cancel' : '+ New rate plan'}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {roomTypes?.map((rt) => (
          <div key={rt.id} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-sm text-stone-500">{rt.name}</div>
            <div className="text-lg font-semibold text-stone-900 mt-1">£{rt.baseRate}<span className="text-xs font-normal text-stone-400"> base/night</span></div>
          </div>
        ))}
      </div>

      {showForm && roomTypes && <RatePlanForm roomTypes={roomTypes} onCreated={() => { setShowForm(false); reload(); }} />}

      {loading && <p className="text-sm text-stone-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Plan</th>
              <th className="text-left px-4 py-2 font-medium">Room type</th>
              <th className="text-left px-4 py-2 font-medium">Price/night</th>
              <th className="text-left px-4 py-2 font-medium">Valid</th>
              {isAdmin && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {plans?.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-4 py-2.5 font-medium text-stone-800">{p.name}</td>
                <td className="px-4 py-2.5 text-stone-600">{roomTypeName(p.roomTypeId)}</td>
                <td className="px-4 py-2.5 text-stone-600">£{p.price}</td>
                <td className="px-4 py-2.5 text-stone-600">{p.validFrom} → {p.validTo}</td>
                {isAdmin && (
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={async () => {
                        await api.del(`/rate-plans/${p.id}`);
                        reload();
                      }}
                      className="text-xs text-stone-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {plans?.length === 0 && !loading && <p className="text-sm text-stone-400 px-4 py-6">No dated rate plans — base rates apply.</p>}
      </div>
    </div>
  );
}

function RatePlanForm({ roomTypes, onCreated }: { roomTypes: RoomType[]; onCreated: () => void }) {
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? '');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/rate-plans', { roomTypeId, name, price, validFrom, validTo });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create rate plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-4 mb-6 grid gap-3 sm:grid-cols-2">
      {error && <div className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Room type</label>
        <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm">
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Plan name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer 2027" className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Price/night (£)</label>
        <input type="number" min={0} step="0.01" required value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">From</label>
          <input type="date" required value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">To</label>
          <input type="date" required value={validTo} onChange={(e) => setValidTo(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div className="sm:col-span-2">
        <button disabled={busy} className="rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900 disabled:opacity-60">
          {busy ? 'Creating…' : 'Create rate plan'}
        </button>
      </div>
    </form>
  );
}
