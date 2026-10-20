import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Index from './pages/Index'
import DashboardHome from './pages/DashboardHome'

import DashboardLegacy from './pages/Dashboard'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Index (Login) */}
          <Route path="/" element={<Index />} />

          {/* Protected Area with unified Sidebar & Topbar Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/clientes" element={<Navigate to="/dashboard" replace />} />
            <Route path="/propostas" element={<Navigate to="/dashboard" replace />} />
            <Route path="/projetos" element={<Navigate to="/dashboard" replace />} />
            <Route path="/configuracoes" element={<Navigate to="/dashboard" replace />} />
            {/* Legacy technical panel access preserved for engineer audit */}
            <Route path="/painel-tecnico" element={<DashboardLegacy />} />
          </Route>

          {/* Catch-all */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
