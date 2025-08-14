import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart3, Trophy, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path?: string;
  action?: () => void;
}

interface BottomNavBarProps {
  onMoreClick: () => void;
}

const BottomNavBar = ({ onMoreClick }: BottomNavBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Inicio",
      path: "/"
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Estadísticas",
      path: "/stats"
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      label: "Ranking",
      path: "/ranking"
    },
    {
      icon: <Menu className="h-5 w-5" />,
      label: "Más",
      action: onMoreClick
    }
  ];

  const handleItemClick = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item, index) => {
            const isActive = item.path && location.pathname === item.path;
            
            return (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all",
                  "hover:bg-accent/50 active:scale-95",
                  isActive && "text-primary"
                )}
              >
                <div className={cn(
                  "transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.icon}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavBar;