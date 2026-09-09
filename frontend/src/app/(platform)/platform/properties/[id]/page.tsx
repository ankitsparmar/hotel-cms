'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';

interface PropertyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface PropertyDetail {
  id: string;
  name: string;
  suspended: boolean;
  createdAt: string;
  userCount: number;
  roomCount: number;
  reservationCount: number;
  owner: { name: string; email: string } | null;
  users: PropertyUser[];
}

export default function PropertyUsersPage() {
  const { id } = useParams<{ id: string }>();
  const { data: property, loading, error } = useFetch(() => api.get<PropertyDetail>(`/platform/properties/${id}`), [id]);

  return (
    <div>
      <Link href="/platform" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        ← All properties
      </Link>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {property && (
        <>
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{property.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Signed up {new Date(property.createdAt).toLocaleDateString()}
                {property.owner && <> · Owner: {property.owner.name} ({property.owner.email})</>}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full h-fit ${
                property.suspended ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {property.suspended ? 'Suspended' : 'Active'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
            <StatCard label="Users" value={property.userCount} />
            <StatCard label="Rooms" value={property.roomCount} />
            <StatCard label="Reservations" value={property.reservationCount} />
          </div>

          <h2 className="text-base font-semibold text-gray-900 mb-3">Onboarded users</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Role</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {property.users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{u.role.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.active ? (
                        <span className="text-xs text-blue-700">Active</span>
                      ) : (
                        <span className="text-xs text-red-600">Suspended</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {property.users.length === 0 && <p className="text-sm text-gray-400 px-4 py-6">No users yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
