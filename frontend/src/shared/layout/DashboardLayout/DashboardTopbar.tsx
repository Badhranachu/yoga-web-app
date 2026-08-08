import { LogOut, Menu, UserCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export type DashboardTopbarProps = {
  title?: string;
  userLabel?: string;
  onLogout?: () => void;
  notificationBell?: ReactNode;
  onMenuClick?: () => void;
};

// Presentational only — auth state and page title are supplied by the
// composing feature so this stays reusable across admin and user surfaces.
export const DashboardTopbar = ({ title = 'Dashboard', userLabel, onLogout, notificationBell, onMenuClick }: DashboardTopbarProps) => (
  <header className="h-20 shrink-0 border-b border-[#2B241E]/10 bg-[#F5EFE5]/80 backdrop-blur-md flex items-center justify-between gap-3 px-4 md:px-8">
    <div className="flex min-w-0 items-center gap-3">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-1.5 text-[#2B241E] transition-colors duration-200 hover:bg-[#2B241E]/5 active:scale-95 md:hidden"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>
      )}
      <h1 className="font-serif text-lg md:text-xl text-[#2B241E] truncate">{title}</h1>
    </div>
    <div className="flex items-center gap-3 md:gap-6 text-[#786A58] shrink-0">
      {notificationBell}
      <div className="flex items-center gap-2">
        <UserCircle size={24} strokeWidth={1.5} />
        {userLabel && <span className="hidden sm:inline text-sm text-[#2B241E] max-w-[10rem] truncate">{userLabel}</span>}
      </div>
      {onLogout && (
        <button
          onClick={onLogout}
          aria-label="Log out"
          className="flex items-center gap-2 text-sm transition-colors duration-200 hover:text-[#D8B46A] active:scale-95"
        >
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  </header>
);
