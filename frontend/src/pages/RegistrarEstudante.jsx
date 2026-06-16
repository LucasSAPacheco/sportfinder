import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Navigation, Loader2, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authRegistrarEstudante, authLogin, geocodificar } from '../api'

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><Lock size={11} />{hint}</p>}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">{children}</p>
}

export default function RegistrarEstudante() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '', email: '', senha: '', confirmar: '',
    genero: '', endereco: '',
  })
  const [posicao, setPosicao] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const usarGPS = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicao({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => {
        setErro('Não foi possível obter localização via GPS.')
        setGpsLoading(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return }
    setErro('')
    setLoading(true)

    let lat = posicao?.lat
    let lon = posicao?.lon
    if (!lat && form.endereco) {
      const geo = await geocodificar(form.endereco)
      if (geo) { lat = geo.lat; lon = geo.lon }
    }

    try {
      await authRegistrarEstudante({
        nome: form.nome,
        cpf: form.cpf,
        email: form.email,
        senha: form.senha,
        data_nascimento: form.data_nascimento || undefined,
        genero: form.genero || undefined,
        latitude: lat,
        longitude: lon,
      })
      const res = await authLogin(form.email, form.senha)
      login(res.data.token, res.data.usuario)
      navigate('/buscar', { replace: true })
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-xs">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>

        <h1 className="text-xl font-bold text-gray-800 mb-1 text-center leading-tight">
          Saindo do sedentarismo
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6">
          Campos marcados com <span className="text-red-400 font-semibold">*</span> são obrigatórios
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          <SectionLabel>Dados obrigatórios</SectionLabel>

          <Field label="Nome completo" required>
            <input
              type="text"
              value={form.nome}
              onChange={set('nome')}
              placeholder="Seu nome completo"
              required
              className="input-field"
            />
          </Field>

          <Field
            label="CPF"
            required
            hint="O CPF não pode ser alterado após o cadastro."
          >
            <input
              type="text"
              value={form.cpf}
              onChange={set('cpf')}
              placeholder="000.000.000-00"
              required
              className="input-field"
            />
          </Field>

          <Field label="E-mail" required>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="nome@email.com"
              required
              className="input-field"
            />
          </Field>

          <Field label="Senha" required>
            <input
              type="password"
              value={form.senha}
              onChange={set('senha')}
              placeholder="mínimo 6 caracteres"
              required
              minLength={6}
              className="input-field"
            />
          </Field>

          <Field label="Confirmar senha" required>
            <input
              type="password"
              value={form.confirmar}
              onChange={set('confirmar')}
              placeholder="repita a senha"
              required
              className="input-field"
            />
          </Field>

          <SectionLabel>Informações adicionais (opcional)</SectionLabel>

          <Field label="Data de nascimento">
            <input
              type="date"
              value={form.data_nascimento}
              onChange={set('data_nascimento')}
              className="input-field"
            />
          </Field>

          <Field label="Gênero">
            <select value={form.genero} onChange={set('genero')} className="input-field">
              <option value="">Prefiro não informar</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </Field>

          <Field label="Localização">
            <input
              type="text"
              value={form.endereco}
              onChange={set('endereco')}
              placeholder="Rua, bairro, cidade..."
              className="input-field"
            />
            <button
              type="button"
              onClick={usarGPS}
              disabled={gpsLoading}
              className="mt-1.5 w-full flex items-center justify-center gap-2 text-xs text-primary border border-primary/30 py-2 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <Navigation size={13} />
              {gpsLoading ? 'Obtendo GPS...' : posicao ? '✓ Localização obtida via GPS' : 'Usar minha localização (GPS)'}
            </button>
          </Field>

          {erro && (
            <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            CRIAR CONTA
          </button>
        </form>
      </div>
    </div>
  )
}
