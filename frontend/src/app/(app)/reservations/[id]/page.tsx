'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency';
import { useFetch } from '@/lib/use-fetch';

interface ReservationRoom {
  id: string;
  roomId: string;
  priceAtBooking: string;
  checkIn: string;
  checkOut: string;
  room: { roomNumber: string; roomTypeId: string };
}
interface Reservation {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  source: string;
  paymentViaOta: boolean;
  externalRef?: string;
  statusHistory: { status: string; at: string; by?: string; note?: string }[];
  guest: { name: string; email?: string; phone?: string };
  rooms: ReservationRoom[];
}
interface Payment {
  id: string;
  amount: string;
  method: string;
  status: string;
  createdAt: string;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  total: string;
  isCreditNote: boolean;
  issuedAt: string;
  lineItems: { description: string; quantity: number; unitPrice: string; total: string }[];
}

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const canAct = ['owner', 'admin', 'front_desk'].includes(user?.role ?? '');

  const { data: reservation, loading, error, reload } = useFetch(() => api.get<Reservation>(`/reservations/${id}`), [id]);
  const { data: payments, reload: reloadPayments } = useFetch(() => api.get<Payment[]>(`/reservations/${id}/payments`), [id]);
  const { data: invoices, reload: reloadInvoices } = useFetch(() => api.get<Invoice[]>(`/reservations/${id}/invoices`), [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function checkIn(override = false) {
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/reservations/${id}/check-in`, { override });
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && !override) {
        if (window.confirm(`${err.message}\n\nOverride and check in anyway? This will be logged.`)) {
          return checkIn(true);
        }
      } else {
        setActionError(err instanceof ApiError ? err.message : 'Check-in failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/reservations/${id}/check-out`);
      reload();
      reloadInvoices();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Check-out failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm('Cancel this reservation?')) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await api.del<{ requiresOtaCancellation: boolean }>(`/reservations/${id}`);
      if (res.requiresOtaCancellation) {
        window.alert('Cancelled locally. This came from Booking.com — remember to also cancel it in the Booking.com extranet.');
      }
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error || !reservation) return <p className="text-sm text-red-600">{error ?? 'Not found'}</p>;

  const balance =
    (invoices ?? []).reduce((sum, inv) => sum + Number(inv.total), 0) - (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline mb-4">
        ← Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{reservation.guest.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {reservation.checkIn} → {reservation.checkOut} · {reservation.rooms.map((r) => r.room.roomNumber).join(', ')}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{reservation.status.replace('_', ' ')}</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{reservation.source.replace('_', '.')}</span>
            {reservation.paymentViaOta && <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">Payment via OTA</span>}
          </div>
        </div>
        {canAct && (
          <div className="flex gap-2 flex-wrap">
            {reservation.status === 'confirmed' && (
              <button onClick={() => checkIn()} disabled={busy} className="rounded-md bg-blue-600 text-white text-sm font-medium px-3 py-2 hover:bg-blue-700 disabled:opacity-60">
                Check in
              </button>
            )}
            {reservation.status === 'checked_in' && (
              <button onClick={checkOut} disabled={busy} className="rounded-md bg-blue-600 text-white text-sm font-medium px-3 py-2 hover:bg-blue-700 disabled:opacity-60">
                Check out
              </button>
            )}
            {!['checked_out', 'cancelled'].includes(reservation.status) && (
              <button onClick={cancel} disabled={busy} className="rounded-md border border-red-200 text-red-700 text-sm font-medium px-3 py-2 hover:bg-red-50 disabled:opacity-60">
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{actionError}</div>}

      {reservation.source === 'booking_com' && (
        <div className="mb-6 text-sm bg-purple-50 border border-purple-200 text-purple-800 rounded-md px-3 py-2">
          Imported from Booking.com (ref {reservation.externalRef}). Dates, room type and price are read-only here — only the assigned room can be changed.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Guest</h2>
          <dl className="text-sm space-y-1 text-gray-600">
            <div>
              <dt className="inline text-gray-400">Email: </dt>
              <dd className="inline">{reservation.guest.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Phone: </dt>
              <dd className="inline">{reservation.guest.phone ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Balance</h2>
          <p className="text-lg font-semibold text-gray-900">{symbol}{balance.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Invoiced minus payments received</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:col-span-2">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Status history</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            {reservation.statusHistory.map((h, i) => (
              <li key={i}>
                <span className="font-medium capitalize">{h.status.replace('_', ' ')}</span>{' '}
                <span className="text-gray-400">{new Date(h.at).toLocaleString()}</span>
                {h.note && <span className="block text-xs text-gray-400">{h.note}</span>}
              </li>
            ))}
          </ul>
        </div>

        {!reservation.paymentViaOta && canAct && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:col-span-2">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Payments</h2>
            <PaymentForm reservationId={reservation.id} onCaptured={reloadPayments} />
            <ul className="text-sm text-gray-600 mt-3 space-y-1">
              {payments?.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="capitalize">{p.method.replace('_', ' ')}</span>
                  <span>{symbol}{p.amount}</span>
                </li>
              ))}
              {payments?.length === 0 && <li className="text-gray-400">No payments yet.</li>}
            </ul>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:col-span-2">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Invoices</h2>
          {invoices?.length === 0 && <p className="text-sm text-gray-400">Generated automatically at checkout.</p>}
          {invoices?.map((inv) => (
            <div key={inv.id} className="border-t border-gray-100 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
              <div className="flex justify-between text-sm font-medium text-gray-800">
                <span>{inv.invoiceNumber}{inv.isCreditNote && ' (credit note)'}</span>
                <span>{symbol}{inv.total}</span>
              </div>
              <ul className="text-xs text-gray-500 mt-1">
                {inv.lineItems.map((li, i) => (
                  <li key={i}>
                    {li.description} — {symbol}{li.total}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ reservationId, onCaptured }: { reservationId: string; onCaptured: () => void }) {
  const { symbol } = useCurrency();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/reservations/${reservationId}/payments`, { amount, method });
      setAmount(0);
      onCaptured();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 flex-wrap">
      {error && <div className="w-full text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">{error}</div>}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Amount ({symbol})</label>
        <input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-28" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
      </div>
      <button disabled={busy || amount <= 0} className="rounded-md bg-blue-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-blue-700 disabled:opacity-60">
        {busy ? 'Capturing…' : 'Capture payment'}
      </button>
    </form>
  );
}
