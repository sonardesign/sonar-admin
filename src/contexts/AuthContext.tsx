import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as Profile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Create profile for new user
  const createProfile = async (user: User, fullName: string) => {
    try {
      const profileData = {
        id: user.id,
        email: user.email!,
        full_name: fullName,
        role: 'user' as const,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        date_format: 'YYYY-MM-DD',
        time_format: '24h' as const,
        is_active: true,
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return null
      }

      return data as Profile
    } catch (error) {
      console.error('Error creating profile:', error)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
        // console.log('🔐 Initializing auth...') // Disabled for demo
      try {
        // Check for existing session first
        // console.log('🔍 Getting session...') // Disabled for demo
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) {
          console.log('⚠️ Component unmounted, skipping auth init')
          return
        }

        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          return
        }

        console.log('📋 Session result:', session ? `✅ Active (${session.user.email})` : '❌ None')

        // Set initial session state
        setSession(session)
        setUser(session?.user ?? null)
        
        // Load profile if user exists
        if (session?.user) {
          console.log('👤 Loading user profile...')
          const userProfile = await fetchProfile(session.user.id)
          if (mounted) {
            console.log('✅ Profile loaded:', userProfile?.full_name || 'No name')
            setProfile(userProfile)
          }
        } else {
          console.log('👤 No user session, skipping profile load')
        }
        
        if (mounted) {
          console.log('🏁 Auth initialization complete, clearing loading state')
          setLoading(false)
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Initialize auth with timeout (disabled in demo mode)
    const timeoutId = setTimeout(() => {
      if (mounted) {
        // console.warn('⏰ Auth initialization timeout, clearing loading state') // Disabled for demo
        setLoading(false)
      }
    }, 8000) // 8 second timeout

    initializeAuth().finally(() => {
      clearTimeout(timeoutId)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state changed:', event, session?.user?.email)
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id)
        if (mounted) {
          setProfile(userProfile)
        }
      } else {
        if (mounted) {
          setProfile(null)
        }
      }
      
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)
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
        return { error }
      }

      // Create profile if user was created successfully
      if (data.user && !data.session) {
        // User needs to confirm email - profile will be created on confirmation
        // The full_name will be available in user metadata for the trigger
        return { error: null }
      }

      if (data.user) {
        await createProfile(data.user, fullName)
      }

      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true)
      
      // Clear local state first
      setUser(null)
      setProfile(null)
      setSession(null)
      
      // Sign out from Supabase (this will trigger auth state change)
      const { error } = await supabase.auth.signOut()
      
      // Clear all possible auth storage locations
      const authKeys = [
        'supabase.auth.token',
        'sb-auth-token',
        'supabase-auth-token',
        'supabase.session'
      ]
      
      authKeys.forEach(key => {
        try {
          // Clear localStorage
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key)
          }
          
          // Clear sessionStorage
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(key)
          }
          
          // Clear cookies
          if (typeof document !== 'undefined') {
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
            document.cookie = `${key}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
          }
        } catch (storageError) {
          console.warn(`Could not clear ${key}:`, storageError)
        }
      })
      
      console.log('User signed out successfully')
      return { error }
    } catch (error) {
      console.error('Error during sign out:', error)
      
      // Even if Supabase signOut fails, clear local state
      setUser(null)
      setProfile(null)
      setSession(null)
      
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Update profile function
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error: new Error(error.message) }
      }

      // Refresh profile data
      const updatedProfile = await fetchProfile(user.id)
      setProfile(updatedProfile)

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuth is exported inline above - no duplicate export needed
