import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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
  mobileOpen: boolean;
  onMobileClose: () => void;
};

// Same design language as the public site (sand/gold/dark palette, serif
// wordmark). Nav items are supplied by the composing layout (Admin vs. User)
// so this one component serves both roles instead of duplicating the shell.
// Desktop (md+): a fixed, always-visible icon+label rail, own scroll region.
// Mobile: hidden off-canvas by default, slides in as a full-label overlay
// panel (hamburger-triggered from DashboardTopbar) with a backdrop — matches
// the standard mobile sidebar pattern rather than squeezing labels into a
// narrow icon rail.
export const DashboardSidebar = ({ navItems, eyebrow = 'Studio Dashboard', mobileOpen, onMobileClose }: DashboardSidebarProps) => {
  const content = (onLinkClick?: () => void) => (
    <>
      <div className="border-b border-[#D8B46A]/10 px-6 py-8">
        <div className="text-xl font-serif tracking-wide">
          Harmony <span className="text-[#D8B46A] italic">Fusion Studio</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[#F5EFE5]/40">{eyebrow}</div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm tracking-wide transition-colors duration-200 active:scale-[0.98] ${
                isActive ? 'bg-[#D8B46A]/15 text-[#D8B46A]' : 'text-[#F5EFE5]/70 hover:bg-white/5 hover:text-[#F5EFE5]'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop rail — always visible, own independent scroll region */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-[#2B241E] text-[#F5EFE5] md:flex">
        {content()}
      </aside>

      {/* Mobile off-canvas overlay — animated slide-in/backdrop-fade */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={onMobileClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-[#2B241E]/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: [0.25, 0.1, 0.25, 1], duration: 0.3 }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-[#2B241E] text-[#F5EFE5] shadow-2xl"
            >
              <div className="flex items-center justify-end px-4 pt-4">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={onMobileClose}
                  className="rounded-lg p-2 text-[#F5EFE5]/70 hover:bg-white/5 hover:text-[#F5EFE5] active:scale-95 transition-transform"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
              {content(onMobileClose)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
