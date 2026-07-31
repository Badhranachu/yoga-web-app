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
  <aside className="w-64 shrink-0 bg-[#2B241E] text-[#F5EFE5] min-h-screen flex flex-col">
    <div className="px-6 py-8 border-b border-[#D8B46A]/10">
      <div className="text-xl font-serif tracking-wide">
        EKAM <span className="text-[#D8B46A] italic">Yoga</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-[#F5EFE5]/40 mt-1">{eyebrow}</div>
    </div>

    <nav className="flex-1 px-4 py-6 space-y-1">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm tracking-wide transition-colors ${
              isActive ? 'bg-[#D8B46A]/15 text-[#D8B46A]' : 'text-[#F5EFE5]/70 hover:bg-white/5 hover:text-[#F5EFE5]'
            }`
          }
        >
          <Icon size={18} strokeWidth={1.5} />
          {label}
        </NavLink>
      ))}
    </nav>
  </aside>
);
