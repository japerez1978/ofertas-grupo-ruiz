import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import OfertasPage from './pages/OfertasPage'
import CrearOfertaPage from './pages/CrearOfertaPage'
import DetalleOfertaPage from './pages/DetalleOfertaPage'
import ScoringPage from './pages/ScoringPage'
import NegociosSinOfertaPage from './pages/NegociosSinOfertaPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<OfertasPage />} />
        <Route path="/crear" element={<CrearOfertaPage />} />
        <Route path="/oferta/:id" element={<DetalleOfertaPage />} />
        <Route path="/scoring" element={<ScoringPage />} />
        <Route path="/negocios" element={<NegociosSinOfertaPage />} />
      </Route>
    </Routes>
  )
}
