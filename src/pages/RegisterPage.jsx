import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Lock, Mail, AlertCircle, ChevronRight, UserPlus } from 'lucide-react'

export const RegisterPage = () => {
  const [searchParams] = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenant')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!tenantIdFromUrl) {
      setError('Enlace no válido. Por favor, utiliza el enlace que recibiste tras el pago.')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Registramos el usuario en la autenticación
      const { data: authData, error: authError } = await register(email, password)
      if (authError) throw authError

      if (authData.user) {
        // 2. Automáticamente lo vinculamos a la empresa que pagó
        const { error: linkError } = await supabase.from('tenant_users').insert({
          auth_user_id: authData.user.id,
          tenant_id: parseInt(tenantIdFromUrl),
          email: email,
          rol: 'admin' // Al ser el primero que se registra, le damos rol admin del tenant
        })

        if (linkError) throw linkError

        // 3. ¡A dentro!
        navigate('/ofertas')
      }
    } catch (err) {
      console.error('Error registering:', err)
      setError(err.message || 'Hubo un problema al crear tu cuenta.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo or Brand header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Intranox / Grupo Ruiz" className="w-20 h-20 object-contain mb-4 drop-shadow-2xl brightness-110" />
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase text-center drop-shadow-md">
            ACTIVA TU <span className="text-red-500">ACCESO</span>
          </h1>
          <p className="text-steel-400 text-sm text-center">Crea tus credenciales para empezar a usar el panel</p>
        </div>

        {/* Glass Card Register Form */}
        <div className="glass-card rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-surface-900/60">
          <form onSubmit={handleRegister} className="flex flex-col gap-6 relative z-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {!tenantIdFromUrl && (
               <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                 <p>Falta el código de empresa en el enlace. No podrás activar tu cuenta.</p>
               </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-steel-400 uppercase tracking-widest pl-1">Email de acceso</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500 transition-colors group-focus-within:text-red-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-steel-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-steel-400 uppercase tracking-widest pl-1">Elige una Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500 transition-colors group-focus-within:text-red-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-steel-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !tenantIdFromUrl}
              className={`mt-4 w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] ${
                (isLoading || !tenantIdFromUrl) ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'
              }`}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="tracking-widest uppercase text-sm">CREAR MI CUENTA</span>
                  <UserPlus className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => navigate('/login')} 
              className="text-steel-400 text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
