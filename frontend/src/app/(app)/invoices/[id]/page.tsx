'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { currencySymbol } from '@/lib/currency';
import { useFetch } from '@/lib/use-fetch';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  lineItems: { description: string; quantity: number; unitPrice: string; total: string }[];
  total: string;
  isCreditNote: boolean;
  originalInvoiceNumber?: string;
  issuedAt: string;
  property: { name: string; address: string | null; currency: string };
  guest: { name: string; email: string | null; phone: string | null };
  reservation: { id: string; checkIn: string; checkOut: string; rooms: string[] };
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: invoice, loading, error } = useFetch(() => api.get<InvoiceDetail>(`/invoices/${id}`), [id]);

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error || !invoice) return <p className="text-sm text-red-600">{error ?? 'Not found'}</p>;

  const symbol = currencySymbol(invoice.property.currency);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline">
          ← Back
        </button>
        <Link
          href={`/reservations/${invoice.reservation.id}`}
          className="text-sm text-gray-500 hover:underline"
        >
          View reservation
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 print:border-0 print:rounded-none print:shadow-none">
        <div className="flex items-start justify-between flex-wrap gap-4 pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{invoice.property.name}</h1>
            {invoice.property.address && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-line">{invoice.property.address}</p>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 tracking-tight">
              {invoice.isCreditNote ? 'CREDIT NOTE' : 'INVOICE'}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">{invoice.invoiceNumber}</div>
            {invoice.originalInvoiceNumber && (
              <div className="text-xs text-gray-400">for {invoice.originalInvoiceNumber}</div>
            )}
            <div className="text-xs text-gray-400 mt-1">{new Date(invoice.issuedAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 py-6 border-b border-gray-100">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Billed to</h2>
            <p className="text-sm font-medium text-gray-800">{invoice.guest.name}</p>
            {invoice.guest.email && <p className="text-sm text-gray-500">{invoice.guest.email}</p>}
            {invoice.guest.phone && <p className="text-sm text-gray-500">{invoice.guest.phone}</p>}
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Stay</h2>
            <p className="text-sm text-gray-700">
              {invoice.reservation.checkIn} → {invoice.reservation.checkOut}
            </p>
            <p className="text-sm text-gray-500">Room{invoice.reservation.rooms.length > 1 ? 's' : ''} {invoice.reservation.rooms.join(', ')}</p>
          </div>
        </div>

        <table className="w-full text-sm mt-6">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 font-semibold text-right">Qty</th>
              <th className="pb-2 font-semibold text-right">Unit price</th>
              <th className="pb-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2 text-gray-800">{li.description}</td>
                <td className="py-2 text-right text-gray-600">{li.quantity}</td>
                <td className="py-2 text-right text-gray-600">{symbol}{li.unitPrice}</td>
                <td className="py-2 text-right text-gray-800">{symbol}{li.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-4">
          <div className="w-48">
            <div className="flex justify-between text-base font-bold text-gray-900 border-t-2 border-gray-800 pt-2">
              <span>{invoice.isCreditNote ? 'Credited' : 'Total due'}</span>
              <span>{symbol}{Math.abs(Number(invoice.total)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-10">Thank you for staying with {invoice.property.name}.</p>
      </div>
    </div>
  );
}
