type Segment = { label: string; value: number; color: string };

type Props = { segments: Segment[]; centerLabel: string; centerValue: number };

const RADIUS = 70;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Single-series identity donut (3 fixed, always-present categories — never a
// generated Nth hue), 2px surface gaps between arcs per the mark spec, with
// the total as a stat-tile number in the center rather than repeated as a
// slice label.
export const AttendanceDonutChart = ({ segments, centerLabel, centerValue }: Props) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const gapDegrees = total > 0 ? 3 : 0;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
          <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="var(--beige)" strokeWidth={STROKE} />
          {total > 0 &&
            segments.map((segment) => {
              const fraction = segment.value / total;
              const arcLength = Math.max(fraction * CIRCUMFERENCE - gapDegrees, 0);
              const dashArray = `${arcLength} ${CIRCUMFERENCE - arcLength}`;
              const dashOffset = -cumulativeOffset;
              cumulativeOffset += fraction * CIRCUMFERENCE;
              if (segment.value === 0) return null;
              return (
                <circle
                  key={segment.label}
                  cx="90"
                  cy="90"
                  r={RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={STROKE}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-3xl text-[#2B241E]">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-widest text-[#786A58]">{centerLabel}</span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span className="text-[#786A58]">{segment.label}</span>
            <span className="ml-auto font-medium text-[#2B241E] sm:ml-4">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
