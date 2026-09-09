import { ProfileForm } from '@/components/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Your profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your name, sign-in details and password.</p>
      </div>
      <ProfileForm />
    </div>
  );
}
