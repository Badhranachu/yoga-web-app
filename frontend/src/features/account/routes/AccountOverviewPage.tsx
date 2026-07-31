import { useAuth } from '@/features/auth/hooks/useAuth';

// Placeholder member landing page. Bookings/payments history land here once
// those business modules are implemented.
export const AccountOverviewPage = () => {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">
        Welcome{user?.first_name ? `, ${user.first_name}` : ''}
      </h2>
      <p className="text-[#786A58] text-sm">Your upcoming classes and bookings will appear here.</p>
    </div>
  );
};
