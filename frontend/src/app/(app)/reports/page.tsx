'use client';

import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';

interface Reservation {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guest: { name: string };
}
interface Invoice {
  reservationId: string;
  total: string;
  isCreditNote: boolean;
}

export default function ReportsPage() {
  const { data: reservations, loading, error } = useFetch(() => api.get<Reservation[]>('/reservations?status=checked_out'));
  const { data: invoiceLists } = useFetch(async () => {
    const list = await api.get<Reservation[]>('/reservations?status=checked_out');
    const invoices = await Promise.all(list.map((r) => api.get<Invoice[]>(`/reservations/${r.id}/invoices`)));
    return invoices.flat();
  });

  const totalRevenue = (invoiceLists ?? []).reduce((sum, inv) => sum + Number(inv.total), 0);
  const invoicesByReservation = new Map<string, number>();
  (invoiceLists ?? []).forEach((inv) => {
    invoicesByReservation.set(inv.reservationId, (invoicesByReservation.get(inv.reservationId) ?? 0) + Number(inv.total));
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Reports</h1>
        <p className="text-sm text-stone-500 mt-0.5">Revenue from completed stays.</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 max-w-xs">
        <div className="text-sm text-stone-500">Total revenue (checked-out stays)</div>
        <div className="text-2xl font-semibold text-stone-900 mt-1">£{totalRevenue.toFixed(2)}</div>
      </div>

      {loading && <p className="text-sm text-stone-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Guest</th>
              <th className="text-left px-4 py-2 font-medium">Dates</th>
              <th className="text-right px-4 py-2 font-medium">Invoiced</th>
            </tr>
          </thead>
          <tbody>
            {reservations?.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-2.5 font-medium text-stone-800">{r.guest.name}</td>
                <td className="px-4 py-2.5 text-stone-600">{r.checkIn} → {r.checkOut}</td>
                <td className="px-4 py-2.5 text-right text-stone-800">£{(invoicesByReservation.get(r.id) ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {reservations?.length === 0 && !loading && <p className="text-sm text-stone-400 px-4 py-6">No completed stays yet.</p>}
      </div>
    </div>
  );
}
