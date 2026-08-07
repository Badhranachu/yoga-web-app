import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/authApi';

// Dedicated page (not an inline card) so changing email reads as a
// deliberate, focused flow: enter the new address, verify the OTP sent to
// it, done. Only on successful verification does the account's email
// actually change — see apps.accounts.services.verify_email_change.
export const ChangeEmailPage = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const profileHome = user?.role === 'instructor' ? '/instructor/profile' : '/account/profile';
  const [step, setStep] = useState<'idle' | 'awaiting_otp'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await authApi.requestEmailChange({ new_email: newEmail });
      setStep('awaiting_otp');
      setSuccessMessage(`A 6-digit code was sent to ${newEmail}. It expires in 5 minutes.`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyEmailChange({ otp_code: otpCode });
      await refreshProfile();
      setSuccessMessage('Email updated successfully.');
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

      <h2 className="font-serif text-2xl text-[#2B241E] mb-1">Change Email</h2>
      <p className="text-sm text-[#786A58] mb-8">
        Current email: <span className="text-[#2B241E]">{user?.email}</span>
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      {step === 'idle' ? (
        <form onSubmit={handleRequestCode} className="space-y-6">
          <TextField
            label="New Email Address"
            name="newEmail"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send Verification Code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
          <TextField
            label="6-Digit Code"
            name="otpCode"
            inputMode="numeric"
            maxLength={6}
            required
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
          />
          <div className="flex flex-wrap gap-4">
            <Button type="submit" variant="primary" disabled={isSubmitting || otpCode.length !== 6}>
              {isSubmitting ? 'Verifying…' : 'Verify & Update Email'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setStep('idle');
                setOtpCode('');
                setError(null);
                setSuccessMessage(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
