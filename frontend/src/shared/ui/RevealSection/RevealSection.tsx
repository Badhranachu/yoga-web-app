import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { luxuryTransition } from '@/shared/lib/motion';

export type RevealSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
};

// Animated section wrapper for scroll reveals — shared by public site and dashboard.
export const RevealSection = ({ children, className = '', delay = 0, id }: RevealSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ y: 50, opacity: 0, filter: 'blur(5px)' }}
      animate={isInView ? { y: 0, opacity: 1, filter: 'blur(0px)' } : {}}
      transition={{ ...luxuryTransition, delay }}
      className={`py-24 md:py-32 ${className}`}
    >
      {children}
    </motion.section>
  );
};
