import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { router } from '@/routes/router';

export const App = () => (
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
