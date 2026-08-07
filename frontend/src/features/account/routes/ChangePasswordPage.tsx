import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/authApi';

// Dedicated page (not an inline card): current password is verified
// server-side (apps.accounts.serializers.ChangePasswordSerializer) before
// the new one is accepted.
export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profileHome = user?.role === 'instructor' ? '/instructor/profile' : '/account/profile';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password changed successfully.');
      setTimeout(() => navigate(profileHome), 1200);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <button
        type="button"
        onClick={() => navigate(profileHome)}
        className="mb-6 flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E] transition-colors"
      >
        <ArrowLeft size={14} /> Back to Profile
      </button>

      <h2 className="font-serif text-2xl text-[#2B241E] mb-8">Change Password</h2>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <TextField
          label="Current Password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <TextField
          label="New Password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Change Password'}
        </Button>
      </form>
    </div>
  );
};
