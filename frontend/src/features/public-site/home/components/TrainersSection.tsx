import { motion } from 'framer-motion';
import { RevealSection } from '@/shared/ui/RevealSection';
import { Button } from '@/shared/ui/Button';
import { trainers } from '../data/homeContent';

export const TrainersSection = () => (
  <RevealSection id="trainers" className="bg-[#E8DDCC] relative">
    <div className="container mx-auto px-6 md:px-12">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <h4 className="text-[#D8B46A] tracking-widest uppercase text-sm mb-4">Meet The Team</h4>
        <h2 className="text-4xl md:text-5xl font-serif text-[#2B241E]">
          Trainers who teach from <i className="text-[#786A58]">experience.</i>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
        {trainers.map((trainer, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: idx * 0.2 }}
            className="group"
          >
            <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-8">
              <img
                src={trainer.img}
                alt={trainer.name}
                className="w-full h-full object-cover filter grayscale-[20%] sepia-[10%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2B241E]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                <Button variant="primary" className="w-full !py-3 !text-xs">Book Session</Button>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-serif text-[#2B241E] mb-1">{trainer.name}</h3>
              <p className="text-[#D8B46A] text-sm uppercase tracking-wider mb-4">{trainer.role}</p>
              <p className="text-[#786A58] text-sm leading-relaxed px-4">{trainer.bio}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </RevealSection>
);
