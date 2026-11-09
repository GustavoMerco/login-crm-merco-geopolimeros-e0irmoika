import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MercoLogo, HexagonSpinner } from '@/components/MercoLogo'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-mg-sidebar flex flex-col items-center justify-center text-white z-50">
        <MercoLogo size={56} showWordmark={true} className="animate-fade-in mb-6" />
        <div className="flex items-center gap-3 text-mg-brand text-sm font-medium">
          <HexagonSpinner size={22} className="text-mg-brand" />
          <span>Verificando credenciais...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
