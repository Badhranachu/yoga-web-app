import type { InputHTMLAttributes } from 'react';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

// Underline-style text input matching the homepage contact form
// (see shared/layout/Footer), adapted for light backgrounds. Any new form
// across auth, profile, or the dashboard should use this instead of a
// one-off <input>.
export const TextField = ({ label, error, id, className = '', ...props }: TextFieldProps) => {
  const inputId = id ?? props.name;

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs uppercase tracking-widest text-[#786A58] mb-2">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full bg-transparent border-b border-[#2B241E]/20 py-3 text-[#2B241E] placeholder:text-[#2B241E]/30 focus:outline-none focus:border-[#D8B46A] transition-colors ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
};
