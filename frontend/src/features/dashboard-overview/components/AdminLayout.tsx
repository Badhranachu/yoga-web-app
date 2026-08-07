import { LayoutDashboard, CalendarDays, Users, UserSquare2, CalendarX2, Ticket, CreditCard, FileBarChart2, Bell } from 'lucide-react';
import { DashboardLayout } from '@/shared/layout/DashboardLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SidebarNavItem } from '@/shared/layout/DashboardLayout/DashboardSidebar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

const adminNavItems: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/classes', label: 'Timetable', icon: CalendarDays },
  { to: '/dashboard/members', label: 'Members', icon: Users },
  { to: '/dashboard/instructors', label: 'Instructors', icon: UserSquare2 },
  { to: '/dashboard/instructor-leave', label: 'Instructor Leave', icon: CalendarX2 },
  { to: '/dashboard/bookings', label: 'Bookings', icon: Ticket },
  { to: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/reports', label: 'Reports', icon: FileBarChart2 },
];

// Admin-role dashboard shell: full studio-management navigation.
export const AdminLayout = () => {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout
      navItems={adminNavItems}
      sidebarEyebrow="Studio Dashboard"
      topbar={{ title: 'Dashboard', userLabel: user?.full_name || user?.email, onLogout: logout, notificationBell: <NotificationBell /> }}
    />
  );
};
