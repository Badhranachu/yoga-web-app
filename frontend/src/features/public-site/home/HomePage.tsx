import { Hero, ServicesSection, GallerySection, TrainersSection, CorporateSection, PricingSection } from './components';

// The public homepage, composed from the sections extracted out of the
// original standalone homepage project. Content and layout are unchanged.
export const HomePage = () => (
  <>
    <Hero />
    <ServicesSection />
    <GallerySection />
    <TrainersSection />
    <CorporateSection />
    <PricingSection />
  </>
);
