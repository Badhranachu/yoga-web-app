import { useAuth } from '@/features/auth/hooks/useAuth';

// Minimal instructor landing page. Scope is intentionally small for now —
// instructors don't yet have their own schedule/booking view; this is the
// placeholder that confirms their account and role-based routing work.
export const InstructorOverviewPage = () => {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">
        Welcome{user?.first_name ? `, ${user.first_name}` : ''}
      </h2>
      <p className="text-sm text-[#786A58]">
        Your instructor dashboard. Reach out to the studio admin if you need anything updated.
      </p>
    </div>
  );
};
