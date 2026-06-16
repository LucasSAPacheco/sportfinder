import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, XCircle, MapPin, Loader2, RefreshCw,
  ChevronRight, Search, Edit3, Save, X, Camera,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMeuPerfil, atualizarMeuPerfil, getMinhasCandidaturas } from '../api'
import StudentHeader from '../components/StudentHeader'
import ImageViewer from '../components/ImageViewer'

function initials(nome = '') {
  return nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function calcIdade(dataStr) {
  if (!dataStr) return null
  const hoje = new Date()
  const nasc = new Date(dataStr)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function MeuPerfil() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [perfil, setPerfil] = useState(null)
  const [candidaturas, setCandidaturas] = useState([])
  const [loading, setLoading] = useState(true)

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ nome: '', data_nascimento: '', genero: '' })
  const [fotoPreview, setFotoPreview] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [fotoAberta, setFotoAberta] = useState(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const [rp, rc] = await Promise.all([getMeuPerfil(), getMinhasCandidaturas()])
      setPerfil(rp.data)
      setCandidaturas(rc.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const abrirEdicao = () => {
    setForm({
      nome: perfil?.nome || '',
      data_nascimento: perfil?.data_nascimento || '',
      genero: perfil?.genero || '',
    })
    setFotoPreview(perfil?.foto_perfil || null)
    setErro('')
    setEditando(true)
  }

  const cancelarEdicao = () => {
    setEditando(false)
    setFotoPreview(null)
    setErro('')
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErro('Imagem muito grande. Use até 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setFotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome não pode ficar vazio.'); return }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        nome: form.nome.trim(),
        genero: form.genero || null,
        data_nascimento: form.data_nascimento || null,
        foto_perfil: fotoPreview !== perfil?.foto_perfil ? (fotoPreview || null) : undefined,
      }
      const res = await atualizarMeuPerfil(payload)
      setPerfil(res.data)
      const token = localStorage.getItem('sf_token')
      login(token, { ...user, nome: res.data.nome })
      setEditando(false)
      setSucesso('Perfil atualizado!')
      setTimeout(() => setSucesso(''), 3000)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const matriculas = candidaturas.filter((c) => c.status === 'aprovado')
  const pendentes  = candidaturas.filter((c) => c.status === 'pendente')
  const rejeitadas = candidaturas.filter((c) => c.status === 'rejeitado')

  const fotoAtual = editando ? fotoPreview : perfil?.foto_perfil

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ImageViewer src={fotoAberta} onClose={() => setFotoAberta(null)} />
      <StudentHeader />

      {sucesso && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700 font-medium text-center">
          {sucesso}
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-6 w-full flex flex-col gap-5">

        {/* Card de perfil */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div
                className={`w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden ${fotoAtual && !editando ? 'cursor-pointer' : ''}`}
                onClick={() => { if (fotoAtual && !editando) setFotoAberta(fotoAtual) }}
              >
                {fotoAtual
                  ? <img src={fotoAtual} alt="foto" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-xl">{initials(perfil?.nome ?? user?.nome)}</span>
                }
              </div>
              {editando && fotoPreview && (
                <button
                  onClick={() => setFotoPreview(null)}
                  title="Remover foto"
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow border-2 border-white hover:bg-red-600 transition-colors"
                >
                  <X size={9} className="text-white" />
                </button>
              )}
              {editando && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow border-2 border-white hover:bg-primary-dark transition-colors"
                  >
                    <Camera size={11} className="text-white" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFoto}
                  />
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editando ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Seu nome"
                    className="input-field text-sm py-1.5"
                  />
                  <input
                    type="date"
                    value={form.data_nascimento}
                    onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                    className="input-field text-sm py-1.5"
                  />
                  <select
                    value={form.genero}
                    onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))}
                    className="input-field text-sm py-1.5"
                  >
                    <option value="">Gênero (opcional)</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </select>
                  {erro && (
                    <p className="text-xs text-red-500">{erro}</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-bold text-gray-800 text-base truncate">{perfil?.nome ?? user?.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{perfil?.email}</p>
                  {perfil?.data_nascimento && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {calcIdade(perfil.data_nascimento)} anos
                      {perfil.genero ? ` · ${perfil.genero}` : ''}
                    </p>
                  )}
                  {perfil?.cpf && (
                    <p className="text-xs text-gray-400 mt-0.5">CPF: {perfil.cpf}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-0.5">ID #{user?.id}</p>
                </>
              )}
            </div>

            <div className="flex gap-1.5 shrink-0">
              {editando ? (
                <>
                  <button
                    onClick={cancelarEdicao}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={salvar}
                    disabled={salvando}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={carregar}
                    disabled={loading}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-primary transition-colors"
                    title="Atualizar"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={abrirEdicao}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                    title="Editar perfil"
                  >
                    <Edit3 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Matrículas ativas */}
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle size={13} className="text-green-500" />
                Matrículas ativas
                {matriculas.length > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full normal-case">
                    {matriculas.length}
                  </span>
                )}
              </h2>
              {matriculas.length === 0 ? (
                <div className="card text-center py-8 text-sm text-gray-400">
                  Nenhuma matrícula aprovada ainda.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {matriculas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/instituicao/${c.id_instituicao}`)}
                      className="card flex items-center justify-between gap-3 hover:border-primary/30 hover:bg-green-50/50 transition-all text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {c.nome_fantasia || c.instituicao}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin size={11} className="text-primary shrink-0" />
                          {c.modalidade}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Aprovado
                        </span>
                        <ChevronRight size={15} className="text-gray-300" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Candidaturas pendentes */}
            {pendentes.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={13} className="text-amber-500" />
                  Aguardando resposta
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full normal-case">
                    {pendentes.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-2">
                  {pendentes.map((c) => (
                    <div key={c.id} className="card flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-700 truncate">
                          {c.nome_fantasia || c.instituicao}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.modalidade}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                        Pendente
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Histórico rejeitados */}
            {rejeitadas.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Histórico
                </h2>
                <div className="flex flex-col gap-2">
                  {rejeitadas.map((c) => (
                    <div key={c.id} className="card flex items-center justify-between gap-3 opacity-60">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-700 truncate">
                          {c.nome_fantasia || c.instituicao}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.modalidade}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-500 shrink-0">
                        Rejeitado
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {candidaturas.length === 0 && (
              <div className="card text-center py-10 flex flex-col items-center gap-3">
                <Search size={36} className="text-gray-200" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Nenhuma candidatura ainda</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Busque instituições e se candidate a uma modalidade
                  </p>
                </div>
                <button
                  onClick={() => navigate('/buscar')}
                  className="mt-1 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Buscar instituições
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
