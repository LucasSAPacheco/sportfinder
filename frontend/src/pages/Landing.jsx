import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) navigate(user.tipo === 'instituicao' ? '/dashboard' : '/buscar', { replace: true })
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-10">
        <img src="/SportFinder-logo.svg" alt="Sport Finder" className="w-52 drop-shadow-sm" />

        <div className="w-full flex flex-col gap-3">
          <button className="btn-primary text-sm" onClick={() => navigate('/login')}>
            ENTRAR
          </button>
          <button className="btn-gold text-sm" onClick={() => navigate('/escolher-tipo')}>
            CRIAR CONTA
          </button>
        </div>

        <p className="text-gray-400 text-sm text-center font-medium">
          Promovendo o esporte no Brasil
        </p>
      </div>
    </div>
  )
}
