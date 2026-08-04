import { useLayoutEffect } from 'react';

// Locks page scroll behind a full-screen modal/dialog overlay while active.
// Without this, the page underneath a fixed-position dialog keeps scrolling
// on wheel/touch input even though the dialog visually covers it. Pass
// false (e.g. from an `isOpen` flag) to skip locking without unmounting
// the component that calls this hook.
export const useBodyScrollLock = (active: boolean = true) => {
  useLayoutEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
};
