import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/AuthContext'
import { PermissionsProvider } from './contexts/PermissionsContext'
import { CompositionDraftProvider } from './contexts/CompositionDraftContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Index from './pages/Index'
import DashboardHome from './pages/DashboardHome'
import CompositionLibrary from './pages/CompositionLibrary'
import Clientes from './pages/Clientes'
import Propostas from './pages/Propostas'
import Projetos from './pages/Projetos'
import Configuracoes from './pages/Configuracoes'
import Today from './pages/Today'
import Funnel from './pages/Funnel'
import Dashboard360 from './pages/Dashboard360'
import Opportunities from './pages/Opportunities'
import TechSheet from './pages/TechSheet'
import Units from './pages/Units'
import DashboardLegacy from './pages/Dashboard'
import AdminIndex from './pages/AdminIndex'
import CalculationProof from './pages/CalculationProof'
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
                <PermissionsProvider>
                  <CompositionDraftProvider>
                    <AppLayout />
                  </CompositionDraftProvider>
                </PermissionsProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/hoje" element={<Today />} />
            <Route path="/funil" element={<Funnel />} />
            <Route path="/painel" element={<Dashboard360 />} />
            <Route path="/demandas" element={<Opportunities />} />
            <Route path="/ficha" element={<TechSheet />} />
            <Route path="/biblioteca" element={<CompositionLibrary />} />
            <Route path="/unidades" element={<Units />} />
            <Route path="/administracao" element={<AdminIndex />} />
            <Route path="/administracao/prova-calculo" element={<CalculationProof />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/propostas" element={<Propostas />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
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
