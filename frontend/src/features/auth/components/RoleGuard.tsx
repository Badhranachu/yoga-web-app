import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

export type RoleGuardProps = {
  allow: UserRole[];
};

// Nested inside ProtectedRoute — assumes a user is already present.
// Sends unauthorized roles to their own home instead of a dead end.
export const RoleGuard = ({ allow }: RoleGuardProps) => {
  const { user } = useAuth();

  if (!user) return null;

  if (!allow.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/dashboard' : user.role === 'instructor' ? '/instructor' : '/account';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};
