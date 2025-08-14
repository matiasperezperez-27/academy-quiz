// src/App.tsx - MODIFICADO
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout"; // NUEVO
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TestSetup from "./pages/TestSetup";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Practice from "./pages/Practice";
import Admin from '@/pages/Admin';
import TopicAnalysisPage from "@/pages/TopicAnalysisPage";
import StatsPage from "@/pages/StatsPage"; // NUEVO
import RankingPage from "@/pages/RankingPage"; // NUEVO

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rutas sin layout */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/admin" element={<Admin />} />
          
          {/* Rutas con layout principal */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
            <Route path="/test-setup" element={<ProtectedRoute><TestSetup /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="/analisis-temas" element={<ProtectedRoute><TopicAnalysisPage /></ProtectedRoute>} />
          </Route>
          
          {/* Ruta 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
