import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function StudentHeader() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navLink = (to, Icon, label) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-primary/10 text-primary'
          : 'text-gray-500 hover:text-primary hover:bg-gray-50'
      }`}
    >
      <Icon size={15} />
      <span className="hidden sm:block">{label}</span>
    </Link>
  )

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <img src="/SportFinder-logo.svg" alt="Sport Finder" className="h-9" />
      <nav className="flex items-center gap-1">
        {navLink('/buscar', Search, 'Buscar')}
        {navLink('/meu-perfil', User, 'Meu Perfil')}
        <button
          onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Sair</span>
        </button>
      </nav>
    </header>
  )
}
