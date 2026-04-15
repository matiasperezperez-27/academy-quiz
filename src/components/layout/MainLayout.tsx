import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNavBar from "./BottomNavBar";
import MobileDrawer from "./MobileDrawer";
import { useState } from "react";

const MainLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  
  // Páginas donde NO mostrar la navegación inferior
  const hideNavRoutes = ['/auth', '/quiz', '/results', '/admin'];
  const shouldShowNav = !hideNavRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Contenido principal con efectos visuales premium */}
      <main className={`flex-1 transition-all duration-300 ${shouldShowNav ? 'pb-20 md:pb-16' : ''}`}>
        <div className="relative min-h-full">
          <Outlet />
        </div>
      </main>
      
      {/* Navegación inferior con efectos glassmorphism */}
      {shouldShowNav && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50">
            <BottomNavBar onMoreClick={() => setDrawerOpen(true)} />
          </div>
        </div>
      )}
      
      {/* Drawer lateral */}
      <MobileDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />
    </div>
  );
};

export default MainLayout;