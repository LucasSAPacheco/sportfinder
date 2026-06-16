import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Mail, KeyRound, Lock, Loader2, CheckCircle } from 'lucide-react'
import { esqueceuSenha, redefinirSenha } from '../api'

export default function EsqueciSenha() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState('email')
  const [email, setEmail] = useState('')
  const [codigoGerado, setCodigoGerado] = useState('')
  const [form, setForm] = useState({ codigo: '', nova_senha: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await esqueceuSenha(email)
      if (res.data.codigo) {
        setCodigoGerado(res.data.codigo)
      }
      setEtapa('codigo')
    } catch {
      setErro('Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleRedefinir = async (e) => {
    e.preventDefault()
    if (form.nova_senha !== form.confirmar) {
      setErro('As senhas não coincidem.')
      return
    }
    setErro('')
    setLoading(true)
    try {
      await redefinirSenha(email, form.codigo, form.nova_senha)
      setEtapa('sucesso')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft size={20} />
          <span className="text-sm">Voltar para login</span>
        </button>

        <div className="flex flex-col items-center gap-6">
          <img src="/SportFinder-logo.svg" alt="Sport Finder" className="w-36" />

          {etapa === 'email' && (
            <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Mail size={18} className="text-primary" />
                <h2 className="font-bold text-gray-700 text-sm">Recuperar senha</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Digite seu e-mail cadastrado. Um código de verificação será gerado.
              </p>
              <form onSubmit={handleSolicitarCodigo} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="input-field"
                />
                {erro && <p className="text-red-500 text-xs">{erro}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  GERAR CÓDIGO
                </button>
              </form>
            </div>
          )}

          {etapa === 'codigo' && (
            <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound size={18} className="text-primary" />
                <h2 className="font-bold text-gray-700 text-sm">Digite o código</h2>
              </div>

              {codigoGerado && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-amber-700 font-medium">Código de verificação</p>
                  <p className="text-2xl font-mono font-bold text-amber-800 tracking-widest mt-1 text-center">
                    {codigoGerado}
                  </p>
                </div>
              )}

              <form onSubmit={handleRedefinir} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Código</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={set('codigo')}
                    placeholder="Ex.: A3F9C2"
                    required
                    className="input-field font-mono tracking-widest uppercase"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nova senha</label>
                  <input
                    type="password"
                    value={form.nova_senha}
                    onChange={set('nova_senha')}
                    placeholder="mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={form.confirmar}
                    onChange={set('confirmar')}
                    placeholder="repita a nova senha"
                    required
                    className="input-field"
                  />
                </div>
                {erro && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{erro}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                  REDEFINIR SENHA
                </button>
              </form>
            </div>
          )}

          {etapa === 'sucesso' && (
            <div className="w-full text-center flex flex-col items-center gap-4">
              <CheckCircle size={52} className="text-primary" />
              <div>
                <p className="font-bold text-gray-800">Senha redefinida!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Sua senha foi alterada com sucesso.
                </p>
              </div>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                FAZER LOGIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
