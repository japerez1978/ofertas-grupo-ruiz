import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import OfertasPage from './pages/OfertasPage'
import CrearOfertaPage from './pages/CrearOfertaPage'
import DetalleOfertaPage from './pages/DetalleOfertaPage'
import ScoringPage from './pages/ScoringPage'
import NegociosSinOfertaPage from './pages/NegociosSinOfertaPage'
import BacklogPage from './pages/BacklogPage'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public route: Login */}
      <Route path="/login" element={user ? <Navigate to="/ofertas" replace /> : <LoginPage />} />

      {/* Protected routes: everything else */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<OfertasPage />} />
          <Route path="/ofertas" element={<OfertasPage />} />
          <Route path="/crear" element={<CrearOfertaPage />} />
          <Route path="/oferta/:id" element={<DetalleOfertaPage />} />
          <Route path="/scoring" element={<ScoringPage />} />
          <Route path="/negocios" element={<NegociosSinOfertaPage />} />
          <Route path="/backlog" element={<BacklogPage />} />
        </Route>
      </Route>

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
