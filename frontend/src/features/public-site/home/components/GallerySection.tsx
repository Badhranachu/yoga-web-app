export const GallerySection = () => (
  <section className="py-24 bg-[#E8DDCC]">
    <div className="container mx-auto px-6">
      <div className="flex flex-col gap-4 md:h-[600px] md:flex-row">
        <div className="flex flex-col gap-4 md:flex-1">
          <div className="h-72 rounded-2xl overflow-hidden group relative md:h-auto md:flex-1">
            <img src="/assets/1.jpg" alt="Yoga space" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-serif text-xl">The Sanctuary</div>
          </div>
          <div className="h-48 rounded-2xl overflow-hidden group relative md:h-1/3">
            <img src="/assets/2.jpg" alt="Details" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
        </div>
        <div className="h-72 rounded-2xl overflow-hidden group relative md:h-auto md:flex-1">
          <img src="/assets/5.jpg" alt="Desert Yoga" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-serif text-xl">Sunrise Flow</div>
        </div>
        <div className="flex flex-col gap-4 md:flex-1">
          <div className="h-48 rounded-2xl overflow-hidden group relative md:h-2/5">
            <img src="/assets/4.jpg" alt="Tea" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
          <div className="h-72 rounded-2xl overflow-hidden group relative md:h-auto md:flex-1">
            <img src="/assets/3.jpg" alt="Studio" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
        </div>
      </div>
    </div>
  </section>
);
