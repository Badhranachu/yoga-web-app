import { motion } from 'framer-motion';
import { RevealSection } from '@/shared/ui/RevealSection';

const tileVariants = {
  hidden: (fromSide: 'left' | 'right' | 'up') => ({
    opacity: 0,
    x: fromSide === 'left' ? -40 : fromSide === 'right' ? 40 : 0,
    y: fromSide === 'up' ? 40 : 0,
  }),
  visible: { opacity: 1, x: 0, y: 0 },
};

export const GallerySection = () => (
  <RevealSection className="bg-[#E8DDCC] py-24">
    <div className="container mx-auto px-6">
      <div className="flex flex-col gap-4 md:h-[600px] md:flex-row">
        <div className="flex flex-col gap-4 md:flex-1">
          <motion.div
            custom="left"
            variants={tileVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-72 rounded-2xl overflow-hidden group relative md:h-auto md:flex-1"
          >
            <img src="/assets/1.jpg" alt="Yoga space" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-serif text-xl">The Sanctuary</div>
          </motion.div>
          <motion.div
            custom="left"
            variants={tileVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="h-48 rounded-2xl overflow-hidden group relative md:h-1/3"
          >
            <img src="/assets/2.jpg" alt="Details" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </motion.div>
        </div>
        <motion.div
          custom="up"
          variants={tileVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          className="h-72 rounded-2xl overflow-hidden group relative md:h-auto md:flex-1"
        >
          <img src="/assets/5.jpg" alt="Desert Yoga" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-serif text-xl">Sunrise Flow</div>
        </motion.div>
        <div className="flex flex-col gap-4 md:flex-1">
          <motion.div
            custom="right"
            variants={tileVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="h-48 rounded-2xl overflow-hidden group relative md:h-2/5"
          >
            <img src="/assets/4.jpg" alt="Tea" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </motion.div>
          <motion.div
            custom="right"
            variants={tileVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="h-72 rounded-2xl overflow-hidden group relative md:h-auto md:flex-1"
          >
            <img src="/assets/3.jpg" alt="Studio" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </motion.div>
        </div>
      </div>
    </div>
  </RevealSection>
);
