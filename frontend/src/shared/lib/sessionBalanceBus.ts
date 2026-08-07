// Fires whenever the member's session balance changes (booking, purchase,
// attendance reversal) so UI outside the component that made the change —
// e.g. SessionsRemainingBadge in the persistent account layout — can
// refetch instead of showing a stale count until the next full reload.
const target = new EventTarget();
const EVENT = 'session-balance-changed';

export const notifySessionBalanceChanged = () => {
  target.dispatchEvent(new Event(EVENT));
};

export const onSessionBalanceChanged = (handler: () => void) => {
  target.addEventListener(EVENT, handler);
  return () => target.removeEventListener(EVENT, handler);
};
