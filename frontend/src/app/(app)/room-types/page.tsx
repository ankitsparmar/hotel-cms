'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency';
import { useFetch } from '@/lib/use-fetch';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  maxOccupancy: number;
  baseRate: string;
  amenities: string[];
  archived: boolean;
  otaRoomId?: string;
}

export default function RoomTypesPage() {
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const { data, loading, error, reload } = useFetch(() => api.get<RoomType[]>('/room-types?includeArchived=true'));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  function closeForms() {
    setShowForm(false);
    setEditing(null);
  }

  async function archive(rt: RoomType, archived: boolean) {
    setBusyId(rt.id);
    setRowError(null);
    try {
      await api.patch(`/room-types/${rt.id}`, { archived });
      reload();
    } catch (err) {
      setRowError({ id: rt.id, message: err instanceof ApiError ? err.message : 'Failed to update room type' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(rt: RoomType) {
    setBusyId(rt.id);
    setRowError(null);
    try {
      await api.del(`/room-types/${rt.id}`);
      reload();
    } catch (err) {
      setRowError({ id: rt.id, message: err instanceof ApiError ? err.message : 'Failed to delete room type' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Room Types</h1>
          <p className="text-sm text-gray-500 mt-0.5">The sellable categories rooms belong to (e.g. Double Deluxe, Suite).</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              if (showForm || editing) closeForms();
              else setShowForm(true);
            }}
            className="rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New room type'}
          </button>
        )}
      </div>

      {showForm && <RoomTypeForm onDone={() => { closeForms(); reload(); }} onCancel={closeForms} />}
      {editing && <RoomTypeForm initial={editing} onDone={() => { closeForms(); reload(); }} onCancel={closeForms} />}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {data?.map((rt) => (
          <div key={rt.id} className={`bg-white border rounded-xl p-4 ${rt.archived ? 'border-gray-200 opacity-60' : 'border-gray-200 shadow-sm'}`}>
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-gray-900">{rt.name}</h3>
              {rt.archived && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archived</span>}
            </div>
            {rt.description && <p className="text-sm text-gray-500 mt-1">{rt.description}</p>}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <span>Sleeps {rt.maxOccupancy}</span>
              <span className="font-medium text-blue-800">{symbol}{rt.baseRate}/night</span>
            </div>
            {rt.otaRoomId && <p className="mt-2 text-xs text-gray-400">OTA room id: {rt.otaRoomId}</p>}

            {rowError?.id === rt.id && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">{rowError.message}</p>
            )}

            {isAdmin && (
              <div className="mt-3 flex items-center gap-3 text-xs">
                <button
                  onClick={() => { setEditing(rt); setShowForm(false); setRowError(null); }}
                  disabled={busyId === rt.id}
                  className="text-gray-500 hover:text-blue-700 disabled:opacity-60"
                >
                  Edit
                </button>
                {rt.archived ? (
                  <button
                    onClick={() => archive(rt, false)}
                    disabled={busyId === rt.id}
                    className="text-gray-500 hover:text-blue-700 disabled:opacity-60"
                  >
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => archive(rt, true)}
                    disabled={busyId === rt.id}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-60"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${rt.name}"? This can't be undone.`)) remove(rt);
                  }}
                  disabled={busyId === rt.id}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {data?.length === 0 && !loading && <p className="text-sm text-gray-400">No room types yet.</p>}
    </div>
  );
}

function RoomTypeForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: RoomType;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { symbol } = useCurrency();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [maxOccupancy, setMaxOccupancy] = useState(initial?.maxOccupancy ?? 2);
  const [baseRate, setBaseRate] = useState(initial ? Number(initial.baseRate) : 100);
  const [otaRoomId, setOtaRoomId] = useState(initial?.otaRoomId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { name, description: description || undefined, maxOccupancy, baseRate, otaRoomId: otaRoomId || undefined };
      if (isEdit) {
        await api.patch(`/room-types/${initial!.id}`, payload);
      } else {
        await api.post('/room-types', payload);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${isEdit ? 'update' : 'create'} room type`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 grid gap-3 sm:grid-cols-2">
      {error && <div className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Base rate ({symbol}/night)</label>
        <input type="number" min={0} step="0.01" required value={baseRate} onChange={(e) => setBaseRate(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Max occupancy</label>
        <input type="number" min={1} required value={maxOccupancy} onChange={(e) => setMaxOccupancy(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">OTA room id (optional)</label>
        <input value={otaRoomId} onChange={(e) => setOtaRoomId(e.target.value)} placeholder="e.g. OTA_DOUBLE_DELUXE" className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={busy} className="rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-60">
          {busy ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create room type'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
