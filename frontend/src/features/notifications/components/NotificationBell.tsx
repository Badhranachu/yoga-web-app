import { Bell, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notificationsApi';
import type { Notification } from '../types';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const NotificationBell = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadCount = async () => {
    try {
      setUnreadCount(await notificationsApi.getUnreadCount());
    } catch {
      // The bell remains passive if notifications are temporarily unavailable.
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await notificationsApi.getNotifications();
      setNotifications(response.results);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    void loadCount();
    const interval = window.setInterval(() => void loadCount(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) void loadNotifications();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationsApi.markRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-label="Notifications" aria-expanded={isOpen} className="relative text-[#786A58] hover:text-[#D8B46A] transition-colors">
        <Bell size={20} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#D8B46A] px-1 text-[9px] font-medium text-[#2B241E]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-80 rounded-2xl border border-[#2B241E]/10 bg-[#F5EFE5] p-3 shadow-xl">
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 className="font-serif text-lg text-[#2B241E]">Notifications</h2>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button type="button" onClick={() => void handleMarkAllRead()} className="text-[10px] uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A]">
                  Mark All Read
                </button>
              )}
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close notifications" className="text-[#786A58] hover:text-[#2B241E] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {notifications.length === 0 && <p className="px-2 py-4 text-sm text-[#786A58]">No notifications.</p>}
            {notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => void handleNotificationClick(notification)} className={`w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/60 ${notification.is_read ? 'opacity-65' : 'bg-white/45'}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-[#2B241E]">{notification.title}</span>
                  <span className="text-[10px] text-[#786A58]">{formatDate(notification.created_at)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#786A58]">{notification.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
