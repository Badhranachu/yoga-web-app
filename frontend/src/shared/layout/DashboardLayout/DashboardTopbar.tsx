import { LogOut, UserCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export type DashboardTopbarProps = {
  title?: string;
  userLabel?: string;
  onLogout?: () => void;
  notificationBell?: ReactNode;
};

// Presentational only — auth state and page title are supplied by the
// composing feature so this stays reusable across admin and user surfaces.
export const DashboardTopbar = ({ title = 'Dashboard', userLabel, onLogout, notificationBell }: DashboardTopbarProps) => (
  <header className="h-20 shrink-0 border-b border-[#2B241E]/10 bg-[#F5EFE5]/80 backdrop-blur-md flex items-center justify-between px-8">
    <h1 className="font-serif text-xl text-[#2B241E]">{title}</h1>
    <div className="flex items-center gap-6 text-[#786A58]">
      {notificationBell}
      <div className="flex items-center gap-2">
        <UserCircle size={24} strokeWidth={1.5} />
        {userLabel && <span className="text-sm text-[#2B241E]">{userLabel}</span>}
      </div>
      {onLogout && (
        <button
          onClick={onLogout}
          aria-label="Log out"
          className="flex items-center gap-2 text-sm hover:text-[#D8B46A] transition-colors"
        >
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  </header>
);
