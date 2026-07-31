import { Outlet } from 'react-router-dom';
import { Navbar } from '@/shared/layout/Navbar';
import { Footer } from '@/shared/layout/Footer';

// Shell for every public-facing marketing route.
export const PublicLayout = () => (
  <div className="bg-[#F5EFE5] min-h-screen text-[#2B241E] selection:bg-[#D8B46A] selection:text-white">
    <Navbar />
    <Outlet />
    <Footer />
  </div>
);
