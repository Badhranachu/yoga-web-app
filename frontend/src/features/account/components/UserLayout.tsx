import { LayoutDashboard, UserCircle2, CreditCard, CalendarPlus, ReceiptText, Bell } from 'lucide-react';
import { DashboardLayout } from '@/shared/layout/DashboardLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SidebarNavItem } from '@/shared/layout/DashboardLayout/DashboardSidebar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { SessionsRemainingBadge } from '../components/SessionsRemainingBadge';

const userNavItems: SidebarNavItem[] = [
  { to: '/account', label: 'My Bookings', icon: LayoutDashboard, end: true },
  { to: '/account/book', label: 'Book a Class', icon: CalendarPlus },
  { to: '/account/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/account/payment-history', label: 'Payment History', icon: ReceiptText },
  { to: '/account/notifications', label: 'Notifications', icon: Bell },
  { to: '/account/profile', label: 'My Profile', icon: UserCircle2 },
];

// Member-role area: same shell as AdminLayout, reduced navigation.
export const UserLayout = () => {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout
      navItems={userNavItems}
      sidebarEyebrow="My Account"
      topbar={{
        title: 'My Account',
        userLabel: user?.full_name || user?.email,
        onLogout: logout,
        notificationBell: (
          <div className="flex items-center gap-4">
            <SessionsRemainingBadge />
            <NotificationBell />
          </div>
        ),
      }}
    />
  );
};
