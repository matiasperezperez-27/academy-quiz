import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  LogOut, 
  User, 
  BookOpen, 
  Target,
  Shield,
  Moon,
  Sun,
  Bell,
  HelpCircle,
  MessageCircle,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const MobileDrawer = ({ open, onClose }: MobileDrawerProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate("/auth");
  };

  // Cast SheetContent to any to bypass TypeScript error
  const SafeSheetContent = SheetContent as any;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SafeSheetContent side="right" className="w-[85%] sm:w-[385px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="text-left">Opciones</SheetTitle>
          </SheetHeader>
          
          {/* Información del usuario */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Usuario activo</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Opciones de navegación */}
          <div className="px-6 py-4 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/test-setup")}
            >
              <Target className="mr-3 h-4 w-4" />
              Nuevo Test
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/practice")}
            >
              <BookOpen className="mr-3 h-4 w-4" />
              Modo Práctica
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/analisis-temas")}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Análisis por Temas
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                className="w-full justify-start text-orange-600"
                onClick={() => handleNavigation("/admin")}
              >
                <Shield className="mr-3 h-4 w-4" />
                Panel Admin
              </Button>
            )}
          </div>

          <Separator />

          {/* Configuración */}
          <div className="px-6 py-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Configuración</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="text-sm">Modo Oscuro</span>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm">Notificaciones</span>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Enlaces de ayuda */}
          <div className="px-6 py-4 space-y-1">
            <Button variant="ghost" className="w-full justify-start">
              <HelpCircle className="mr-3 h-4 w-4" />
              Ayuda y Soporte
            </Button>
            
            <Button variant="ghost" className="w-full justify-start">
              <MessageCircle className="mr-3 h-4 w-4" />
              Enviar Feedback
            </Button>
          </div>

          <Separator />

          {/* Cerrar sesión */}
          <div className="px-6 py-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 text-center text-xs text-muted-foreground">
            Academy Quiz v1.0.0
          </div>
        </div>
      </SafeSheetContent>
    </Sheet>
  );
};

export default MobileDrawer;