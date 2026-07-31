import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'glass';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

const baseStyle =
  'relative overflow-hidden group px-8 py-4 rounded-full flex items-center justify-center gap-3 text-sm tracking-widest uppercase font-medium transition-all duration-500';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[#2B241E] text-white hover:bg-[#D8B46A]',
  outline: 'border border-[#2B241E]/20 text-[#2B241E] hover:border-[#D8B46A] hover:text-[#D8B46A]',
  glass: 'glass-panel text-[#2B241E] hover:bg-white/30',
};

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => (
  <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
    <span className="relative z-10 flex items-center gap-2">{children}</span>
    {variant === 'primary' && (
      <div className="absolute inset-0 bg-gradient-to-r from-[#D8B46A] to-[#b89445] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    )}
  </button>
);
