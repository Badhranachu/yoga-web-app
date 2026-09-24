import { LayoutDashboard, CalendarDays, CalendarCheck2, Users, UserSquare2, CalendarX2, CalendarOff, Ticket, CreditCard, FileBarChart2, Bell, UserCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/shared/layout/DashboardLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SidebarNavItem } from '@/shared/layout/DashboardLayout/DashboardSidebar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

const adminNavItems: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/instructor-attendance', label: 'Instructor Attendance', icon: CalendarCheck2 },
  { to: '/dashboard/classes', label: 'Timetable', icon: CalendarDays },
  { to: '/dashboard/institution-leave', label: 'Institution Full Leave', icon: CalendarOff },
  { to: '/dashboard/members', label: 'Members', icon: Users },
  { to: '/dashboard/instructors', label: 'Instructors', icon: UserSquare2 },
  { to: '/dashboard/instructor-leave', label: 'Instructor Leave', icon: CalendarX2 },
  { to: '/dashboard/bookings', label: 'Bookings', icon: Ticket },
  { to: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/dashboard/profile', label: 'My Profile', icon: UserCircle2 },
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
