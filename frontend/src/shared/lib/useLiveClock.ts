import { useEffect, useState } from 'react';

// Forces a periodic re-render so time-derived UI (e.g. getEffectiveStatus
// computing "expired" once a class's end time passes) stays correct as
// real time moves forward — without this, a page that loaded at 8:55 PM
// would keep showing an 8-9 PM class as "Booked" indefinitely, since
// nothing else re-renders the component once the clock ticks past 9 PM.
// Doesn't expose the Date itself — callers that need "now" should just
// call `new Date()` at render time, this hook only supplies the tick.
export const useLiveClock = (intervalMs = 30_000) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
};
