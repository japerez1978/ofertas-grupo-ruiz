import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
          <p className="text-red-400/80 text-xs tracking-[0.2em] font-medium uppercase animate-pulse">
            Verificando Sesión...
          </p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login page and save the attempted URL
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If authenticated, render child routes
  return <Outlet />
}
