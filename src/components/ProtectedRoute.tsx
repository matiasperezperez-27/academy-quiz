// src/components/ProtectedRoute.tsx

import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

// Opcional: Un componente simple para mostrar mientras carga
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Obtenemos AMBOS valores del hook: user y loading
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Si estamos cargando, mostramos una pantalla de carga y esperamos.
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. Si ya terminó de cargar Y NO hay usuario, entonces redirigimos.
  if (!user) {
    // Guardamos la página a la que quería ir para redirigirlo allí después del login.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. Si ya terminó de cargar Y SÍ hay usuario, le dejamos pasar.
  return <>{children}</>;
};

export default ProtectedRoute;
