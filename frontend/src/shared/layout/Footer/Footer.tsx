import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { socialLinks } from '@/shared/ui/icons/socialLinks';

const footerLinkColumns = [
  {
    title: 'Explore',
    links: [
      { label: 'Philosophy', href: '#philosophy' },
      { label: 'Spaces', href: '#spaces' },
      { label: 'Journeys', href: '#journeys' },
      { label: 'Trainers', href: '#trainers' },
    ],
  },
  {
    title: 'Programs',
    links: [
      { label: 'Live In-Studio', href: '#journeys' },
      { label: 'Group Online', href: '#journeys' },
      { label: '1:1 Coaching', href: '#journeys' },
      { label: 'Corporate UAE', href: '#journeys' },
    ],
  },
];

// Public-site footer, extracted from the original homepage.
export const Footer = () => {
  return (
    <footer className="bg-[#2B241E] text-[#F5EFE5] pt-32 pb-10 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-serif text-[#F5EFE5]/5 whitespace-nowrap select-none pointer-events-none z-0">
        EKAM
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24 border-b border-[#D8B46A]/20 pb-20">
          <div>
            <h2 className="text-5xl md:text-7xl font-serif mb-8">
              Ready when<br />
              <i className="text-[#D8B46A]">you are.</i>
            </h2>
            <p className="text-[#F5EFE5]/60 text-lg mb-10 max-w-sm">
              Your first class is a message away. Step into the space we've created for your peace.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-10 text-sm text-[#F5EFE5]/70">
              <a href="tel:+97140000000" className="flex items-center gap-2 hover:text-[#D8B46A] transition-colors">
                <Phone size={16} strokeWidth={1.5} /> +971 4 000 0000
              </a>
              <a href="mailto:hello@ekamyoga.ae" className="flex items-center gap-2 hover:text-[#D8B46A] transition-colors">
                <Mail size={16} strokeWidth={1.5} /> hello@ekamyoga.ae
              </a>
            </div>

            <div className="flex gap-4">
              {socialLinks.map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  aria-label={name}
                  className="w-12 h-12 rounded-full border border-[#D8B46A]/30 flex items-center justify-center hover:bg-[#D8B46A] hover:text-[#2B241E] hover:border-[#D8B46A] transition-colors"
                >
                  <Icon size={18} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          <div className="glass-panel bg-white/5 p-8 md:p-10 rounded-3xl backdrop-blur-md w-full max-w-lg lg:ml-auto">
            <h3 className="font-serif text-2xl mb-6">Send an Inquiry</h3>
            <form className="space-y-6">
              <div>
                <input type="text" placeholder="Your Name" className="w-full bg-transparent border-b border-[#F5EFE5]/20 py-3 text-[#F5EFE5] placeholder:text-[#F5EFE5]/40 focus:outline-none focus:border-[#D8B46A] transition-colors" />
              </div>
              <div>
                <input type="email" placeholder="Email Address" className="w-full bg-transparent border-b border-[#F5EFE5]/20 py-3 text-[#F5EFE5] placeholder:text-[#F5EFE5]/40 focus:outline-none focus:border-[#D8B46A] transition-colors" />
              </div>
              <div>
                <select className="w-full bg-transparent border-b border-[#F5EFE5]/20 py-3 text-[#F5EFE5]/80 focus:outline-none focus:border-[#D8B46A] transition-colors appearance-none cursor-pointer">
                  <option value="" className="bg-[#2B241E]">Select an Interest</option>
                  <option value="studio" className="bg-[#2B241E]">Live Studio Class</option>
                  <option value="corporate" className="bg-[#2B241E]">Corporate Wellness</option>
                  <option value="private" className="bg-[#2B241E]">Private Coaching</option>
                </select>
              </div>
              <Button variant="primary" className="w-full mt-8">Submit Request</Button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 pb-16 border-b border-[#D8B46A]/10">
          <div className="col-span-2 md:col-span-1 pr-4">
            <div className="text-2xl font-serif mb-4">
              EKAM <span className="text-[#D8B46A] italic">Yoga</span>
            </div>
            <p className="text-sm text-[#F5EFE5]/50 leading-relaxed max-w-xs">
              Luxury desert wellness across the UAE — live studio, online, and corporate yoga, taught with intention.
            </p>
          </div>

          {footerLinkColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-widest text-[#D8B46A] mb-5">{col.title}</h4>
              <ul className="space-y-3 text-sm text-[#F5EFE5]/60">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="hover:text-[#D8B46A] transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#D8B46A] mb-5">Visit</h4>
            <ul className="space-y-3 text-sm text-[#F5EFE5]/60">
              <li className="flex items-start gap-2">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#D8B46A]" />
                Al Quoz, Dubai, UAE
              </li>
              <li className="flex items-start gap-2">
                <Clock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#D8B46A]" />
                Daily, 6am – 9pm
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 text-sm text-[#F5EFE5]/40">
          <p>© 2026 Ekam Yoga. Dubai AFZA Licensed.</p>
          <div className="flex items-center gap-6">
            {socialLinks.map(({ name, href, Icon }) => (
              <a key={name} href={href} aria-label={name} className="hover:text-[#D8B46A] transition-colors">
                <Icon size={18} strokeWidth={1.5} />
              </a>
            ))}
            <span className="w-px h-4 bg-[#F5EFE5]/20" />
            <a href="#" className="hover:text-[#D8B46A] transition-colors">Terms &amp; Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
