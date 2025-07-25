'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useCallback } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()

  const login = useCallback(async () => {
    await signIn('discord')
  }, [])

  const logout = useCallback(async () => {
    await signOut()
  }, [])

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signIn: login,
    signOut: logout,
    session,
  }
}