'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'done';
  room: { roomNumber: string };
  assignee?: { name: string };
  createdAt: string;
}

const STATUS_STYLES: Record<Task['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-sky-100 text-sky-800',
  done: 'bg-emerald-100 text-emerald-800',
};

export default function HousekeepingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const { data: tasks, loading, error, reload } = useFetch(() => api.get<Task[]>('/housekeeping/tasks'));

  async function assignToMe(id: string) {
    try {
      await api.patch(`/housekeeping/tasks/${id}/assign`, { assignedTo: user?.id });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to assign');
    }
  }

  async function complete(id: string, inspected: boolean) {
    try {
      await api.patch(`/housekeeping/tasks/${id}/complete`, { inspected });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to complete task');
    }
  }

  const pending = tasks?.filter((t) => t.status !== 'done') ?? [];
  const done = tasks?.filter((t) => t.status === 'done') ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Housekeeping</h1>
        <p className="text-sm text-stone-500 mt-0.5">Tasks are created automatically at checkout; completing one marks the room clean.</p>
      </div>

      {loading && <p className="text-sm text-stone-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <h2 className="text-sm font-medium text-stone-700 mb-2">To do</h2>
      <div className="space-y-2 mb-8">
        {pending.map((t) => (
          <div key={t.id} className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-medium text-stone-800">Room {t.room.roomNumber}</div>
              <div className="text-xs text-stone-500 capitalize">
                {t.type.replace('_', ' ')} · <span className={`px-1.5 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>{t.status.replace('_', ' ')}</span>
                {t.assignee && <span> · assigned to {t.assignee.name}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {!t.assignee && (
                <button onClick={() => assignToMe(t.id)} className="text-xs border border-stone-300 rounded-md px-2 py-1 hover:bg-stone-50">
                  Take task
                </button>
              )}
              <button onClick={() => complete(t.id, false)} className="text-xs bg-emerald-800 text-white rounded-md px-2 py-1 hover:bg-emerald-900">
                Mark clean
              </button>
              {isAdmin && (
                <button onClick={() => complete(t.id, true)} className="text-xs border border-emerald-300 text-emerald-800 rounded-md px-2 py-1 hover:bg-emerald-50">
                  Mark inspected
                </button>
              )}
            </div>
          </div>
        ))}
        {pending.length === 0 && !loading && <p className="text-sm text-stone-400">All caught up.</p>}
      </div>

      <h2 className="text-sm font-medium text-stone-700 mb-2">Done</h2>
      <div className="space-y-1">
        {done.slice(0, 20).map((t) => (
          <div key={t.id} className="text-sm text-stone-400 flex justify-between border-b border-stone-100 py-1.5">
            <span>Room {t.room.roomNumber} — {t.type.replace('_', ' ')}</span>
            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
