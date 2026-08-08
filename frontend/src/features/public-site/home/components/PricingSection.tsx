import { Check, X } from 'lucide-react';
import { RevealSection } from '@/shared/ui/RevealSection';
import { Button } from '@/shared/ui/Button';
import { buildWhatsAppHref } from '@/shared/ui/icons/socialLinks';

const CUSTOM_PLAN_WHATSAPP_HREF = buildWhatsAppHref(
  "Hi! I'd like to inquire about a custom multi-month plan at Harmony Fusion Studio.",
);

export const PricingSection = () => (
  <RevealSection className="bg-[#F5EFE5]">
    <div className="container mx-auto px-6 md:px-12">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <h4 className="text-[#D8B46A] tracking-widest uppercase text-sm mb-4">Packages</h4>
        <h2 className="text-4xl md:text-5xl font-serif text-[#2B241E]">
          Simple pricing, built to grow <i className="text-[#786A58]">with you.</i>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
        <div className="bg-white/40 rounded-3xl p-10 border border-white/50 shadow-lg hover:-translate-y-2 transition-transform duration-500">
          <div className="text-[#786A58] text-sm uppercase tracking-widest mb-4">Drop-In</div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-serif text-[#2B241E]">150</span>
            <span className="text-[#786A58]">INR / class</span>
          </div>
          <p className="text-sm text-[#786A58] mb-8 h-12">Try a live or online class with no commitment.</p>
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-sm text-[#2B241E]"><Check size={16} className="text-[#D8B46A]" /> One live or online session</div>
            <div className="flex items-center gap-3 text-sm text-[#2B241E]"><Check size={16} className="text-[#D8B46A]" /> Any trainer, any format</div>
            <div className="flex items-center gap-3 text-sm text-[#2B241E] opacity-40"><X size={16} /> Priority booking</div>
          </div>
          <Button variant="outline" className="w-full">Book Single Class</Button>
        </div>

        <div className="bg-[#2B241E] rounded-3xl p-10 border border-[#D8B46A]/30 shadow-2xl transform md:-translate-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#D8B46A] text-[#2B241E] text-[10px] font-bold uppercase tracking-widest py-1 px-4 rounded-bl-xl">Most Popular</div>
          <div className="text-[#D8B46A] text-sm uppercase tracking-widest mb-4">Monthly Plan</div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-serif text-[#F5EFE5]">1200</span>
            <span className="text-[#F5EFE5]/60">INR / month</span>
          </div>
          <p className="text-sm text-[#F5EFE5]/70 mb-8 h-12">Unlimited group classes, live or online, all month long.</p>
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-sm text-[#F5EFE5]"><Check size={16} className="text-[#D8B46A]" /> Unlimited group sessions</div>
            <div className="flex items-center gap-3 text-sm text-[#F5EFE5]"><Check size={16} className="text-[#D8B46A]" /> Priority booking access</div>
            <div className="flex items-center gap-3 text-sm text-[#F5EFE5]"><Check size={16} className="text-[#D8B46A]" /> 1 free 1:1 check-in monthly</div>
          </div>
          <Button variant="primary" className="w-full">Start Membership</Button>
        </div>

        <div className="bg-white/40 rounded-3xl p-10 border border-white/50 shadow-lg hover:-translate-y-2 transition-transform duration-500">
          <div className="text-[#786A58] text-sm uppercase tracking-widest mb-4">Multi-Month Journey</div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-serif text-[#2B241E]">Custom</span>
          </div>
          <p className="text-sm text-[#786A58] mb-8 h-12">A structured programme for a specific goal—flexibility, recovery, strength.</p>
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-sm text-[#2B241E]"><Check size={16} className="text-[#D8B46A]" /> Custom multi-month plan</div>
            <div className="flex items-center gap-3 text-sm text-[#2B241E]"><Check size={16} className="text-[#D8B46A]" /> Dedicated master trainer</div>
            <div className="flex items-center gap-3 text-sm text-[#2B241E]"><Check size={16} className="text-[#D8B46A]" /> Weekly progress check-ins</div>
          </div>
          <a href={CUSTOM_PLAN_WHATSAPP_HREF} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full">Inquire Now</Button>
          </a>
        </div>
      </div>
    </div>
  </RevealSection>
);
