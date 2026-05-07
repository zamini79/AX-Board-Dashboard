import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Kpis from "./pages/Kpis";
import KpiDetail from "./pages/KpiDetail";
import Tasks from "./pages/Tasks";
import Todos from "./pages/Todos";
import TaskDetail from "./pages/TaskDetail";
import Budget from "./pages/Budget";
import UserApproval from "./pages/UserApproval";
import Settings from "./pages/Settings";
import Performance from "./pages/Performance";
import PerformanceDetail from "./pages/PerformanceDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
      gcTime: 10 * 60 * 1000,   // 10분간 가비지 컬렉션 방지
      refetchOnWindowFocus: false, // 윈도우 포커스 시 리페치 비활성화
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="axboard-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kpis"
                element={
                  <ProtectedRoute>
                    <Kpis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kpi/:id"
                element={
                  <ProtectedRoute>
                    <KpiDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/:id"
                element={
                  <ProtectedRoute>
                    <TaskDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/todos"
                element={
                  <ProtectedRoute>
                    <Todos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/budget"
                element={
                  <ProtectedRoute>
                    <Budget />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-approval"
                element={
                  <ProtectedRoute>
                    <UserApproval />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/performance"
                element={
                  <ProtectedRoute>
                    <Performance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/performance/:id"
                element={
                  <ProtectedRoute>
                    <PerformanceDetail />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
