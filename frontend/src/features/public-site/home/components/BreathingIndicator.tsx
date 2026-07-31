import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Phase = 'INHALE' | 'HOLD' | 'EXHALE';

export const BreathingIndicator = () => {
  const [phase, setPhase] = useState<Phase>('INHALE');

  useEffect(() => {
    const cycle = () => {
      setPhase('INHALE');
      setTimeout(() => setPhase('HOLD'), 4000);
      setTimeout(() => setPhase('EXHALE'), 6000);
    };
    cycle();
    const interval = setInterval(cycle, 10000); // 4s inhale, 2s hold, 4s exhale
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 mt-16 md:mt-24">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <motion.div
          animate={{
            scale: phase === 'INHALE' ? 1.5 : phase === 'HOLD' ? 1.5 : 1,
            opacity: phase === 'HOLD' ? 0.8 : 0.3,
          }}
          transition={{ duration: phase === 'HOLD' ? 2 : 4, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full border border-[#D8B46A]"
        />
        <motion.div
          animate={{
            scale: phase === 'INHALE' ? 1.2 : phase === 'HOLD' ? 1.2 : 0.8,
            backgroundColor: phase === 'HOLD' ? 'rgba(216, 180, 106, 0.2)' : 'rgba(216, 180, 106, 0.05)',
          }}
          transition={{ duration: phase === 'HOLD' ? 2 : 4, ease: 'easeInOut' }}
          className="absolute inset-4 rounded-full border border-[#D8B46A]/50 backdrop-blur-sm"
        />
        <div className="z-10 text-[10px] tracking-[0.3em] font-medium text-[#786A58] uppercase">
          {phase}
        </div>
      </div>
    </div>
  );
};
