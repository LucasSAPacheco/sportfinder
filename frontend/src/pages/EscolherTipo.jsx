import { useNavigate } from 'react-router-dom'
import { ChevronLeft, User, Building2 } from 'lucide-react'

export default function EscolherTipo() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="flex flex-col items-center gap-8">
          <img src="/SportFinder-logo.svg" alt="Sport Finder" className="w-40" />

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => navigate('/registrar/estudante')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-green-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <User size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Sou praticante</p>
                <p className="text-xs text-gray-400 mt-0.5">Quero encontrar um esporte</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/registrar/instituicao')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gold hover:bg-amber-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                <Building2 size={22} className="text-gold" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Sou instituição</p>
                <p className="text-xs text-gray-400 mt-0.5">Quero divulgar minha prática</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
          >
            Já tenho uma conta — <span className="font-medium text-primary">Entrar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
