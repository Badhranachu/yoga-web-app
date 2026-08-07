import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, TextField } from '@/shared/ui';
import { AuthCard } from '../components/AuthCard';
import { FormError } from '@/shared/ui';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '@/shared/lib/apiErrors';

type LocationState = { from?: { pathname: string } } | null;

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      const state = location.state as LocationState;
      const defaultHome = user.role === 'admin' ? '/dashboard' : user.role === 'instructor' ? '/instructor' : '/account';
      const redirectTo = state?.from?.pathname ?? defaultHome;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your practice."
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/register" className="text-[#D8B46A] hover:underline">
            Create one
          </Link>
        </>
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
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-[#786A58] hover:text-[#D8B46A] transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </AuthCard>
  );
};
