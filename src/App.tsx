import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PermissionsProvider, RequireModule } from './contexts/PermissionsContext'
import AdminAccess from './pages/AdminAccess'
import { CompositionDraftProvider } from './contexts/CompositionDraftContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Index from './pages/Index'
import Today from './pages/Today'
import Funnel from './pages/Funnel'
import OpportunityCard from './pages/OpportunityCard'
import Clientes from './pages/Clientes'
import Dashboard360 from './pages/Dashboard360'
import Configuracoes from './pages/Configuracoes'
import DesignSystem from './pages/DesignSystem'
import CompositionLibrary from './pages/CompositionLibrary'
import Opportunities from './pages/Opportunities'
import TechSheet from './pages/TechSheet'
import Units from './pages/Units'
import DashboardLegacy from './pages/Dashboard'
import AdminIndex from './pages/AdminIndex'
import CalculationProof from './pages/CalculationProof'
import NotFound from './pages/NotFound'
import { homeForRole, legacySectionRedirect } from './lib/navigation'

// Depois do login o sistema abre em /dashboard; cada perfil vai para a sua home.
function RoleHome() {
  const { user } = useAuth()
  return <Navigate to={homeForRole(user?.role)} replace />
}

function LegacyTechnicalPanel() {
  const location = useLocation()
  const redirect = legacySectionRedirect(location.search)
  return redirect ? <Navigate to={redirect} replace /> : <DashboardLegacy />
}

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/design-system" element={<DesignSystem />} />
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
            <Route path="/dashboard" element={<RoleHome />} />
            <Route path="/hoje" element={<RequireModule module="demandas"><Today /></RequireModule>} />
            <Route path="/funil" element={<RequireModule module="demandas"><Funnel /></RequireModule>} />
            <Route path="/oportunidade" element={<RequireModule module="demandas"><OpportunityCard /></RequireModule>} />
            <Route path="/clientes" element={<RequireModule module="clientes"><Clientes /></RequireModule>} />
            <Route path="/painel" element={<RequireModule module="painel"><Dashboard360 /></RequireModule>} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/demandas" element={<Opportunities />} />
            <Route path="/ficha" element={<TechSheet />} />
            <Route path="/biblioteca" element={<CompositionLibrary />} />
            <Route path="/unidades" element={<Units />} />
            <Route path="/administracao" element={<RequireModule module="evidencias"><AdminIndex /></RequireModule>} />
            <Route path="/administracao/usuarios" element={<RequireModule module="usuarios"><AdminAccess /></RequireModule>} />
            <Route path="/administracao/prova-calculo" element={<CalculationProof />} />
            <Route path="/propostas" element={<Navigate to="/funil" replace />} />
            <Route path="/projetos" element={<Navigate to="/funil" replace />} />
            <Route path="/painel-tecnico" element={<LegacyTechnicalPanel />} />
          </Route>
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)

export default App
