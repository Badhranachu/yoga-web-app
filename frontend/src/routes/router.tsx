import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/shared/layout/PublicLayout';
import { HomePage } from '@/features/public-site/home';
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { RegisterPage } from '@/features/auth/routes/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/routes/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/routes/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { RoleGuard } from '@/features/auth/components/RoleGuard';
import { AdminLayout } from '@/features/dashboard-overview/components/AdminLayout';
import { OverviewPage } from '@/features/dashboard-overview/routes/OverviewPage';
import { ClassesPage } from '@/features/classes/routes/ClassesPage';
import { MembersPage } from '@/features/members/routes/MembersPage';
import { InstructorsPage } from '@/features/instructors/routes/InstructorsPage';
import { InstructorLeavePage } from '@/features/instructors/routes/InstructorLeavePage';
import { InstructorLayout } from '@/features/instructors/components/InstructorLayout';
import { InstructorOverviewPage } from '@/features/instructors/routes/InstructorOverviewPage';
import { BookingsPage } from '@/features/bookings/routes/BookingsPage';
import { BookSlotPage } from '@/features/bookings/routes/BookSlotPage';
import { PaymentsPage } from '@/features/payments/routes/PaymentsPage';
import { PaymentHistoryPage } from '@/features/payments/routes/PaymentHistoryPage';
import { NotificationsPage } from '@/features/notifications/routes/NotificationsPage';
import { ReportsPage } from '@/features/reports/routes/ReportsPage';
import { UserLayout } from '@/features/account/components/UserLayout';
import { AccountOverviewPage } from '@/features/account/routes/AccountOverviewPage';
import { ProfilePage } from '@/features/account/routes/ProfilePage';
import { ChangeEmailPage } from '@/features/account/routes/ChangeEmailPage';
import { ChangePasswordPage } from '@/features/account/routes/ChangePasswordPage';
import { SubscriptionPage } from '@/features/account/routes/SubscriptionPage';

// Central route tree. Feature modules own their page components; this file
// only wires them to URLs, layout shells, and auth guards.
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleGuard allow={['admin']} />,
        children: [
          {
            path: '/dashboard',
            element: <AdminLayout />,
            children: [
              { index: true, element: <OverviewPage /> },
              { path: 'classes', element: <ClassesPage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'instructors', element: <InstructorsPage /> },
              { path: 'instructor-leave', element: <InstructorLeavePage /> },
              { path: 'bookings', element: <BookingsPage /> },
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'reports', element: <ReportsPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allow={['user', 'admin']} />,
        children: [
          {
            path: '/account',
            element: <UserLayout />,
            children: [
              { index: true, element: <AccountOverviewPage /> },
              { path: 'book', element: <BookSlotPage /> },
              { path: 'subscription', element: <SubscriptionPage /> },
              { path: 'payment-history', element: <PaymentHistoryPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'profile/change-email', element: <ChangeEmailPage /> },
              { path: 'profile/change-password', element: <ChangePasswordPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allow={['instructor']} />,
        children: [
          {
            path: '/instructor',
            element: <InstructorLayout />,
            children: [
              { index: true, element: <InstructorOverviewPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'profile/change-email', element: <ChangeEmailPage /> },
              { path: 'profile/change-password', element: <ChangePasswordPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
