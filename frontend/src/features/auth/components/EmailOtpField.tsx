import { useState } from 'react';
import { Button, TextField } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { authApi } from '../api/authApi';

export type EmailOtpFieldProps = {
  email: string;
  onEmailChange: (value: string) => void;
  verified: boolean;
  onVerified: () => void;
};

// Shared email-verification step for every account-creation form (member
// self-registration, admin-created admins, admin-created instructors): the
// email is locked in once a code has been sent, and the rest of the
// surrounding form should stay hidden/disabled until `verified` is true.
export const EmailOtpField = ({ email, onEmailChange, verified, onVerified }: EmailOtpFieldProps) => {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    setIsSending(true);
    try {
      await authApi.requestRegistrationOtp(email);
      setOtpSent(true);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not send the verification code.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setIsVerifying(true);
    try {
      await authApi.verifyRegistrationOtp(email, otpCode);
      onVerified();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not verify the code.'));
    } finally {
      setIsVerifying(false);
    }
  };

  if (verified) {
    return (
      <div>
        <TextField label="Email Address" name="email" type="email" value={email} disabled onChange={() => {}} />
        <p className="mt-1 text-xs text-emerald-600">Email verified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            label="Email Address"
            name="email"
            type="email"
            value={email}
            disabled={otpSent}
            required
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </div>
        {!otpSent && (
          <Button
            type="button"
            variant="outline"
            className="mb-0.5 whitespace-nowrap px-4 py-3"
            disabled={!email || isSending}
            onClick={() => void handleSend()}
          >
            {isSending ? 'Sending…' : 'Send Code'}
          </Button>
        )}
      </div>

      {otpSent && (
        <>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <TextField
                label="Verification Code"
                name="otp_code"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mb-0.5 whitespace-nowrap px-4 py-3"
              disabled={otpCode.length !== 6 || isVerifying}
              onClick={() => void handleVerify()}
            >
              {isVerifying ? 'Verifying…' : 'Verify'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSending}
            className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]"
          >
            {isSending ? 'Resending…' : 'Resend code'}
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
