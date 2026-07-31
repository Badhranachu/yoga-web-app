// Shared easing/transition presets so animation feel stays consistent
// across the public site and the dashboard.
export const easeOutQuart = [0.25, 1, 0.5, 1] as const;

export const luxuryTransition = {
  duration: 1.2,
  ease: [0.16, 1, 0.3, 1] as const,
};
