import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Workspaces from './pages/Workspaces';
import Chat from './pages/Chat';
import './index.css';

function AuthGate({ requireAuth }: { requireAuth: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading Unichat...
      </div>
    );
  }

  if (requireAuth) {
    return user ? <Outlet /> : <Navigate to="/login" replace />;
  }

  return user ? <Navigate to="/workspaces" replace /> : <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthGate requireAuth={false} />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<AuthGate requireAuth />}>
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/chat/:workspaceId" element={<Chat />} />
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
