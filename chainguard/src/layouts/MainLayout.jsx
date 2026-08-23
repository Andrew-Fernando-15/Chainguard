import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollProgress from '../components/ScrollProgress';
import FloatingActionButton from '../components/FloatingActionButton';

export default function MainLayout() {
  return (
    <div className="grid-bg min-h-screen">
      <ScrollProgress />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <FloatingActionButton />
    </div>
  );
}
