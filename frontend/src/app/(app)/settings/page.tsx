'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';

interface Property {
  name: string;
  address?: string;
  timezone: string;
  currency: string;
}
interface OtaChannel {
  id: string;
  hasCredentials: boolean;
  syncEnabled: boolean;
  demoMode: boolean;
  pollIntervalMinutes: number;
  roomTypeMapping: Record<string, string>;
  lastSyncedAt?: string;
}
interface SyncLog {
  id: string;
  status: string;
  reservationsPulled: number;
  errors: string[];
  runAt: string;
}
interface RoomType {
  id: string;
  name: string;
}
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-500 mt-0.5">Property details, integrations and team access.</p>
      </div>
      <PropertySection />
      <BookingComSection />
      <UsersSection isOwner={isOwner} />
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-stone-200 rounded-xl p-5">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <p className="text-sm text-stone-500 mt-0.5 mb-4">{description}</p>
      {children}
    </section>
  );
}

function PropertySection() {
  const { data: property, loading, reload } = useFetch(() => api.get<Property>('/property'));
  const [form, setForm] = useState<Property | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const active = form ?? property;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setSaved(false);
    try {
      await api.patch('/property', active);
      setSaved(true);
      reload();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  if (loading || !active) return <Section title="Property" description="Loading…"><span /></Section>;

  return (
    <Section title="Property" description="Shown across the app and used for guest-facing documents like invoices.">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
          <input value={active.name} onChange={(e) => setForm({ ...active, name: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Currency</label>
          <input value={active.currency} onChange={(e) => setForm({ ...active, currency: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-stone-600 mb-1">Address</label>
          <input value={active.address ?? ''} onChange={(e) => setForm({ ...active, address: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button disabled={busy} className="rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved.</span>}
        </div>
      </form>
    </Section>
  );
}

function BookingComSection() {
  const { data: channel, reload } = useFetch(() => api.get<OtaChannel>('/integrations/booking-com'));
  const { data: roomTypes } = useFetch(() => api.get<RoomType[]>('/room-types'));
  const { data: syncLogs, reload: reloadLogs } = useFetch(() => api.get<SyncLog[]>('/integrations/booking-com/sync-log'));

  const [hotelId, setHotelId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function toggle(field: 'syncEnabled' | 'demoMode', value: boolean) {
    await api.patch('/integrations/booking-com', { [field]: value });
    reload();
  }

  async function mapRoomType(otaRoomId: string, roomTypeId: string) {
    if (!channel) return;
    const mapping = { ...channel.roomTypeMapping };
    if (roomTypeId) mapping[otaRoomId] = roomTypeId;
    else delete mapping[otaRoomId];
    await api.patch('/integrations/booking-com', { roomTypeMapping: mapping });
    reload();
  }

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch('/integrations/booking-com', { credentials: { hotelId, username, password } });
      setHotelId('');
      setUsername('');
      setPassword('');
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save credentials');
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      await api.post('/integrations/booking-com/sync-now');
      reload();
      reloadLogs();
    } finally {
      setSyncing(false);
    }
  }

  if (!channel) return null;

  return (
    <Section
      title="Booking.com"
      description="Each property configures its own connection here. Real Booking.com Reservations API access requires Connectivity Partner approval (see the spec) — until you have live credentials, use demo mode to see the full sync pipeline work end to end."
    >
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={channel.syncEnabled} onChange={(e) => toggle('syncEnabled', e.target.checked)} />
          Sync enabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={channel.demoMode} onChange={(e) => toggle('demoMode', e.target.checked)} />
          Demo mode (simulate incoming reservations)
        </label>
        <span className="text-xs text-stone-400">
          {channel.lastSyncedAt ? `Last synced ${new Date(channel.lastSyncedAt).toLocaleString()}` : 'Never synced'}
        </span>
      </div>

      <button onClick={syncNow} disabled={syncing} className="mb-6 rounded-md border border-stone-300 text-sm font-medium px-3 py-1.5 hover:bg-stone-50 disabled:opacity-60">
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>

      <h3 className="text-sm font-medium text-stone-700 mb-2">Room type mapping</h3>
      <p className="text-xs text-stone-500 mb-2">Map each Booking.com room id to one of your room types. In demo mode, add any id you like (e.g. OTA_SUITE_1) — it just needs to match a room type&apos;s configured OTA room id.</p>
      <div className="space-y-2 mb-6">
        {roomTypes?.map((rt) => {
          const currentOtaId = Object.entries(channel.roomTypeMapping).find(([, v]) => v === rt.id)?.[0] ?? '';
          return (
            <div key={rt.id} className="flex items-center gap-2 text-sm">
              <span className="w-40 text-stone-700">{rt.name}</span>
              <input
                defaultValue={currentOtaId}
                placeholder="OTA room id"
                onBlur={(e) => mapRoomType(e.target.value.trim(), e.target.value.trim() ? rt.id : '')}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm w-56"
              />
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-medium text-stone-700 mb-2">Credentials {channel.hasCredentials && <span className="text-emerald-700 font-normal">(configured)</span>}</h3>
      <form onSubmit={saveCredentials} className="grid gap-2 sm:grid-cols-3 mb-6">
        {error && <div className="sm:col-span-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">{error}</div>}
        <input placeholder="Hotel ID" value={hotelId} onChange={(e) => setHotelId(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        <button disabled={busy} className="sm:col-span-3 rounded-md border border-stone-300 text-sm font-medium px-3 py-1.5 hover:bg-stone-50 disabled:opacity-60 w-fit">
          {busy ? 'Saving…' : 'Save credentials'}
        </button>
      </form>

      <h3 className="text-sm font-medium text-stone-700 mb-2">Sync log</h3>
      <div className="space-y-1 text-sm">
        {syncLogs?.slice(0, 10).map((log) => (
          <div key={log.id} className="flex items-start justify-between border-b border-stone-100 py-1.5">
            <div>
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded-full mr-2 ${
                  log.status === 'success' ? 'bg-emerald-100 text-emerald-800' : log.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                }`}
              >
                {log.status}
              </span>
              {log.reservationsPulled} reservation(s)
              {log.errors.length > 0 && <div className="text-xs text-red-500 mt-0.5">{log.errors.join('; ')}</div>}
            </div>
            <span className="text-xs text-stone-400 whitespace-nowrap">{new Date(log.runAt).toLocaleString()}</span>
          </div>
        ))}
        {syncLogs?.length === 0 && <p className="text-stone-400">No syncs yet.</p>}
      </div>
    </Section>
  );
}

function UsersSection({ isOwner }: { isOwner: boolean }) {
  const { data: users, reload } = useFetch(() => api.get<User[]>('/admin/users'));
  const [showForm, setShowForm] = useState(false);

  return (
    <Section title="Team" description="Owner and Admin can create staff accounts. Only Owner can manage other Admin accounts.">
      <button onClick={() => setShowForm((s) => !s)} className="mb-4 rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900">
        {showForm ? 'Cancel' : '+ New user'}
      </button>
      {showForm && <UserForm isOwner={isOwner} onCreated={() => { setShowForm(false); reload(); }} />}
      <div className="divide-y divide-stone-100">
        {users?.map((u) => (
          <div key={u.id} className="py-2 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-stone-800">{u.name}</span>{' '}
              <span className="text-stone-400">{u.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">{u.role.replace('_', ' ')}</span>
              {!u.active && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Suspended</span>}
              {(isOwner || !['owner', 'admin'].includes(u.role)) && (
                <button
                  onClick={async () => {
                    await api.patch(`/admin/users/${u.id}`, { active: !u.active });
                    reload();
                  }}
                  className="text-xs text-stone-400 hover:text-stone-700"
                >
                  {u.active ? 'Suspend' : 'Reactivate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function UserForm({ isOwner, onCreated }: { isOwner: boolean; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('front_desk');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roleOptions = isOwner
    ? ['admin', 'front_desk', 'housekeeping', 'accountant']
    : ['front_desk', 'housekeeping', 'accountant'];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/users', { name, email, password, role });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 mb-6 bg-stone-50 border border-stone-200 rounded-lg p-4">
      {error && <div className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">{error}</div>}
      <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
      <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
      <input required type="password" minLength={8} placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
      <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
        {roleOptions.map((r) => (
          <option key={r} value={r}>
            {r.replace('_', ' ')}
          </option>
        ))}
      </select>
      <button disabled={busy} className="sm:col-span-2 rounded-md bg-emerald-800 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-900 disabled:opacity-60 w-fit">
        {busy ? 'Creating…' : 'Create user'}
      </button>
    </form>
  );
}
