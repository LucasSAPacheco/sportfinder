import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, tipo }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (tipo && user.tipo !== tipo) {
    return <Navigate to={user.tipo === 'instituicao' ? '/dashboard' : '/buscar'} replace />
  }
  return children
}
