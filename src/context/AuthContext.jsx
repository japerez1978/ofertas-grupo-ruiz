import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getTenantId, resetTenantCache } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Load tenant info
        getTenantId().then(id => setTenantId(id)).catch(() => null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getTenantId().then(id => setTenantId(id)).catch(() => null)
      } else {
        setTenantId(null)
        resetTenantCache()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.user) {
      const id = await getTenantId().catch(() => null)
      setTenantId(id)
    }
    return result
  }

  const register = async (email, password) => {
    return await supabase.auth.signUp({ email, password })
  }

  const logout = async () => {
    resetTenantCache()
    setTenantId(null)
    return await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, tenantId, login, logout, register, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
