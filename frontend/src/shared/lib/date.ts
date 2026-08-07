// Formats a Date as "YYYY-MM-DD" using its local Y/M/D fields — never
// toISOString(), which converts through UTC first and rolls the date back
// or forward a day for any timezone offset from UTC.
export const toLocalIso = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const todayIso = () => toLocalIso(new Date());

export const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const oneDayLater = (isoDate: string) => {
  const next = new Date(`${isoDate}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return toLocalIso(next);
};

// Every date (inclusive) between from and to, as "YYYY-MM-DD" keys.
export const datesInRange = (from: string, to: string): string[] => {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(toLocalIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};
