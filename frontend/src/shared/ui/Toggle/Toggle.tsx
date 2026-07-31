export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

// Small pill switch in the site's gold accent, for boolean settings
// (e.g. "is this weekday open"). Matches the rounded-pill language already
// used by Button.
export const Toggle = ({ checked, onChange, label, disabled }: ToggleProps) => (
  <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-[#D8B46A]' : 'bg-[#2B241E]/20'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
    {label && <span className="text-sm text-[#2B241E]">{label}</span>}
  </label>
);
