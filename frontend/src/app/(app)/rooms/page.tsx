'use client';

import { useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';

interface RoomType {
  id: string;
  name: string;
}
interface Room {
  id: string;
  roomNumber: string;
  floor?: string;
  status: 'clean' | 'dirty' | 'inspected' | 'out_of_order';
  roomTypeId: string;
  roomType?: RoomType;
  outOfOrderReason?: string;
}

const STATUS_STYLES: Record<Room['status'], string> = {
  clean: 'bg-emerald-100 text-emerald-800',
  dirty: 'bg-amber-100 text-amber-800',
  inspected: 'bg-sky-100 text-sky-800',
  out_of_order: 'bg-red-100 text-red-800',
};

export default function RoomsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const canChangeStatus = ['owner', 'admin', 'housekeeping', 'front_desk'].includes(user?.role ?? '');
  const { data: rooms, loading, error, reload } = useFetch(() => api.get<Room[]>('/rooms?includeArchived=false'));
  const { data: roomTypes } = useFetch(() => api.get<RoomType[]>('/room-types'));
  const [showForm, setShowForm] = useState(false);

  const roomTypeName = useMemo(() => {
    const map = new Map((roomTypes ?? []).map((rt) => [rt.id, rt.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [roomTypes]);

  async function setStatus(room: Room, status: Room['status']) {
    if (status === 'out_of_order') {
      const reason = window.prompt('Reason for marking this room out of order:');
      if (!reason) return;
      try {
        await api.patch(`/rooms/${room.id}/status`, { status, reason });
        reload();
      } catch (err) {
        alert(err instanceof ApiError ? err.message : 'Failed to update status');
      }
      return;
    }
    try {
      await api.patch(`/rooms/${room.id}/status`, { status });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Rooms</h1>
          <p className="text-sm text-stone-500 mt-0.5">Physical rooms and their current housekeeping status.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900">
            {showForm ? 'Cancel' : '+ New room'}
          </button>
        )}
      </div>

      {showForm && <RoomForm roomTypes={roomTypes ?? []} onCreated={() => { setShowForm(false); reload(); }} />}

      {loading && <p className="text-sm text-stone-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Room</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Floor</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              {canChangeStatus && <th className="text-left px-4 py-2 font-medium">Set status</th>}
            </tr>
          </thead>
          <tbody>
            {rooms?.map((room) => (
              <tr key={room.id} className="border-t border-stone-100">
                <td className="px-4 py-2.5 font-medium text-stone-800">{room.roomNumber}</td>
                <td className="px-4 py-2.5 text-stone-600">{room.roomType?.name ?? roomTypeName(room.roomTypeId)}</td>
                <td className="px-4 py-2.5 text-stone-600">{room.floor ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[room.status]}`}>{room.status.replace('_', ' ')}</span>
                  {room.status === 'out_of_order' && room.outOfOrderReason && (
                    <span className="ml-2 text-xs text-stone-400">({room.outOfOrderReason})</span>
                  )}
                </td>
                {canChangeStatus && (
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {(['clean', 'dirty', 'inspected'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(room, s)}
                          disabled={room.status === s}
                          className="text-xs border border-stone-200 rounded px-2 py-1 hover:bg-stone-50 disabled:opacity-40"
                        >
                          {s}
                        </button>
                      ))}
                      {isAdmin && (
                        <button
                          onClick={() => setStatus(room, room.status === 'out_of_order' ? 'clean' : 'out_of_order')}
                          className="text-xs border border-red-200 text-red-700 rounded px-2 py-1 hover:bg-red-50"
                        >
                          {room.status === 'out_of_order' ? 'Clear OOO' : 'Mark OOO'}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rooms?.length === 0 && !loading && <p className="text-sm text-stone-400 px-4 py-6">No rooms yet.</p>}
      </div>
    </div>
  );
}

function RoomForm({ roomTypes, onCreated }: { roomTypes: RoomType[]; onCreated: () => void }) {
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState('');
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomTypeId) {
      setError('Create a room type first');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/rooms', { roomNumber, floor: floor || undefined, roomTypeId });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create room');
    } finally {
      setBusy(false);
    }
  }

  async function submitCsv() {
    setCsvBusy(true);
    setCsvResult(null);
    try {
      const res = await api.post<{ imported: number }>('/rooms/bulk-import', { csv });
      setCsvResult(`Imported ${res.imported} room(s).`);
      onCreated();
    } catch (err) {
      setCsvResult(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setCsvBusy(false);
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 space-y-4">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        {error && <div className="sm:col-span-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Room number</label>
          <input required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Floor (optional)</label>
          <input value={floor} onChange={(e) => setFloor(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Room type</label>
          <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm">
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <button disabled={busy} className="rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create room'}
          </button>
        </div>
      </form>

      <div className="border-t border-stone-100 pt-3">
        <label className="block text-xs font-medium text-stone-600 mb-1">Bulk import (CSV — columns: room_number, room_type_id, floor)</label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={3}
          placeholder={`room_number,room_type_id,floor\n101,${roomTypes[0]?.id ?? '<room-type-id>'},1`}
          className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm font-mono"
        />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={submitCsv} disabled={csvBusy || !csv} className="rounded-md border border-stone-300 text-sm font-medium px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50">
            {csvBusy ? 'Importing…' : 'Import CSV'}
          </button>
          {csvResult && <span className="text-xs text-stone-500">{csvResult}</span>}
        </div>
      </div>
    </div>
  );
}
