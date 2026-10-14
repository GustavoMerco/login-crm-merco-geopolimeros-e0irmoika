import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Index from './pages/Index'
import DashboardHome from './pages/DashboardHome'
import Clientes from './pages/Clientes'
import Propostas from './pages/Propostas'
import Projetos from './pages/Projetos'
import Configuracoes from './pages/Configuracoes'
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
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/propostas" element={<Propostas />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            {/* Legacy technical panel access preserved for engineer audit */}
            <Route path="/painel-tecnico" element={<DashboardLegacy />} />
          </Route>

          {/* Catch-all */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
