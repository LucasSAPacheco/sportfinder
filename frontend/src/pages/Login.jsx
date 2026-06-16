import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authLogin } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', senha: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await authLogin(form.email, form.senha)
      login(res.data.token, res.data.usuario)
      navigate(res.data.usuario.tipo === 'instituicao' ? '/dashboard' : '/buscar', { replace: true })
    } catch (err) {
      setErro(err.response?.data?.detail || 'E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

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

        <div className="flex flex-col items-center gap-6">
          <img src="/SportFinder-logo.svg" alt="Sport Finder" className="w-36" />

          <div className="w-full bg-gray-50 rounded-2xl p-5 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="seu@email.com"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Senha</label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={set('senha')}
                    placeholder="sua senha"
                    required
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {erro && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-2 mt-1"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                ENTRAR
              </button>
            </form>
          </div>

          <button
            onClick={() => navigate('/esqueci-senha')}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
          >
            Esqueci minha senha
          </button>

          <button
            onClick={() => navigate('/escolher-tipo')}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
          >
            Não tem conta? <span className="font-medium text-primary">Criar conta</span>
          </button>
        </div>
      </div>
    </div>
  )
}
