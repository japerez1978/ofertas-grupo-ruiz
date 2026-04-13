import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from 'core-saas' // Importamos desde el core compartido

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sincronización inicial rápida
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Suscripción a cambios de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const register = async (email, password) => {
    return await supabase.auth.signUp({ email, password })
  }

  const logout = async () => {
    return await supabase.auth.signOut()
  }

  const value = useMemo(() => ({
    user,
    login,
    logout,
    register,
    loading
  }), [user, loading])

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
