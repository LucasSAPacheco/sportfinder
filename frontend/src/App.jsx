import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Landing from './pages/Landing.jsx'
import EscolherTipo from './pages/EscolherTipo.jsx'
import RegistrarEstudante from './pages/RegistrarEstudante.jsx'
import RegistrarInstituicao from './pages/RegistrarInstituicao.jsx'
import Login from './pages/Login.jsx'
import BuscarInstituicoes from './pages/BuscarInstituicoes.jsx'
import DetalhesInstituicao from './pages/DetalhesInstituicao.jsx'
import DashboardInstituicao from './pages/DashboardInstituicao.jsx'
import EsqueciSenha from './pages/EsqueciSenha.jsx'
import MeuPerfil from './pages/MeuPerfil.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/escolher-tipo" element={<EscolherTipo />} />
          <Route path="/registrar/estudante" element={<RegistrarEstudante />} />
          <Route path="/registrar/instituicao" element={<RegistrarInstituicao />} />
          <Route path="/login" element={<Login />} />
          <Route path="/buscar" element={
            <ProtectedRoute tipo="estudante">
              <BuscarInstituicoes />
            </ProtectedRoute>
          } />
          <Route path="/instituicao/:id" element={
            <ProtectedRoute tipo="estudante">
              <DetalhesInstituicao />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute tipo="instituicao">
              <DashboardInstituicao />
            </ProtectedRoute>
          } />
          <Route path="/meu-perfil" element={
            <ProtectedRoute tipo="estudante">
              <MeuPerfil />
            </ProtectedRoute>
          } />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
