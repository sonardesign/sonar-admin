import { useState, useEffect } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

export const useAuth = (): UseAuthReturn => {
  // In-memory state only - no localStorage, no cookies
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔐 Initializing auth...')
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
        } else {
          console.log('📋 Initial session:', session ? `✅ Active (${session.user.email})` : '❌ None')
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user')
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sign in method
  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in:', email)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Sign in error:', error.message)
      } else {
        console.log('✅ Sign in successful')
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Sign in exception:', error)
      return { error: error as AuthError }
    }
  }

  // Sign up method
  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('📝 Signing up:', email)
    try {
      const { error } = await supabase.auth.signUp({
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
        console.log('✅ Sign up successful')
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Sign up exception:', error)
      return { error: error as AuthError }
    }
  }

  // Sign out method
  const signOut = async () => {
    console.log('🚪 Signing out...')
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error.message)
      } else {
        console.log('✅ Sign out successful')
        // State will be cleared by onAuthStateChange
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Sign out exception:', error)
      return { error: error as AuthError }
    }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }
}
