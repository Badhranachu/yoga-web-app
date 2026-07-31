import { Outlet } from 'react-router-dom';
import { DashboardSidebar, type SidebarNavItem } from './DashboardSidebar';
import { DashboardTopbar, type DashboardTopbarProps } from './DashboardTopbar';

export type DashboardLayoutProps = {
  navItems: SidebarNavItem[];
  sidebarEyebrow?: string;
  topbar?: DashboardTopbarProps;
};

// Shell shared by every authenticated surface (admin dashboard, user
// account area). Reuses the same palette and typography tokens as the
// public site. Auth-aware composition (nav items, logout handler, current
// user) is supplied by the feature that renders this, keeping this
// component reusable and auth-agnostic.
export const DashboardLayout = ({ navItems, sidebarEyebrow, topbar }: DashboardLayoutProps) => (
  <div className="flex min-h-screen bg-[#F5EFE5] text-[#2B241E]">
    <DashboardSidebar navItems={navItems} eyebrow={sidebarEyebrow} />
    <div className="flex-1 flex flex-col">
      <DashboardTopbar {...topbar} />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  </div>
);
