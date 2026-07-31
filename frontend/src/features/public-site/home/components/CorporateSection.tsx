import { motion } from 'framer-motion';
import { RevealSection } from '@/shared/ui/RevealSection';
import { Button } from '@/shared/ui/Button';
import { corporateOfferings } from '../data/homeContent';

export const CorporateSection = () => (
  <RevealSection className="bg-[#2B241E] text-[#F5EFE5]">
    <div className="container mx-auto px-6 md:px-12">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="aspect-[4/5] rounded-3xl overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop"
              alt="Corporate Wellness"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[#2B241E]/30 mix-blend-multiply" />
          </div>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="absolute -bottom-10 -right-10 lg:right-[-10%] glass-panel bg-[#E8DDCC]/10 p-8 rounded-2xl max-w-xs backdrop-blur-xl border border-white/10"
          >
            <div className="text-[#D8B46A] text-4xl font-serif mb-2">35+</div>
            <div className="text-sm text-[#F5EFE5]/80">UAE companies trust Ekam to bring balance to their boardrooms.</div>
          </motion.div>
        </div>

        <div className="lg:pl-12">
          <h4 className="text-[#D8B46A] tracking-widest uppercase text-sm mb-4">For Teams</h4>
          <h2 className="text-4xl md:text-5xl font-serif mb-8 leading-tight">
            Wellness as a standing benefit, not a <i className="text-[#D8B46A]">one-off.</i>
          </h2>
          <p className="text-[#F5EFE5]/70 text-lg font-light mb-12">
            We run recurring on-site or virtual sessions for offices across the UAE—built around your team's schedule, not the other way around.
          </p>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#D8B46A]/50 before:to-transparent">
            {corporateOfferings.map((item, idx) => (
              <div key={idx} className="relative flex items-start gap-6">
                <div className="relative z-10 w-6 h-6 rounded-full bg-[#2B241E] border border-[#D8B46A] flex items-center justify-center shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#D8B46A]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-4 mb-1">
                    <h3 className="text-xl font-serif">{item.title}</h3>
                    <span className="text-[#D8B46A] text-xs uppercase tracking-wider">{item.time}</span>
                  </div>
                  <p className="text-[#F5EFE5]/50 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="mt-12 border-[#D8B46A] text-[#D8B46A] hover:bg-[#D8B46A] hover:text-[#2B241E]">
            Request a Proposal
          </Button>
        </div>
      </div>
    </div>
  </RevealSection>
);
