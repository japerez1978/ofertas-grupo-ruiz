import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenant, useUserAccess } from 'core-saas' // Hooks del Core
import Spinner from './Spinner'

export const ProtectedRoute = () => {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()

  // Consumimos el motor SaaS
  const { data: tenantData, isLoading: tenantLoading } = useTenant(user?.id, user?.email)
  const { data: userAccess = [], isLoading: accessLoading } = useUserAccess(tenantData?.id)

  const loading = authLoading || tenantLoading || accessLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
          <p className="text-red-400/80 text-xs tracking-[0.2em] font-medium uppercase animate-pulse">
            Verificando Permisos SaaS...
          </p>
        </div>
      </div>
    )
  }

  // 1. Si no hay sesión, al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Si no hay empresa vinculada, denegar (excepto si es superadmin)
  const userRole = tenantData?.rol
  if (!tenantData && userRole !== 'superadmin') {
    return <Navigate to="/login" replace />
  }

  // 3. Verificación de permiso específico para esta App ('ofertas')
  const hasAccess = userRole === 'superadmin' || userAccess.includes('ofertas')
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#111] border border-red-900/20 rounded-2xl p-8">
          <h2 className="text-red-500 font-bold text-xl mb-4">Acceso Denegado</h2>
          <p className="text-gray-400 text-sm mb-6">
            No tienes permisos para acceder a la aplicación de <strong>Ofertas e Intranox</strong>. 
            Contacta con tu administrador para solicitar acceso.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg hover:bg-red-600/20 transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  // Todo correcto: Renderizamos la ruta solicitada
  return <Outlet />
}
