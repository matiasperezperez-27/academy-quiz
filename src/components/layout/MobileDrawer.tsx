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
      <SafeSheetContent side="right" className="w-[85%] sm:w-[385px] p-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-l border-gray-200/50 dark:border-gray-700/50">
        <div className="h-full flex flex-col">
          {/* Header con gradiente premium */}
          <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
            <SheetTitle className="text-left text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Opciones
            </SheetTitle>
          </SheetHeader>
          
          {/* Información del usuario con avatar mejorado */}
          <div className="px-6 pb-6 pt-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Usuario activo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-6"></div>

          {/* Opciones de navegación con efectos hover premium */}
          <div className="px-6 py-6 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-[1.02] transition-all duration-200 group"
              onClick={() => handleNavigation("/test-setup")}
            >
              <Target className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Nuevo Test</span>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-[1.02] transition-all duration-200 group"
              onClick={() => handleNavigation("/practice")}
            >
              <BookOpen className="mr-3 h-5 w-5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Modo Práctica</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-[1.02] transition-all duration-200 group"
              onClick={() => handleNavigation("/analisis-temas")}
            >
              <BarChart3 className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Análisis por Temas</span>
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-[1.02] transition-all duration-200 group border border-orange-200/50 dark:border-orange-700/50"
                onClick={() => handleNavigation("/admin")}
              >
                <Shield className="mr-3 h-5 w-5 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-medium text-orange-600 dark:text-orange-400">Panel Admin</span>
                <div className="ml-auto">
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">ADMIN</span>
                </div>
              </Button>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-6"></div>

          {/* Configuración con cards premium */}
          <div className="px-6 py-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Configuración</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                    {theme === 'dark' ? 
                      <Moon className="h-4 w-4 text-white" /> : 
                      <Sun className="h-4 w-4 text-white" />
                    }
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Modo Oscuro</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cambiar tema visual</p>
                  </div>
                </div>
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={toggleTheme}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Notificaciones</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alertas y recordatorios</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-6"></div>

          {/* Enlaces de ayuda con iconos animados */}
          <div className="px-6 py-6 space-y-2">
            <Button variant="ghost" className="w-full justify-start h-12 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-[1.02] transition-all duration-200 group">
              <HelpCircle className="mr-3 h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110 transition-all duration-200" />
              <span className="font-medium">Ayuda y Soporte</span>
            </Button>
            
            <Button variant="ghost" className="w-full justify-start h-12 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-[1.02] transition-all duration-200 group">
              <MessageCircle className="mr-3 h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:scale-110 transition-all duration-200" />
              <span className="font-medium">Enviar Feedback</span>
            </Button>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-6"></div>

          {/* Cerrar sesión con efecto premium */}
          <div className="px-6 py-6">
            <Button
              variant="destructive"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl group"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-semibold">Cerrar Sesión</span>
            </Button>
          </div>

          {/* Footer con branding mejorado */}
          <div className="mt-auto px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-gray-800 dark:to-blue-900/10 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="text-center">
              <p className="text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Academy Quiz
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </SafeSheetContent>
    </Sheet>
  );
};

export default MobileDrawer;