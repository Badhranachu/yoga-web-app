import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextField } from '@/shared/ui';
import { AuthCard } from '../components/AuthCard';
import { FormError } from '@/shared/ui';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '@/shared/lib/apiErrors';

export const RegisterPage = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName,
        last_name: lastName,
      });
      await login({ email, password });
      navigate('/account', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create your account. Please check your details.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join the studio to book classes and manage your journey."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-[#D8B46A] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <TextField
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirm Password"
          type="password"
          name="passwordConfirm"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthCard>
  );
};
