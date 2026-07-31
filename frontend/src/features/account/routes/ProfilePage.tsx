import { useState, type FormEvent } from 'react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/authApi';

// Shared between admin and user areas — profile editing isn't role-specific.
export const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await authApi.updateProfile({ first_name: firstName, last_name: lastName, phone_number: phoneNumber });
      await refreshProfile();
      setSuccessMessage('Profile updated.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-6">My Profile</h2>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <TextField label="Email Address" value={user.email} disabled readOnly />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="First Name" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <TextField label="Last Name" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <TextField label="Phone Number" name="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
};
