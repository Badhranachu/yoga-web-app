import { LayoutDashboard, Ticket, UserCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/shared/layout/DashboardLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SidebarNavItem } from '@/shared/layout/DashboardLayout/DashboardSidebar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

const instructorNavItems: SidebarNavItem[] = [
  { to: '/instructor', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/instructor/bookings', label: 'My Bookings', icon: Ticket },
  { to: '/instructor/profile', label: 'My Profile', icon: UserCircle2 },
];

// Instructor-role area: its own minimal shell, distinct from both the
// admin dashboard and the member account area. Scope starts small (just
// an overview + profile) and can grow once instructor-facing features
// (e.g. their own class schedule) are needed.
export const InstructorLayout = () => {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout
      navItems={instructorNavItems}
      sidebarEyebrow="Instructor"
      topbar={{
        title: 'Instructor',
        userLabel: user?.full_name || user?.email,
        onLogout: logout,
        notificationBell: <NotificationBell />,
      }}
    />
  );
};
