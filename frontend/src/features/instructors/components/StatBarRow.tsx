type Bar = { label: string; value: number; display: string };

type Props = { bars: Bar[]; color?: string };

// Magnitude comparison across a fixed small set (today/month/total) — one
// sequential hue, thin recessive track, rounded data-end. Not a full axis
// chart since there's no continuous scale to read off, just three
// comparable numbers.
export const StatBarRow = ({ bars, color = 'var(--gold-dark)' }: Props) => {
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <div className="space-y-3">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs uppercase tracking-widest text-[#786A58]">{bar.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E8DDCC]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-serif text-sm text-[#2B241E]">{bar.display}</span>
        </div>
      ))}
    </div>
  );
};
