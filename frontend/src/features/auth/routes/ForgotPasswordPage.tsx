import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextField } from '@/shared/ui';
import { AuthCard } from '../components/AuthCard';
import { FormError } from '@/shared/ui';
import { authApi } from '../api/authApi';
import { extractErrorMessage } from '@/shared/lib/apiErrors';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword({ email });
      setStep('code');
    } catch (err) {
      setError(extractErrorMessage(err, 'No account found with this email address.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { token } = await authApi.verifyForgotPasswordOtp({ email, otp_code: otpCode });
      navigate(`/reset-password?token=${encodeURIComponent(token)}`, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'This code is invalid or has expired.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'code') {
    return (
      <AuthCard
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${email}. It expires in 5 minutes.`}
        footer={
          <Link to="/login" className="text-[#D8B46A] hover:underline">
            Back to sign in
          </Link>
        }
      >
        <FormError message={error} />
        <form onSubmit={handleVerifyCode} className="space-y-6" noValidate>
          <TextField
            label="Verification Code"
            type="text"
            name="otpCode"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            required
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
          />

          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting || otpCode.length !== 6}>
            {isSubmitting ? 'Verifying…' : 'Verify Code'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep('email');
              setOtpCode('');
              setError(null);
            }}
            className="w-full text-center text-sm text-[#786A58] hover:text-[#D8B46A] transition-colors"
          >
            Use a different email
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a verification code."
      footer={
        <Link to="/login" className="text-[#D8B46A] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <FormError message={error} />
      <form onSubmit={handleSendCode} className="space-y-6" noValidate>
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
          {isSubmitting ? 'Sending…' : 'Send Code'}
        </Button>
      </form>
    </AuthCard>
  );
};
