'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';

interface Reservation {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  source: string;
  guest: { name: string };
  rooms: { room: { roomNumber: string } }[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-600',
  confirmed: 'bg-sky-100 text-sky-800',
  checked_in: 'bg-emerald-100 text-emerald-800',
  checked_out: 'bg-stone-100 text-stone-500',
  cancelled: 'bg-red-50 text-red-500',
  no_show: 'bg-amber-100 text-amber-800',
};

export default function ReservationsPage() {
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch(
    () => api.get<Reservation[]>(`/reservations${status ? `?status=${status}` : ''}`),
    [status],
  );

  async function quickAction(id: string, action: 'check-in' | 'check-out') {
    try {
      await api.patch(`/reservations/${id}/${action}`, action === 'check-in' ? {} : undefined);
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Reservations</h1>
          <p className="text-sm text-stone-500 mt-0.5">Direct bookings and imports from Booking.com.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-stone-300 rounded-md px-2 py-1.5">
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked in</option>
            <option value="checked_out">Checked out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
          <Link href="/reservations/new" className="rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900">
            + New reservation
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-stone-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Guest</th>
              <th className="text-left px-4 py-2 font-medium">Rooms</th>
              <th className="text-left px-4 py-2 font-medium">Dates</th>
              <th className="text-left px-4 py-2 font-medium">Source</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-2.5 font-medium text-stone-800">
                  <Link href={`/reservations/${r.id}`} className="hover:underline">
                    {r.guest?.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-stone-600">{r.rooms.map((rr) => rr.room?.roomNumber).join(', ')}</td>
                <td className="px-4 py-2.5 text-stone-600">{r.checkIn} → {r.checkOut}</td>
                <td className="px-4 py-2.5 text-stone-600 capitalize">{r.source.replace('_', '.')}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>{r.status.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-2">
                  {r.status === 'confirmed' && (
                    <button onClick={() => quickAction(r.id, 'check-in')} className="text-xs text-emerald-700 hover:underline">
                      Check in
                    </button>
                  )}
                  {r.status === 'checked_in' && (
                    <button onClick={() => quickAction(r.id, 'check-out')} className="text-xs text-emerald-700 hover:underline">
                      Check out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && !loading && <p className="text-sm text-stone-400 px-4 py-6">No reservations found.</p>}
      </div>
    </div>
  );
}
