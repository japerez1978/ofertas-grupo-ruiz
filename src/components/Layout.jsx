import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, Sliders, AlertTriangle, LogOut, ClipboardList, ScrollText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTenant } from 'core-saas' // Hook del Core
import Spinner from './Spinner'

const navItems = [
  { to: '/', label: 'Ofertas', icon: LayoutDashboard },
  { to: '/crear', label: 'Nueva Oferta', icon: PlusCircle },
  { to: '/negocios', label: 'Sin Oferta', icon: AlertTriangle },
  { to: '/backlog', label: 'Backlog', icon: ClipboardList },
  { to: '/scoring', label: 'Scoring', icon: Sliders },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Cargamos los datos de la empresa y el rol desde el Core
  const { data: tenantData, isLoading } = useTenant(user?.id, user?.email)
  
  const tenant = tenantData?.tenants
  const userRole = tenantData?.rol

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (isLoading && !tenantData) return <Spinner />

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Dinámico */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-accent-500/20 rounded-xl flex items-center justify-center border border-accent-500/30">
                 <ScrollText className="w-6 h-6 text-accent-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none uppercase">
                  {tenant?.nombre || 'GRUPO RUIZ'}
                </h1>
                <span className="text-[10px] font-medium tracking-[0.2em] text-accent-400 uppercase">
                  Portal de Ofertas
                </span>
              </div>
            </NavLink>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-accent-500/15 text-accent-400 shadow-inner'
                        : 'text-steel-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </NavLink>
                )
              })}

              {/* Separator + User Info */}
              <div className="w-px h-6 bg-white/10 mx-2"></div>
              
              <div className="hidden md:flex flex-col items-end mr-3 px-2 border-r border-white/5">
                <span className="text-[10px] text-steel-400 font-medium truncate max-w-[120px]">
                  {user?.email}
                </span>
                <span className="text-[9px] text-accent-500 uppercase tracking-tighter">
                  {userRole}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-steel-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden lg:inline text-xs">Salir</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[98%] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-auto">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-steel-500">
            © {new Date().getFullYear()} {tenant?.nombre || 'Grupo Ruiz'} · Gestión Multi-tenant de Ofertas
          </p>
        </div>
      </footer>
    </div>
  )
}
