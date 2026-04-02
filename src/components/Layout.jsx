import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, Sliders, AlertTriangle, LogOut, ClipboardList } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Grupo Ruiz logo"
                className="w-10 h-10 rounded-xl object-contain group-hover:opacity-90 transition-opacity duration-300"
              />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                  GRUPO RUIZ
                </h1>
                <span className="text-[10px] font-medium tracking-[0.2em] text-accent-400 uppercase">
                  Ofertas
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

              {/* Separator + Logout */}
              <div className="w-px h-6 bg-white/10 mx-2"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-steel-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                title={user?.email || 'Cerrar sesión'}
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
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-steel-500">
            © {new Date().getFullYear()} Grupo Ruiz · Gestión de Ofertas · Conectado con HubSpot CRM
          </p>
        </div>
      </footer>
    </div>
  )
}
