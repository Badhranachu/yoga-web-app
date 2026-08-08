export type LoadingBarProps = {
  label?: string;
};

// Indeterminate progress bar — these loads are a single small API call
// with no real byte-count to report, so a fake percentage would be
// dishonest. A sliding bar (the same pattern as YouTube/GitHub's
// top-of-page loader) reads as "actively working" without claiming to
// know how long it'll take.
export const LoadingBar = ({ label = 'Loading…' }: LoadingBarProps) => (
  <div role="status" aria-live="polite" className="py-2">
    {label && <div className="mb-2 text-sm text-brown">{label}</div>}
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-beige/60">
      <div className="h-full w-1/3 animate-loading-bar rounded-full bg-gold-dark motion-reduce:animate-none motion-reduce:w-full" />
    </div>
  </div>
);
