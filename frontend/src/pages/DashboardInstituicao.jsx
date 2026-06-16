import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Check, X, RefreshCw, Clock, Users, Loader2,
  Building2, Plus, Trash2, Save, Edit3, Camera, Phone,
  GraduationCap, Search,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getMinhasAplicacoes, decidirAplicacao,
  getMinhaInstituicao, atualizarInstituicao,
  adicionarModalidade, removerModalidade,
  getEsportes, getMatriculados, geocodificar,
} from '../api'
import ImageViewer from '../components/ImageViewer'

const STATUS_LABEL = {
  pendente: { text: 'Pendente', cls: 'bg-amber-100 text-amber-700' },
  aprovado: { text: 'Aprovado', cls: 'bg-green-100 text-green-700' },
  rejeitado: { text: 'Rejeitado', cls: 'bg-red-100 text-red-600' },
}

function initials(nome = '') {
  return nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export default function DashboardInstituicao() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fotoRef = useRef(null)
  const galeriaRef = useRef(null)
  const [galeriaSlot, setGaleriaSlot] = useState(0)
  const [galeria, setGaleria] = useState([null, null, null])
  const [fotoAberta, setFotoAberta] = useState(null)
  const [aba, setAba] = useState('candidaturas')

  const [aplicacoes, setAplicacoes] = useState([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [decidindo, setDecidindo] = useState(null)

  const [instInfo, setInstInfo] = useState(null)
  const [loadingInst, setLoadingInst] = useState(false)
  const [editando, setEditando] = useState(false)
  const [formInst, setFormInst] = useState({ nome_fantasia: '', telefone: '', endereco: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)
  const [todosEsportes, setTodosEsportes] = useState([])
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const modalVazio = { id_esporte: '', dias: [], horario: '', duracaoQtd: '', duracaoUnidade: 'minuto', diaInteiro: false }
  const [novaModal, setNovaModal] = useState(modalVazio)

  const buildHorarios = ({ dias, horario, duracaoQtd, duracaoUnidade, diaInteiro }) => {
    let str = ''
    if (dias.length > 0) {
      if (dias.length === 1) str = dias[0]
      else str = dias.slice(0, -1).join(', ') + ' e ' + dias[dias.length - 1]
    }
    if (horario) str += (str ? ' · ' : '') + horario
    if (diaInteiro) {
      str += (str ? ' · ' : '') + 'Dia inteiro'
    } else if (duracaoQtd) {
      const qtd = Number(duracaoQtd)
      const unidade = duracaoUnidade === 'hora'
        ? (qtd === 1 ? 'hora' : 'horas')
        : (qtd === 1 ? 'minuto' : 'minutos')
      str += (str ? ' · ' : '') + qtd + ' ' + unidade
    }
    return str
  }

  const toggleDia = (dia) =>
    setNovaModal((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia],
    }))
  const [addingModal, setAddingModal] = useState(false)
  const [removendo, setRemovendo] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const [matriculados, setMatriculados] = useState([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [filtroModalidade, setFiltroModalidade] = useState(null)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [uploadandoFoto, setUploadandoFoto] = useState(false)

  const flash = (msg) => { setSucesso(msg); setTimeout(() => setSucesso(''), 3000) }

  const handleFotoInstituicao = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setErro('Imagem muito grande. Use até 2 MB.'); return }
    setUploadandoFoto(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const res = await atualizarInstituicao({ foto_perfil: ev.target.result })
        setInstInfo((prev) => ({ ...prev, foto_perfil: res.data.foto_perfil }))
        flash('Foto atualizada!')
      } catch {
        setErro('Erro ao salvar a foto.')
      } finally {
        setUploadandoFoto(false)
      }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!instInfo) return
    try {
      const parsed = instInfo.galeria ? JSON.parse(instInfo.galeria) : []
      setGaleria([parsed[0] || null, parsed[1] || null, parsed[2] || null])
    } catch {
      setGaleria([null, null, null])
    }
  }, [instInfo])

  const abrirGaleriaInput = (slot) => {
    setGaleriaSlot(slot)
    galeriaRef.current?.click()
  }

  const handleGaleriaFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 2 * 1024 * 1024) { setErro('Imagem muito grande. Use até 2 MB.'); return }
    setUploadandoFoto(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const novaGaleria = [...galeria]
        novaGaleria[galeriaSlot] = ev.target.result
        await atualizarInstituicao({ galeria: JSON.stringify(novaGaleria) })
        setGaleria(novaGaleria)
        flash('Foto adicionada!')
      } catch {
        setErro('Erro ao salvar a foto.')
      } finally {
        setUploadandoFoto(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const removerFotoGaleria = async (slot) => {
    const novaGaleria = [...galeria]
    novaGaleria[slot] = null
    setUploadandoFoto(true)
    try {
      await atualizarInstituicao({ galeria: JSON.stringify(novaGaleria) })
      setGaleria(novaGaleria)
      flash('Foto removida.')
    } catch {
      setErro('Erro ao remover a foto.')
    } finally {
      setUploadandoFoto(false)
    }
  }

  // --- Candidaturas ---
  const carregarApps = async () => {
    setLoadingApps(true)
    try {
      const res = await getMinhasAplicacoes()
      setAplicacoes(res.data)
    } catch {
      setErro('Erro ao carregar candidaturas.')
    } finally {
      setLoadingApps(false)
    }
  }

  const decidir = async (id, aprovar) => {
    setDecidindo(id)
    try {
      const res = await decidirAplicacao(id, aprovar)
      setAplicacoes((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: res.data.status } : a))
      )
    } catch {
      setErro('Erro ao processar decisão.')
    } finally {
      setDecidindo(null)
    }
  }

  // --- Instituição ---
  const carregarInst = async () => {
    setLoadingInst(true)
    try {
      const [ri, re] = await Promise.all([getMinhaInstituicao(), getEsportes()])
      setInstInfo(ri.data)
      setFormInst({
        nome_fantasia: ri.data.nome_fantasia || '',
        telefone: ri.data.telefone || '',
        endereco: ri.data.endereco || '',
        descricao: ri.data.descricao || '',
      })
      setTodosEsportes(re.data)
    } catch {
      setErro('Erro ao carregar dados da instituição.')
    } finally {
      setLoadingInst(false)
    }
  }

  const salvarInfo = async () => {
    setSalvando(true)
    try {
      const payload = { ...formInst }
      if (formInst.endereco && formInst.endereco !== instInfo.endereco) {
        const geo = await geocodificar(formInst.endereco)
        if (geo) { payload.latitude = geo.lat; payload.longitude = geo.lon }
        else setErro('Endereço não encontrado no mapa — salvo sem localização. A instituição não aparecerá nas buscas por proximidade.')
      }
      const res = await atualizarInstituicao(payload)
      setInstInfo((prev) => ({ ...prev, ...res.data }))
      setEditando(false)
      flash('Informações atualizadas!')
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const handleAdicionarModal = async () => {
    if (!novaModal.id_esporte) return
    if (novaModal.dias.length === 0) { setErro('Selecione pelo menos um dia da semana.'); return }
    if (!novaModal.horario) { setErro('Informe o horário das aulas.'); return }
    setAddingModal(true)
    try {
      const horarios = buildHorarios(novaModal)
      const res = await adicionarModalidade(Number(novaModal.id_esporte), horarios)
      setInstInfo((prev) => ({ ...prev, modalidades: [...prev.modalidades, res.data] }))
      setNovaModal(modalVazio)
      setShowAddModal(false)
      flash('Modalidade adicionada!')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao adicionar modalidade.')
    } finally {
      setAddingModal(false)
    }
  }

  const handleRemoverModal = async (id_esporte) => {
    setRemovendo(id_esporte)
    try {
      await removerModalidade(id_esporte)
      setInstInfo((prev) => ({
        ...prev,
        modalidades: prev.modalidades.filter((m) => m.id_esporte !== id_esporte),
      }))
      flash('Modalidade removida.')
    } catch {
      setErro('Erro ao remover modalidade.')
    } finally {
      setRemovendo(null)
    }
  }

  const carregarAlunos = async () => {
    setLoadingAlunos(true)
    try {
      const res = await getMatriculados()
      setMatriculados(res.data)
    } catch {
      setErro('Erro ao carregar lista de alunos.')
    } finally {
      setLoadingAlunos(false)
    }
  }

  useEffect(() => { carregarApps() }, [])
  useEffect(() => {
    if (aba === 'instituicao' && !instInfo) carregarInst()
    if (aba === 'alunos') carregarAlunos()
  }, [aba])

  const handleLogout = () => { logout(); navigate('/') }

  const pendentes = aplicacoes.filter((a) => a.status === 'pendente')
  const historico = aplicacoes.filter((a) => a.status !== 'pendente')

  const esportesDisponiveis = todosEsportes.filter(
    (e) => !instInfo?.modalidades.some((m) => m.id_esporte === e.id)
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ImageViewer src={fotoAberta} onClose={() => setFotoAberta(null)} />
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <img src="/SportFinder-logo.svg" alt="Sport Finder" className="h-9" />
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.nome}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Sair</span>
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 flex">
        <button
          onClick={() => setAba('candidaturas')}
          className={`flex-1 sm:flex-none sm:px-8 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
            aba === 'candidaturas'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users size={15} />
          Candidaturas
          {pendentes.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {pendentes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setAba('instituicao')}
          className={`flex-1 sm:flex-none sm:px-8 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
            aba === 'instituicao'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Building2 size={15} />
          Minha Instituição
        </button>
        <button
          onClick={() => setAba('alunos')}
          className={`flex-1 sm:flex-none sm:px-8 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
            aba === 'alunos'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <GraduationCap size={15} />
          Alunos
          {matriculados.length > 0 && (
            <span className="bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {matriculados.length}
            </span>
          )}
        </button>
      </div>

      {sucesso && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700 font-medium text-center">
          {sucesso}
        </div>
      )}
      {erro && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600 text-center flex items-center justify-between">
          {erro}
          <button onClick={() => setErro('')} className="text-red-400 hover:text-red-600 ml-4">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 w-full">

        {aba === 'candidaturas' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Clock size={15} className="text-amber-500" />
                Pendentes
                {pendentes.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendentes.length}
                  </span>
                )}
              </h2>
              <button
                onClick={carregarApps}
                disabled={loadingApps}
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <RefreshCw size={15} className={loadingApps ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingApps ? (
              <div className="flex justify-center py-10">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : pendentes.length === 0 ? (
              <div className="card text-center py-10">
                <Users size={36} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma candidatura pendente.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pendentes.map((ap) => (
                  <div key={ap.id} className="card flex items-center justify-between gap-4">
                    <div
                      className={`w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ${ap.foto_perfil ? 'cursor-pointer' : ''}`}
                      onClick={() => { if (ap.foto_perfil) setFotoAberta(ap.foto_perfil) }}
                    >
                      {ap.foto_perfil
                        ? <img src={ap.foto_perfil} alt="" className="w-full h-full object-cover" />
                        : <span className="text-primary font-bold text-xs">{ap.aluno?.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-800 truncate">{ap.aluno}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ap.modalidade} •{' '}
                        {ap.data ? new Date(ap.data).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => decidir(ap.id, false)}
                        disabled={decidindo === ap.id}
                        title="Rejeitar"
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {decidindo === ap.id ? <Loader2 size={15} className="animate-spin" /> : <X size={16} />}
                      </button>
                      <button
                        onClick={() => decidir(ap.id, true)}
                        disabled={decidindo === ap.id}
                        title="Aprovar"
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {decidindo === ap.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {historico.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-gray-700 mt-2">Histórico</h2>
                <div className="flex flex-col gap-2">
                  {historico.map((ap) => {
                    const s = STATUS_LABEL[ap.status] ?? STATUS_LABEL.pendente
                    return (
                      <div key={ap.id} className="card flex items-center justify-between gap-4">
                        <div
                          className={`w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ${ap.foto_perfil ? 'cursor-pointer' : ''}`}
                          onClick={() => { if (ap.foto_perfil) setFotoAberta(ap.foto_perfil) }}
                        >
                          {ap.foto_perfil
                            ? <img src={ap.foto_perfil} alt="" className="w-full h-full object-cover" />
                            : <span className="text-primary font-bold text-xs">{ap.aluno?.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</span>
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-700 truncate">{ap.aluno}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ap.modalidade}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${s.cls}`}>
                          {s.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {aba === 'instituicao' && (
          <div className="flex flex-col gap-5">
            {loadingInst ? (
              <div className="flex justify-center py-10">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : instInfo ? (
              <>
                <div className="card">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div
                        className={`w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden border-4 border-white shadow ${instInfo.foto_perfil ? 'cursor-pointer' : ''}`}
                        onClick={() => { if (instInfo.foto_perfil) setFotoAberta(instInfo.foto_perfil) }}
                      >
                        {instInfo.foto_perfil
                          ? <img src={instInfo.foto_perfil} alt="logo" className="w-full h-full object-cover" />
                          : <span className="text-white font-bold text-2xl">{initials(instInfo.nome_fantasia)}</span>
                        }
                      </div>
                      <button
                        onClick={() => fotoRef.current?.click()}
                        disabled={uploadandoFoto}
                        title="Alterar foto"
                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow border-2 border-white hover:bg-primary-dark transition-colors disabled:opacity-60"
                      >
                        {uploadandoFoto
                          ? <Loader2 size={13} className="text-white animate-spin" />
                          : <Camera size={13} className="text-white" />}
                      </button>
                      {instInfo.foto_perfil && (
                        <button
                          onClick={async () => {
                            setUploadandoFoto(true)
                            try {
                              await atualizarInstituicao({ foto_perfil: null })
                              setInstInfo((prev) => ({ ...prev, foto_perfil: null }))
                              flash('Foto removida.')
                            } catch {
                              setErro('Erro ao remover a foto.')
                            } finally {
                              setUploadandoFoto(false)
                            }
                          }}
                          disabled={uploadandoFoto}
                          title="Remover foto"
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow border-2 border-white hover:bg-red-600 transition-colors disabled:opacity-60"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      )}
                      <input
                        ref={fotoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFotoInstituicao}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Informações</h2>
                    {!editando ? (
                      <button
                        onClick={() => setEditando(true)}
                        className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary-dark transition-colors"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditando(false); setFormInst({ nome_fantasia: instInfo.nome_fantasia || '', telefone: instInfo.telefone || '', endereco: instInfo.endereco || '', descricao: instInfo.descricao || '' }) }}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={salvarInfo}
                          disabled={salvando}
                          className="flex items-center gap-1.5 text-xs bg-primary text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
                        >
                          {salvando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Salvar
                        </button>
                      </div>
                    )}
                  </div>

                  <dl className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <dt className="text-xs font-semibold text-gray-500 mb-1">CNPJ</dt>
                        <dd className="text-sm text-gray-700">{instInfo.cnpj}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 mb-1">ID</dt>
                        <dd className="text-sm text-gray-700">#{instInfo.id}</dd>
                      </div>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold text-gray-500 mb-1">Nome Fantasia</dt>
                      {editando ? (
                        <input
                          value={formInst.nome_fantasia}
                          onChange={(e) => setFormInst((f) => ({ ...f, nome_fantasia: e.target.value }))}
                          className="input-field text-sm py-2"
                        />
                      ) : (
                        <dd className="text-sm text-gray-700">{instInfo.nome_fantasia || '—'}</dd>
                      )}
                    </div>

                    <div>
                      <dt className="text-xs font-semibold text-gray-500 mb-1">Telefone</dt>
                      {editando ? (
                        <input
                          type="tel"
                          value={formInst.telefone}
                          onChange={(e) => setFormInst((f) => ({ ...f, telefone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className="input-field text-sm py-2"
                        />
                      ) : (
                        <dd className="text-sm text-gray-700 flex items-center gap-1.5">
                          {instInfo.telefone
                            ? <><Phone size={12} className="text-primary" />{instInfo.telefone}</>
                            : '—'}
                        </dd>
                      )}
                    </div>

                    <div>
                      <dt className="text-xs font-semibold text-gray-500 mb-1">Endereço</dt>
                      {editando ? (
                        <input
                          value={formInst.endereco}
                          onChange={(e) => setFormInst((f) => ({ ...f, endereco: e.target.value }))}
                          placeholder="Rua, nº, bairro, cidade"
                          className="input-field text-sm py-2"
                        />
                      ) : (
                        <dd className="text-sm text-gray-700">{instInfo.endereco || '—'}</dd>
                      )}
                    </div>

                    <div>
                      <dt className="text-xs font-semibold text-gray-500 mb-1">Descrição</dt>
                      {editando ? (
                        <textarea
                          value={formInst.descricao}
                          onChange={(e) => setFormInst((f) => ({ ...f, descricao: e.target.value }))}
                          placeholder="Conte sobre sua instituição..."
                          rows={3}
                          className="input-field text-sm py-2 resize-none"
                        />
                      ) : (
                        <dd className="text-sm text-gray-700 leading-relaxed">{instInfo.descricao || '—'}</dd>
                      )}
                    </div>
                  </dl>
                </div>

                <div className="card">
                  <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Camera size={14} className="text-primary" />
                    Galeria
                  </h2>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex-1 relative">
                        {galeria[i] ? (
                          <div className="relative aspect-square">
                            <img
                              src={galeria[i]}
                              alt={`Foto ${i + 1}`}
                              className="w-full h-full object-cover rounded-xl cursor-pointer"
                              onClick={() => setFotoAberta(galeria[i])}
                            />
                            <button
                              onClick={() => removerFotoGaleria(i)}
                              disabled={uploadandoFoto}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors disabled:opacity-50"
                            >
                              <X size={11} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => abrirGaleriaInput(i)}
                            disabled={uploadandoFoto}
                            className="w-full aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 hover:bg-gray-50 hover:border-primary/30 transition-colors disabled:opacity-40"
                          >
                            {uploadandoFoto ? (
                              <Loader2 size={18} className="text-gray-300 animate-spin" />
                            ) : (
                              <>
                                <Camera size={18} className="text-gray-300" />
                                <span className="text-xs text-gray-300">Foto</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <input
                    ref={galeriaRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGaleriaFoto}
                  />
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Modalidades</h2>
                    {esportesDisponiveis.length > 0 && (
                      <button
                        onClick={() => setShowAddModal((v) => !v)}
                        className="flex items-center gap-1.5 text-xs bg-primary text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        <Plus size={13} />
                        Adicionar
                      </button>
                    )}
                  </div>

                  {showAddModal && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-3 flex flex-col gap-4 border border-gray-200">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nova modalidade</p>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                          Modalidade <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={novaModal.id_esporte}
                          onChange={(e) => setNovaModal((f) => ({ ...f, id_esporte: e.target.value }))}
                          className="input-field text-sm py-2"
                        >
                          <option value="">Selecione...</option>
                          {esportesDisponiveis.map((e) => (
                            <option key={e.id} value={e.id}>{e.nome}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                          Dias da semana <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-1.5 flex-wrap">
                          {DIAS.map((dia) => {
                            const sel = novaModal.dias.includes(dia)
                            return (
                              <button
                                key={dia}
                                type="button"
                                onClick={() => toggleDia(dia)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  sel
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-500 border border-gray-200 hover:border-primary/40 hover:text-primary'
                                }`}
                              >
                                {dia}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                          Horário de início <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="time"
                          value={novaModal.horario}
                          onChange={(e) => setNovaModal((f) => ({ ...f, horario: e.target.value }))}
                          className="input-field text-sm py-2 w-36"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                          Duração da aula <span className="text-gray-300 font-normal">(opcional)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={novaModal.duracaoQtd}
                            onChange={(e) => setNovaModal((f) => ({ ...f, duracaoQtd: e.target.value }))}
                            placeholder="45"
                            disabled={novaModal.diaInteiro}
                            className="input-field text-sm py-2 w-20 disabled:opacity-40"
                          />
                          <select
                            value={novaModal.duracaoUnidade}
                            onChange={(e) => setNovaModal((f) => ({ ...f, duracaoUnidade: e.target.value }))}
                            disabled={novaModal.diaInteiro}
                            className="input-field text-sm py-2 disabled:opacity-40"
                          >
                            <option value="minuto">minuto(s)</option>
                            <option value="hora">hora(s)</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={novaModal.diaInteiro}
                              onChange={(e) => setNovaModal((f) => ({ ...f, diaInteiro: e.target.checked, duracaoQtd: '', duracaoUnidade: 'minuto' }))}
                              className="accent-primary w-4 h-4"
                            />
                            Dia inteiro
                          </label>
                        </div>
                      </div>

                      {(novaModal.dias.length > 0 || novaModal.horario) && (
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-0.5">Resultado</p>
                          <p className="text-sm font-medium text-gray-700">
                            {buildHorarios(novaModal) || '—'}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => { setShowAddModal(false); setNovaModal(modalVazio) }}
                          className="flex-1 text-sm text-gray-400 hover:text-gray-600 py-2 rounded-lg border border-gray-200 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAdicionarModal}
                          disabled={addingModal || !novaModal.id_esporte || novaModal.dias.length === 0 || !novaModal.horario}
                          className="flex-1 bg-primary text-white text-sm font-semibold py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {addingModal ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          Adicionar
                        </button>
                      </div>
                    </div>
                  )}

                  {instInfo.modalidades.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Nenhuma modalidade cadastrada ainda.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {instInfo.modalidades.map((mod) => (
                        <div
                          key={mod.id_esporte}
                          className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-gray-800">{mod.nome}</p>
                              {mod.num_inscritos > 0 && (
                                <span className="text-xs text-gray-400 font-normal">
                                  {mod.num_inscritos} {mod.num_inscritos === 1 ? 'inscrito' : 'inscritos'}
                                </span>
                              )}
                            </div>
                            {mod.horarios && (
                              <p className="text-xs text-gray-400 mt-0.5">{mod.horarios}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoverModal(mod.id_esporte)}
                            disabled={removendo === mod.id_esporte}
                            title="Remover modalidade"
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {removendo === mod.id_esporte
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
        {aba === 'alunos' && (() => {
          const modalidades = [...new Set(matriculados.map((m) => m.modalidade).filter(Boolean))]
          const filtrados = matriculados.filter((m) => {
            const q = buscaAluno.toLowerCase()
            const textOk = !buscaAluno
              || m.aluno?.toLowerCase().includes(q)
              || m.cpf?.toLowerCase().replace(/\D/g, '').includes(q.replace(/\D/g, ''))
            const modalOk = !filtroModalidade || m.modalidade === filtroModalidade
            return textOk && modalOk
          })

          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <GraduationCap size={15} className="text-primary" />
                  Alunos matriculados
                  <span className="text-gray-400 font-normal">
                    ({filtrados.length}{filtrados.length !== matriculados.length ? ` de ${matriculados.length}` : ''})
                  </span>
                </h2>
                <button
                  onClick={carregarAlunos}
                  disabled={loadingAlunos}
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <RefreshCw size={15} className={loadingAlunos ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    placeholder="Buscar por nome ou CPF..."
                    className="input-field pl-9 text-sm py-2"
                  />
                  {buscaAluno && (
                    <button
                      onClick={() => setBuscaAluno('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {modalidades.length > 0 && (
                  <select
                    value={filtroModalidade ?? ''}
                    onChange={(e) => setFiltroModalidade(e.target.value || null)}
                    className="input-field text-sm py-2"
                  >
                    <option value="">Todas as modalidades ({matriculados.length} alunos)</option>
                    {modalidades.map((m) => {
                      const count = matriculados.filter((a) => a.modalidade === m).length
                      return (
                        <option key={m} value={m}>{m} — {count} {count === 1 ? 'aluno' : 'alunos'}</option>
                      )
                    })}
                  </select>
                )}

                {(buscaAluno || filtroModalidade) && (
                  <button
                    onClick={() => { setBuscaAluno(''); setFiltroModalidade(null) }}
                    className="text-xs text-primary font-semibold hover:text-primary-dark self-start transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {loadingAlunos ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={28} className="animate-spin text-primary" />
                </div>
              ) : filtrados.length === 0 ? (
                <div className="card text-center py-12 flex flex-col items-center gap-2">
                  <GraduationCap size={36} className="text-gray-200" />
                  <p className="text-sm text-gray-400">
                    {matriculados.length === 0
                      ? 'Nenhum aluno matriculado ainda.'
                      : 'Nenhum aluno encontrado com esses filtros.'}
                  </p>
                  {(buscaAluno || filtroModalidade) && (
                    <button
                      onClick={() => { setBuscaAluno(''); setFiltroModalidade(null) }}
                      className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtrados.map((m) => (
                    <div key={m.id} className="card flex items-center justify-between gap-3">
                      <div
                        className={`w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ${m.foto_perfil ? 'cursor-pointer' : ''}`}
                        onClick={() => { if (m.foto_perfil) setFotoAberta(m.foto_perfil) }}
                      >
                        {m.foto_perfil
                          ? <img src={m.foto_perfil} alt="" className="w-full h-full object-cover" />
                          : <span className="text-primary font-bold text-xs">{m.aluno?.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-800 truncate">{m.aluno}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{m.modalidade}</p>
                        {m.cpf && <p className="text-xs text-gray-300 mt-0.5">CPF: {m.cpf}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Matriculado
                        </span>
                        {m.data_matricula && (
                          <p className="text-xs text-gray-300 mt-1">
                            {new Date(m.data_matricula).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
