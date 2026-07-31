import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Gate for any route that requires a signed-in user, regardless of role.
// Redirects to /login and remembers the attempted location so LoginPage can
// send the user back after a successful sign-in.
export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthCheckingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

const AuthCheckingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F5EFE5] text-[#786A58] text-sm tracking-widest uppercase">
    Checking session…
  </div>
);
