import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { notificationsApi } from '../api/notificationsApi';
import type { Notification } from '../types';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

type NotificationCardProps = {
  notification: Notification;
  onClick: (notification: Notification) => void;
};

const NotificationCard = ({ notification, onClick }: NotificationCardProps) => (
  <button
    type="button"
    onClick={() => onClick(notification)}
    className={`w-full rounded-xl border border-[#2B241E]/10 px-4 py-3 text-left transition-colors hover:bg-white/60 ${
      notification.is_read ? 'opacity-65' : 'bg-white/45'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm font-medium text-[#2B241E]">{notification.title}</span>
      <span className="text-[11px] shrink-0 text-[#786A58]">{formatDate(notification.created_at)}</span>
    </div>
    <p className="mt-1 text-xs leading-relaxed text-[#786A58]">{notification.message}</p>
  </button>
);

// Full notification history, one level deeper than the topbar bell's
// dropdown preview. Split into two columns — New (unread) and Read — so
// unread items are never buried in a long mixed list. Shared by both the
// member account area and the admin dashboard (each user only ever sees
// their own notifications, so the same page works for both roles).
export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await notificationsApi.getNotifications();
      setNotifications(response.results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load notifications.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationsApi.markRead(notification.id);
      setNotifications((current) =>
        current ? current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)) : current,
      );
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((current) => (current ? current.map((item) => ({ ...item, is_read: true })) : current));
  };

  const { unread, read } = useMemo(() => {
    const list = notifications ?? [];
    return {
      unread: list.filter((item) => !item.is_read),
      read: list.filter((item) => item.is_read),
    };
  }, [notifications]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[#2B241E]">Notifications</h2>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A]"
          >
            Mark All Read
          </button>
        )}
      </div>
      <p className="text-[#786A58] text-sm mb-8">Bookings, payments, and account updates.</p>

      <FormError message={error} />

      {notifications === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-[#786A58]">No notifications.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-widest text-[#786A58]">New ({unread.length})</h3>
            {unread.length === 0 ? (
              <p className="text-sm text-[#786A58]">Nothing new.</p>
            ) : (
              <div className="space-y-2">
                {unread.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} onClick={handleClick} />
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-widest text-[#786A58]">Read ({read.length})</h3>
            {read.length === 0 ? (
              <p className="text-sm text-[#786A58]">No read notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {read.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} onClick={handleClick} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
