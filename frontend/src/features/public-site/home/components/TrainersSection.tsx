import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RevealSection } from '@/shared/ui/RevealSection';
import { instructorsApi } from '@/features/instructors/api/instructorsApi';
import type { PublicInstructor } from '@/features/instructors/types';

// Auto-advancing left-to-right slideshow of instructors the admin has
// flagged show_on_homepage. Falls back to nothing (section hides itself)
// when no instructor is currently flagged, rather than showing stale
// placeholder trainers.
export const TrainersSection = () => {
  const [instructors, setInstructors] = useState<PublicInstructor[] | null>(null);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setInstructors(await instructorsApi.listPublic());
      } catch {
        setInstructors([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!instructors || instructors.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((current) => (current + 1) % instructors.length);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [instructors]);

  if (!instructors || instructors.length === 0) return null;

  return (
    <RevealSection id="trainers" className="bg-[#E8DDCC] relative overflow-hidden">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h4 className="text-[#D8B46A] tracking-widest uppercase text-sm mb-4">Meet The Team</h4>
          <h2 className="text-4xl md:text-5xl font-serif text-[#2B241E]">
            Trainers who teach from <i className="text-[#786A58]">experience.</i>
          </h2>
        </div>

        <div className="relative mx-auto max-w-2xl overflow-hidden">
          <div className="flex">
            {instructors.map((trainer, idx) => (
              <motion.div
                key={trainer.id}
                initial={false}
                animate={{ x: `${(idx - index) * 100}%`, opacity: idx === index ? 1 : 0 }}
                transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
                className="absolute inset-0 flex flex-col items-center"
                style={{ pointerEvents: idx === index ? 'auto' : 'none' }}
              >
                <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem] mb-8">
                  {trainer.photo ? (
                    <img
                      src={trainer.photo}
                      alt={trainer.name ?? 'Instructor'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#2B241E]/10 text-sm text-[#786A58]">
                      No photo
                    </div>
                  )}
                </div>
                <div className="text-center px-4">
                  <h3 className="text-2xl font-serif text-[#2B241E] mb-2">{trainer.name ?? 'Instructor'}</h3>
                  {trainer.bio && (
                    <p className="text-[#786A58] text-sm leading-relaxed">{trainer.bio}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {/* Spacer to reserve layout height since slides are absolutely positioned for the cross-fade/slide effect. Uses the longest bio among the current instructors so the tallest slide never gets clipped. */}
          <div className="invisible">
            <div className="relative aspect-[3/4] w-full max-w-sm mx-auto mb-8" />
            <div className="text-center px-4">
              <h3 className="text-2xl font-serif mb-2">&nbsp;</h3>
              <p className="text-sm leading-relaxed">
                {instructors.reduce((longest, t) => (t.bio.length > longest.length ? t.bio : longest), '')}
              </p>
            </div>
          </div>
        </div>

        {instructors.length > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {instructors.map((trainer, idx) => (
              <button
                key={trainer.id}
                type="button"
                aria-label={`Show ${trainer.name ?? 'instructor'}`}
                onClick={() => setIndex(idx)}
                className={`h-2 rounded-full transition-all duration-500 ${idx === index ? 'w-6 bg-[#D8B46A]' : 'w-2 bg-[#2B241E]/20'}`}
              />
            ))}
          </div>
        )}
      </div>
    </RevealSection>
  );
};
