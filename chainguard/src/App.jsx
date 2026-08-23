import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import Loader from './components/Loader';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import AIDetection from './pages/AIDetection';
import BlockchainVerification from './pages/BlockchainVerification';
import ChainOfCustody from './pages/ChainOfCustody';
import Roles from './pages/Roles';

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><PageTransition><Upload /></PageTransition></ProtectedRoute>} />
          <Route path="/ai-detection" element={<ProtectedRoute><PageTransition><AIDetection /></PageTransition></ProtectedRoute>} />
          <Route path="/verify" element={<ProtectedRoute><PageTransition><BlockchainVerification /></PageTransition></ProtectedRoute>} />
          <Route path="/custody" element={<ProtectedRoute><PageTransition><ChainOfCustody /></PageTransition></ProtectedRoute>} />
          <Route path="/roles" element={<ProtectedRoute><PageTransition><Roles /></PageTransition></ProtectedRoute>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  if (loading) return <Loader onDone={() => setLoading(false)} />;
  return <AnimatedRoutes />;
}
