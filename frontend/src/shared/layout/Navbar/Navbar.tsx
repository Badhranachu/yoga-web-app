import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { easeOutQuart } from '@/shared/lib/motion';

const navItems = ['Philosophy', 'Spaces', 'Journeys', 'Trainers'];

// Public-site navbar, extracted from the original homepage. In-page anchor
// links are preserved as-is since the marketing sections live on one route.
export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 1, ease: easeOutQuart }}
      className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'glass-nav py-4' : 'py-6'}`}
    >
      {!scrolled && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none" />
      )}
      <div className="container mx-auto px-6 md:px-12 flex justify-between items-center">
        <Link
          to="/"
          className={`text-2xl font-serif tracking-wide transition-colors duration-700 ${scrolled ? 'text-[#2B241E]' : 'text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]'}`}
        >
          EKAM <span className="text-[#D8B46A] italic">Yoga</span>
        </Link>

        <div className={`hidden md:flex items-center gap-10 text-sm tracking-widest uppercase transition-colors duration-700 ${scrolled ? 'text-[#786A58]' : 'text-white/90'}`}>
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className={`hover:text-[#D8B46A] transition-colors relative group ${!scrolled ? 'drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]' : ''}`}
            >
              {item}
              <span className="absolute -bottom-2 left-1/2 w-0 h-[1px] bg-[#D8B46A] group-hover:w-full group-hover:left-0 transition-all duration-500" />
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <Button
            variant={scrolled ? 'primary' : 'outline'}
            className={`!py-3 ${!scrolled ? '!border-white/60 !text-white hover:!border-[#D8B46A] hover:!text-[#D8B46A]' : ''}`}
          >
            Book Session
          </Button>
        </div>

        <button className={`md:hidden transition-colors duration-700 ${scrolled ? 'text-[#2B241E]' : 'text-white'}`} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={28} strokeWidth={1} /> : <Menu size={28} strokeWidth={1} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 top-[72px] bg-[#F5EFE5]/95 z-40 flex flex-col p-8"
          >
            <div className="flex flex-col gap-8 text-2xl font-serif mt-12">
              {[...navItems, 'Contact'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="text-[#2B241E] hover:text-[#D8B46A] transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
