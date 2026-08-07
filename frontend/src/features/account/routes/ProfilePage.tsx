import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Pencil, X } from 'lucide-react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/authApi';

const ProfileDetailsCard = () => {
  const { user, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const startEditing = () => {
    setError(null);
    setSuccessMessage(null);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setPhoneNumber(user.phone_number);
    setAddress(user.address);
    setAge(user.age ? String(user.age) : '');
    setIsEditing(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await authApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        address,
        age: age ? Number(age) : null,
      });
      await refreshProfile();
      setSuccessMessage('Profile updated.');
      setIsEditing(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-xl text-[#2B241E]">Profile Details</h3>
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit profile"
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A] transition-colors"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>

        <FormSuccess message={successMessage} />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#786A58] mb-1">First Name</dt>
            <dd className="text-[#2B241E]">{user.first_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#786A58] mb-1">Last Name</dt>
            <dd className="text-[#2B241E]">{user.last_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#786A58] mb-1">Phone Number</dt>
            <dd className="text-[#2B241E]">{user.phone_number || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[#786A58] mb-1">Age</dt>
            <dd className="text-[#2B241E]">{user.age ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-widest text-[#786A58] mb-1">Address</dt>
            <dd className="text-[#2B241E]">{user.address || '—'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-serif text-xl text-[#2B241E]">Edit Profile</h3>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          aria-label="Cancel editing"
          disabled={isSubmitting}
          className="text-[#786A58] hover:text-[#2B241E] transition-colors disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </div>

      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="First Name" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <TextField label="Last Name" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Phone Number" name="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          <TextField label="Age" name="age" type="number" min={1} max={129} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <TextField label="Address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} />

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
};

// Shared between admin and user areas — profile editing isn't role-specific.
// Profile details render read-only by default; the pencil icon switches to
// an edit form. Email and password each open their own dedicated page
// (ChangeEmailPage / ChangePasswordPage) rather than expanding inline.
export const ProfilePage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-[#2B241E] mb-1">My Profile</h2>
        <p className="text-sm text-[#786A58]">{user.email}</p>
      </div>

      <ProfileDetailsCard />

      <div className="flex flex-wrap gap-4">
        <Link to="/account/profile/change-email">
          <Button type="button" variant="outline" className="flex items-center gap-2">
            <Mail size={15} /> Change Email
          </Button>
        </Link>
        <Link to="/account/profile/change-password">
          <Button type="button" variant="outline" className="flex items-center gap-2">
            <KeyRound size={15} /> Change Password
          </Button>
        </Link>
      </div>
    </div>
  );
};
