export const GallerySection = () => (
  <section className="py-24 bg-[#E8DDCC]">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row gap-4 h-[600px]">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl overflow-hidden group relative">
            <img src="https://images.unsplash.com/photo-1552858725-2758b5fb1286?q=80&w=800&auto=format&fit=crop" alt="Yoga space" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-serif text-xl">The Sanctuary</div>
          </div>
          <div className="h-1/3 rounded-2xl overflow-hidden group relative">
            <img src="https://images.unsplash.com/photo-1620733723572-11c53f73a416?q=80&w=800&auto=format&fit=crop" alt="Details" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
        </div>
        <div className="flex-1 rounded-2xl overflow-hidden group relative hidden md:block">
          <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop" alt="Desert Yoga" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-serif text-xl">Sunrise Flow</div>
        </div>
        <div className="flex-1 flex flex-col gap-4 hidden lg:flex">
          <div className="h-2/5 rounded-2xl overflow-hidden group relative">
            <img src="https://images.unsplash.com/photo-1571934811356-5cc061b6821f?q=80&w=800&auto=format&fit=crop" alt="Tea" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden group relative">
            <img src="https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop" alt="Studio" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
        </div>
      </div>
    </div>
  </section>
);
