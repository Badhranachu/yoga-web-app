import { LayoutDashboard, UserCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/shared/layout/DashboardLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SidebarNavItem } from '@/shared/layout/DashboardLayout/DashboardSidebar';

const userNavItems: SidebarNavItem[] = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/profile', label: 'My Profile', icon: UserCircle2 },
];

// Member-role area: same shell as AdminLayout, reduced navigation.
// Booking/payment history land here in a later phase.
export const UserLayout = () => {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout
      navItems={userNavItems}
      sidebarEyebrow="My Account"
      topbar={{ title: 'My Account', userLabel: user?.full_name || user?.email, onLogout: logout }}
    />
  );
};
