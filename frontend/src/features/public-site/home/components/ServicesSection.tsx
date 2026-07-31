import { motion } from 'framer-motion';
import { MoveUpRight } from 'lucide-react';
import { RevealSection } from '@/shared/ui/RevealSection';
import { services } from '../data/homeContent';

export const ServicesSection = () => (
  <RevealSection id="journeys" className="bg-[#F5EFE5] relative z-20">
    <div className="container mx-auto px-6 md:px-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <div className="max-w-2xl">
          <h4 className="text-[#D8B46A] tracking-widest uppercase text-sm mb-4">What We Offer</h4>
          <h2 className="text-4xl md:text-5xl font-serif text-[#2B241E]">
            Four ways to build a practice that <i className="text-[#786A58]">sticks.</i>
          </h2>
        </div>
        <p className="text-[#786A58] max-w-sm">
          Whether you train alone, in a group, from home, or the office—there's a format meticulously crafted for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((service, idx) => (
          <motion.div key={idx} whileHover={{ y: -10 }} className="group cursor-pointer">
            <div className="relative h-[400px] rounded-2xl overflow-hidden mb-6">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-700 z-10" />
              <img
                src={service.img}
                alt={service.title}
                className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute top-6 left-6 z-20 glass-panel px-3 py-1 rounded-full text-xs text-white">
                {service.num}
              </div>
              <div className="absolute bottom-6 right-6 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-4 group-hover:translate-x-0">
                <MoveUpRight size={18} />
              </div>
            </div>

            <div className="w-12 h-[1px] bg-[#D8B46A] mb-4 transform origin-left transition-transform duration-500 group-hover:scale-x-150" />
            <h3 className="text-2xl font-serif text-[#2B241E] mb-3">{service.title}</h3>
            <p className="text-[#786A58] text-sm leading-relaxed">{service.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </RevealSection>
);
