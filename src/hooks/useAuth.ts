import { useState, useEffect, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

export const useAuth = (): UseAuthReturn => {
  // Persistent state with localStorage backing via Supabase
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true
    console.log('🔐 Initializing persistent auth system...')
    
    // Get initial session from localStorage/persistent storage
    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking for existing session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
          setSession(null)
          setUser(null)
        } else {
          if (session) {
            console.log('✅ Found existing session for:', session.user.email)
            console.log('🕐 Session expires at:', new Date(session.expires_at! * 1000).toLocaleString())
          } else {
            console.log('❌ No existing session found')
          }
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error)
        if (mounted) {
          setSession(null)
          setUser(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
          console.log('🏁 Auth initialization complete')
        }
      }
    }

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('🔄 Auth state changed:', event)
      if (session?.user) {
        console.log('👤 User:', session.user.email)
        console.log('🕐 Session expires at:', new Date(session.expires_at! * 1000).toLocaleString())
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      // Ensure loading is false after any auth state change
      setLoading(false)
      setInitialized(true)
      
      // Handle specific events
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in successfully')
          break
        case 'SIGNED_OUT':
          console.log('✅ User signed out successfully')
          break
        case 'TOKEN_REFRESHED':
          console.log('🔄 Session token refreshed')
          break
        case 'USER_UPDATED':
          console.log('👤 User profile updated')
          break
      }
    })

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign in method
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔑 Attempting sign in for:', email)
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Sign in error:', error.message)
      } else {
        console.log('✅ Sign in successful for:', data.user?.email)
        // Session will be set by onAuthStateChange
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Sign in exception:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign up method
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    console.log('📝 Attempting sign up for:', email, 'with name:', fullName)
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })
      
      if (error) {
        console.error('❌ Sign up error:', error.message)
      } else {
        console.log('✅ Sign up successful for:', data.user?.email)
        if (data.user && !data.session) {
          console.log('📧 Please check your email to confirm your account')
        }
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Sign up exception:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign out method
  const signOut = useCallback(async () => {
    console.log('🚪 Signing out current user...')
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error.message)
      } else {
        console.log('✅ Sign out successful - session cleared')
        // State will be cleared by onAuthStateChange
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Sign out exception:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    session,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
  }
}
