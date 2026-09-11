import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { revokeSession } from '@/services/security'
import type { RecordModel } from 'pocketbase'
import type { UserRole } from '@/lib/auth/permissions'

export interface AuthUser extends RecordModel {
  name?: string
  email?: string
  avatar?: string
  verified?: boolean
  role: UserRole
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<AuthUser>
  logout: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REMEMBER_KEY = 'merco_crm_remember_me'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    const unsubscribe = pb.authStore.onChange((newToken, model) => {
      const valid = pb.authStore.isValid && !!model
      setToken(newToken)
      setIsAuthenticated(valid)
      setUser(valid ? (model as unknown as AuthUser) : null)
    })

    const restoreSession = async () => {
      try {
        const remember = localStorage.getItem(REMEMBER_KEY)
        if (!pb.authStore.isValid || !pb.authStore.record) {
          pb.authStore.clear()
          return
        }

        if (remember === 'false' && !sessionStorage.getItem('merco_session_active')) {
          pb.authStore.clear()
          return
        }

        await pb.collection('users').authRefresh()
        if (active) {
          setUser(pb.authStore.record as unknown as AuthUser)
          setToken(pb.authStore.token)
          setIsAuthenticated(pb.authStore.isValid)
          sessionStorage.setItem('merco_session_active', 'true')
        }
      } catch {
        pb.authStore.clear()
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(
    async (email: string, pass: string, rememberMe = false): Promise<AuthUser> => {
      const authData = await pb.collection('users').authWithPassword(email.trim(), pass)

      localStorage.setItem(REMEMBER_KEY, rememberMe ? 'true' : 'false')
      sessionStorage.setItem('merco_session_active', 'true')

      const loggedUser = authData.record as unknown as AuthUser
      setUser(loggedUser)
      setToken(authData.token)
      setIsAuthenticated(pb.authStore.isValid)
      return loggedUser
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      if (pb.authStore.isValid) {
        await revokeSession()
      }
    } finally {
      pb.authStore.clear()
      localStorage.removeItem(REMEMBER_KEY)
      sessionStorage.removeItem('merco_session_active')
      setUser(null)
      setToken(null)
      setIsAuthenticated(false)
    }
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    await pb.collection('users').requestPasswordReset(email.trim())
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
