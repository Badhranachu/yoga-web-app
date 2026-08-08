import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export type SidebarNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type DashboardSidebarProps = {
  navItems: SidebarNavItem[];
  eyebrow?: string;
};

// Same design language as the public site (sand/gold/dark palette, serif
// wordmark). Nav items are supplied by the composing layout (Admin vs. User)
// so this one component serves both roles instead of duplicating the shell.
export const DashboardSidebar = ({ navItems, eyebrow = 'Studio Dashboard' }: DashboardSidebarProps) => (
  <aside className="w-20 shrink-0 bg-[#2B241E] text-[#F5EFE5] min-h-screen flex flex-col md:w-64">
    <div className="border-b border-[#D8B46A]/10 px-3 py-8 md:px-6">
      <div className="text-center text-xl font-serif tracking-wide md:text-left">
        Harmony <span className="text-[#D8B46A] italic">Fusion Studio</span>
      </div>
      <div className="mt-1 hidden text-[10px] uppercase tracking-[0.3em] text-[#F5EFE5]/40 md:block">{eyebrow}</div>
    </div>

    <nav className="flex-1 space-y-1 px-2 py-6 md:px-4">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm tracking-wide transition-colors md:justify-start md:px-4 ${
              isActive ? 'bg-[#D8B46A]/15 text-[#D8B46A]' : 'text-[#F5EFE5]/70 hover:bg-white/5 hover:text-[#F5EFE5]'
            }`
          }
        >
          <Icon size={18} strokeWidth={1.5} />
          <span className="hidden md:inline">{label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
