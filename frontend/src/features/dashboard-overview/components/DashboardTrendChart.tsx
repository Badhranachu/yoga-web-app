import type { TrendPoint } from '../types';

type Props = { title: string; points: TrendPoint[]; currency?: boolean };

export const DashboardTrendChart = ({ title, points, currency = false }: Props) => {
  const values = points.map((point) => Number(point.value) || 0);
  const max = Math.max(...values, 1);
  const coordinates = values.map((value, index) => {
    const x = points.length > 1 ? (index / (points.length - 1)) * 300 + 10 : 160;
    const y = 112 - (value / max) * 88;
    return `${x},${y}`;
  }).join(' ');
  const coordinatePairs = coordinates.split(' ').map((coordinate) => coordinate.split(','));

  return (
    <section className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
      <h3 className="font-serif text-xl text-dark">{title}</h3>
      <svg viewBox="0 0 320 140" className="mt-4 h-36 w-full" role="img" aria-label={`${title} chart`}>
        <line x1="10" y1="112" x2="310" y2="112" stroke="var(--beige)" />
        <polyline points={coordinates} fill="none" stroke="var(--gold-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const [x = 0, y = 112] = coordinatePairs[index] ?? [];
          return <circle key={point.date} cx={x} cy={y} r="3.5" fill="var(--dark)" />;
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-brown">
        {points.map((point) => <span key={point.date}>{point.label}</span>)}
      </div>
      <div className="mt-3 flex justify-between text-xs text-brown">
        <span>{points[0] ? (currency ? `INR ${points[0].value}` : points[0].value) : '0'}</span>
        <span>{points.at(-1) ? (currency ? `INR ${points.at(-1)?.value}` : points.at(-1)?.value) : '0'}</span>
      </div>
    </section>
  );
};
