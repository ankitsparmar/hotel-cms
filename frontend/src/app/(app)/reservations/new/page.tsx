'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';

interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  status: string;
  roomType?: { name: string };
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function NewReservationPage() {
  const router = useRouter();
  const { data: rooms } = useFetch(() => api.get<Room[]>('/rooms'));

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(toISODate(new Date()));
  const [checkOut, setCheckOut] = useState(toISODate(new Date(Date.now() + 86400000)));
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bookableRooms = (rooms ?? []).filter((r) => r.status !== 'out_of_order');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) {
      setError('Choose a room');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/reservations', {
        guest: { name: guestName, email: guestEmail || undefined, phone: guestPhone || undefined },
        checkIn,
        checkOut,
        rooms: [{ roomId }],
      });
      router.push(`/reservations/${res.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create reservation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">New reservation</h1>
      <p className="text-sm text-gray-500 mb-6">Direct booking — walk-in, phone or email.</p>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Guest</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
            <input type="email" placeholder="Email (optional)" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Stay</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Check-in</label>
              <input type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Check-out</label>
              <input type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Room</h2>
          <select required value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select a room…</option>
            {bookableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber} — {r.roomType?.name} ({r.status})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            The database rejects the booking if this room is already taken for these dates — you don&apos;t need to check availability yourself.
          </p>
        </div>

        <button disabled={busy} className="w-full rounded-md bg-blue-600 text-white text-sm font-medium py-2.5 hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Booking…' : 'Create reservation'}
        </button>
      </form>
    </div>
  );
}
