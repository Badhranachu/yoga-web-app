import { useState } from 'react';
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
// component reusable and auth-agnostic. Sidebar and main content each get
// their own scroll region (independent of one another) via h-screen +
// overflow-y-auto rather than letting the whole page scroll as one unit.
export const DashboardLayout = ({ navItems, sidebarEyebrow, topbar }: DashboardLayoutProps) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F5EFE5] text-[#2B241E]">
      <DashboardSidebar
        navItems={navItems}
        eyebrow={sidebarEyebrow}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar {...topbar} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
