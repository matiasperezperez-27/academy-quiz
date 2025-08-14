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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Contenido principal con padding inferior para la nav bar */}
      <main className={`flex-1 ${shouldShowNav ? 'pb-16' : ''}`}>
        <Outlet />
      </main>
      
      {/* Navegación inferior - fixed */}
      {shouldShowNav && (
        <BottomNavBar onMoreClick={() => setDrawerOpen(true)} />
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