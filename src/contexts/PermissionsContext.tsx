import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  DEFAULT_MATRIX,
  type AccessAction,
  type AccessModule,
  type RoleMatrix,
} from '@/lib/auth/accessMatrix'
import { getMyPermissions } from '@/services/admin'

// Permissões do usuário logado, lidas do servidor (matriz administrada em
// Admin → Usuários e permissões). Se o servidor não responder, usa a matriz
// padrão do perfil — só para montar menu e telas; quem decide continua sendo o
// servidor em cada rota.
type PermissionsValue = {
  can: (module: AccessModule, action?: AccessAction) => boolean
  source: 'servidor' | 'padrao' | 'carregando'
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsValue | null>(null)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const role = user?.role
  const [matrix, setMatrix] = useState<RoleMatrix | null>(null)
  const [source, setSource] = useState<PermissionsValue['source']>('carregando')

  const refresh = useCallback(async () => {
    if (!role) {
      setMatrix(null)
      return
    }
    const fallback = DEFAULT_MATRIX[role]
    try {
      const result = await getMyPermissions()
      const merged = { ...fallback } as RoleMatrix
      for (const [module, flags] of Object.entries(result.modules)) {
        if (flags && module in merged) merged[module as AccessModule] = flags
      }
      setMatrix(merged)
      setSource('servidor')
    } catch {
      setMatrix(fallback)
      setSource('padrao')
    }
  }, [role])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const can = useCallback(
    (module: AccessModule, action: AccessAction = 'view') => {
      const current = matrix ?? (role ? DEFAULT_MATRIX[role] : null)
      return current?.[module]?.[action] === true
    },
    [matrix, role],
  )

  const value = useMemo(() => ({ can, source, refresh }), [can, source, refresh])
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions(): PermissionsValue {
  const context = useContext(PermissionsContext)
  if (!context) throw new Error('usePermissions precisa estar dentro de PermissionsProvider')
  return context
}

// Bloqueia uma tela inteira quando o perfil não pode ver o módulo.
export function RequireModule({
  module,
  children,
}: {
  module: AccessModule
  children: React.ReactNode
}) {
  const { can } = usePermissions()
  if (!can(module, 'view')) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-mg-line bg-mg-surface p-8 text-center">
        <p className="font-bold text-mg-ink">Seu perfil não tem acesso a esta área</p>
        <p className="mt-2 text-sm text-mg-muted">
          Se precisar, peça ao administrador do sistema para ajustar as permissões do seu perfil.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
