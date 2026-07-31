import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { luxuryTransition } from '@/shared/lib/motion';

export type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

// Shared shell for every auth page (login/register/forgot/reset). Reuses the
// homepage's sand background, serif headings, gold accents, and glass-panel
// utility — no new visual language introduced.
export const AuthCard = ({ title, subtitle, children, footer }: AuthCardProps) => (
  <div className="min-h-screen bg-[#F5EFE5] flex items-center justify-center px-6 py-24">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={luxuryTransition}
      className="w-full max-w-md"
    >
      <Link to="/" className="flex justify-center mb-10 text-2xl font-serif tracking-wide text-[#2B241E]">
        EKAM <span className="text-[#D8B46A] italic">Yoga</span>
      </Link>

      <div className="glass-panel bg-white/40 rounded-3xl p-8 md:p-10 border border-white/50 shadow-lg">
        <h1 className="font-serif text-3xl text-[#2B241E] mb-2 text-center">{title}</h1>
        {subtitle && <p className="text-sm text-[#786A58] text-center mb-8">{subtitle}</p>}
        {children}
      </div>

      {footer && <div className="mt-8 text-center text-sm text-[#786A58]">{footer}</div>}
    </motion.div>
  </div>
);
