import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap any route element with this to require login first.
// Usage: <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // still checking localStorage, avoid a flash-redirect
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}
