import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/shared/ui/Button';
import { luxuryTransition } from '@/shared/lib/motion';
import { BreathingIndicator } from './BreathingIndicator';

export const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-32 pb-16 md:pt-36">
      <motion.div style={{ y: y1 }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5EFE5]/30 via-transparent to-[#F5EFE5] z-10" />
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2574&auto=format&fit=crop"
          alt="Luxury Desert Architecture"
          className="w-full h-[120%] object-cover object-center transform -translate-y-10"
        />
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-multiply z-10"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
      </motion.div>

      <motion.div style={{ opacity }} className="container relative z-20 mx-auto px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...luxuryTransition, delay: 0.2 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-12 h-[1px] bg-[#D8B46A]" />
          <span className="text-sm tracking-widest uppercase text-[#786A58]">Dubai &amp; Online • Est. 2026</span>
          <div className="w-12 h-[1px] bg-[#D8B46A]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...luxuryTransition, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-serif text-[#2B241E] leading-[1.1] mb-8 max-w-4xl"
        >
          Practice on your 1 <span className="italic text-gradient-gold">schedule</span>,<br />
          guided by hands that<br />
          know the mat.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...luxuryTransition, delay: 0.6 }}
          className="text-lg md:text-xl text-[#786A58] max-w-2xl font-light mb-12"
        >
          Live studio sessions, bespoke one-on-one journeys, and corporate wellness programs across the UAE. Taught with intention.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...luxuryTransition, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          <Button>Book your first class</Button>
          <Button variant="glass">Explore Programs</Button>
        </motion.div>

        <BreathingIndicator />
      </motion.div>
    </section>
  );
};
