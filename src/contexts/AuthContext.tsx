import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface AuthUser extends RecordModel {
  name?: string
  email?: string
  avatar?: string
  verified?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<AuthUser>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REMEMBER_KEY = 'merco_crm_remember_me'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Restore session on mount
  useEffect(() => {
    try {
      const remember = localStorage.getItem(REMEMBER_KEY)
      // If remember me is explicitly set to false and the session was closed, we check session validity
      if (pb.authStore.isValid && pb.authStore.record) {
        // If user logged in without remember me in a previous session, clear if marked session-only
        if (remember === 'false' && !sessionStorage.getItem('merco_session_active')) {
          pb.authStore.clear()
          setUser(null)
          setToken(null)
        } else {
          setUser(pb.authStore.record as unknown as AuthUser)
          setToken(pb.authStore.token)
          // Mark this session tab as active
          sessionStorage.setItem('merco_session_active', 'true')
        }
      } else {
        setUser(null)
        setToken(null)
      }
    } catch {
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }

    const unsubscribe = pb.authStore.onChange((newToken, model) => {
      setToken(newToken)
      setUser(model ? (model as unknown as AuthUser) : null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = useCallback(
    async (email: string, pass: string, rememberMe = false): Promise<AuthUser> => {
      const authData = await pb.collection('users').authWithPassword(email.trim(), pass)

      // Save persistence preference
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, 'true')
      } else {
        localStorage.setItem(REMEMBER_KEY, 'false')
      }
      sessionStorage.setItem('merco_session_active', 'true')

      const loggedUser = authData.record as unknown as AuthUser
      setUser(loggedUser)
      setToken(authData.token)
      return loggedUser
    },
    [],
  )

  const logout = useCallback(() => {
    pb.authStore.clear()
    localStorage.removeItem(REMEMBER_KEY)
    sessionStorage.removeItem('merco_session_active')
    setUser(null)
    setToken(null)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    await pb.collection('users').requestPasswordReset(email.trim())
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
