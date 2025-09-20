// Cookie utility functions for secure authentication storage
export const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === key) {
        try {
          return decodeURIComponent(value)
        } catch (e) {
          return null
        }
      }
    }
    return null
  },

  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return
    
    // Set cookie with secure options
    const options = [
      `${key}=${encodeURIComponent(value)}`,
      'path=/',
      'SameSite=Lax',
      ...(window.location.protocol === 'https:' ? ['Secure'] : []),
      'max-age=604800' // 7 days
    ]
    
    document.cookie = options.join('; ')
  },

  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return
    
    // Remove cookie by setting expiry date in the past
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  }
}

// Enhanced localStorage with fallback to cookies
export const authStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    
    try {
      // Try localStorage first
      const value = window.localStorage.getItem(key)
      if (value) return value
      
      // Fallback to cookies
      return cookieStorage.getItem(key)
    } catch (e) {
      // If localStorage fails, use cookies
      return cookieStorage.getItem(key)
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    
    try {
      // Store in both localStorage and cookies for redundancy
      window.localStorage.setItem(key, value)
      cookieStorage.setItem(key, value)
    } catch (e) {
      // If localStorage fails, use cookies only
      cookieStorage.setItem(key, value)
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    
    try {
      // Remove from both localStorage and cookies
      window.localStorage.removeItem(key)
      cookieStorage.removeItem(key)
    } catch (e) {
      // If localStorage fails, remove from cookies
      cookieStorage.removeItem(key)
    }
  }
}
