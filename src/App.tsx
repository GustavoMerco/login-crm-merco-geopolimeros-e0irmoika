import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/AuthContext'
import { CompositionDraftProvider } from './contexts/CompositionDraftContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Index from './pages/Index'
import DashboardHome from './pages/DashboardHome'
import CompositionLibrary from './pages/CompositionLibrary'
import Opportunities from './pages/Opportunities'
import TechSheet from './pages/TechSheet'
import DashboardLegacy from './pages/Dashboard'
import NotFound from './pages/NotFound'
import { legacySectionRedirect } from './lib/navigation'

function LegacyTechnicalPanel() {
  const location = useLocation()
  const redirect = legacySectionRedirect(location.search)
  return redirect ? <Navigate to={redirect} replace /> : <DashboardLegacy />
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            element={
              <ProtectedRoute>
                <CompositionDraftProvider>
                  <AppLayout />
                </CompositionDraftProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/demandas" element={<Opportunities />} />
            <Route path="/ficha" element={<TechSheet />} />
            <Route path="/biblioteca" element={<CompositionLibrary />} />
            <Route path="/clientes" element={<Navigate to="/dashboard" replace />} />
            <Route path="/propostas" element={<Navigate to="/dashboard" replace />} />
            <Route path="/projetos" element={<Navigate to="/dashboard" replace />} />
            <Route path="/configuracoes" element={<Navigate to="/dashboard" replace />} />
            <Route path="/painel-tecnico" element={<LegacyTechnicalPanel />} />
          </Route>
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
