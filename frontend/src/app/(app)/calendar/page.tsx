'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';

interface Booking {
  reservationId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  source: string;
  guestName: string;
}
interface CalendarRoom {
  roomId: string;
  roomNumber: string;
  roomTypeName?: string;
  status: string;
  bookings: Booking[];
}

const DAYS = 14;

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export default function CalendarPage() {
  const [start, setStart] = useState(() => toISODate(new Date()));
  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const end = addDays(start, DAYS);

  const { data: rooms, loading, error } = useFetch(() => api.get<CalendarRoom[]>(`/calendar?from=${start}&to=${end}`), [start]);

  function bookingFor(room: CalendarRoom, date: string): Booking | undefined {
    return room.bookings.find((b) => b.checkIn <= date && date < b.checkOut);
  }

  function cellClasses(room: CalendarRoom, date: string) {
    if (room.status === 'out_of_order') return 'bg-red-50 text-red-400';
    const booking = bookingFor(room, date);
    if (!booking) return 'bg-white hover:bg-gray-50';
    if (booking.status === 'checked_out' || booking.status === 'cancelled') return 'bg-gray-50 text-gray-300';
    if (booking.source === 'booking_com') return 'bg-purple-100 text-purple-800';
    if (booking.status === 'checked_in') return 'bg-blue-100 text-blue-800';
    return 'bg-sky-100 text-sky-800'; // confirmed, direct
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Occupancy calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rooms and bookings for the next two weeks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStart(addDays(start, -7))} className="text-sm border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50">
            ← Prev week
          </button>
          <button onClick={() => setStart(toISODate(new Date()))} className="text-sm border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50">
            Today
          </button>
          <button onClick={() => setStart(addDays(start, 7))} className="text-sm border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50">
            Next week →
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 flex-wrap">
        <LegendDot className="bg-sky-100" label="Confirmed (direct)" />
        <LegendDot className="bg-blue-100" label="Checked in" />
        <LegendDot className="bg-purple-100" label="Booking.com" />
        <LegendDot className="bg-red-50" label="Out of order" />
        <LegendDot className="bg-gray-50" label="Checked out / cancelled" />
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="text-sm border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-200 z-10">Room</th>
              {dates.map((d) => (
                <th key={d} className="px-2 py-2 text-xs font-medium text-gray-500 border-b border-l border-gray-100 whitespace-nowrap">
                  {new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms?.map((room) => (
              <tr key={room.roomId}>
                <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-800 border-b border-gray-100 whitespace-nowrap z-10">
                  {room.roomNumber}
                  <div className="text-xs font-normal text-gray-400">{room.roomTypeName}</div>
                </td>
                {dates.map((date) => {
                  const booking = bookingFor(room, date);
                  const cell = (
                    <div className={`h-10 flex items-center justify-center text-xs truncate px-1 ${cellClasses(room, date)}`} title={booking?.guestName}>
                      {booking ? booking.guestName.split(' ')[0] : ''}
                    </div>
                  );
                  return (
                    <td key={date} className="border-b border-l border-gray-100 p-0">
                      {booking ? <Link href={`/reservations/${booking.reservationId}`}>{cell}</Link> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rooms?.length === 0 && !loading && <p className="text-sm text-gray-400 px-4 py-6">No rooms yet — add some under Room Types &amp; Rooms.</p>}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm border border-gray-200 ${className}`} />
      {label}
    </span>
  );
}
