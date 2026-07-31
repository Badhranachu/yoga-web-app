import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, TextField } from '@/shared/ui';
import { AuthCard } from '../components/AuthCard';
import { FormError } from '@/shared/ui';
import { authApi } from '../api/authApi';
import { extractErrorMessage } from '@/shared/lib/apiErrors';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword({ email });
      setIsSubmitted(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle={`If an account exists for ${email}, a reset link is on its way.`}
        footer={
          <Link to="/login" className="text-[#D8B46A] hover:underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-[#786A58] text-center">
          The link expires in 1 hour. Didn't get it? Check spam, or try again.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="text-[#D8B46A] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <FormError message={error} />
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <TextField
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthCard>
  );
};
