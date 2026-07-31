import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, TextField } from '@/shared/ui';
import { AuthCard } from '../components/AuthCard';
import { FormError } from '@/shared/ui';
import { authApi } from '../api/authApi';
import { extractErrorMessage } from '@/shared/lib/apiErrors';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, new_password: newPassword });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(extractErrorMessage(err, 'This reset link is invalid or has expired.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password for your account."
      footer={
        <Link to="/login" className="text-[#D8B46A] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <FormError message={error} />
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <TextField
          label="New Password"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting…' : 'Reset Password'}
        </Button>
      </form>
    </AuthCard>
  );
};
