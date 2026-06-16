import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, MapPin, Clock, CheckCircle, Loader2, AlertCircle, Phone, Camera } from 'lucide-react'
import { getInstituicao, aplicar } from '../api'
import ImageViewer from '../components/ImageViewer'

function formatarDistancia(km) {
  if (!km && km !== 0) return null
  if (km < 1) return `${Math.round(km * 1000)} m de você`
  return `${km} km de você`
}

export default function DetalhesInstituicao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const distanciaState = location.state?.distancia_km

  const [inst, setInst] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selecionados, setSelecionados] = useState([])
  const [aplicando, setAplicando] = useState(false)
  const [aplicados, setAplicados] = useState([])
  const [erros, setErros] = useState({})
  const [fotoAberta, setFotoAberta] = useState(null)

  useEffect(() => {
    getInstituicao(id)
      .then((r) => setInst(r.data))
      .catch(() => navigate('/buscar'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const toggleModality = (idEsporte) => {
    if (aplicados.includes(idEsporte)) return
    setSelecionados((prev) =>
      prev.includes(idEsporte) ? prev.filter((e) => e !== idEsporte) : [...prev, idEsporte]
    )
  }

  const handleAplicar = async () => {
    if (selecionados.length === 0) return
    setAplicando(true)
    setErros({})
    const novosErros = {}
    const novosAplicados = []

    await Promise.all(
      selecionados.map(async (idEsporte) => {
        try {
          await aplicar(Number(id), idEsporte)
          novosAplicados.push(idEsporte)
        } catch (err) {
          const msg = err.response?.data?.detail || 'Erro ao candidatar.'
          novosErros[idEsporte] = msg.includes('409') || msg.includes('candidatou')
            ? 'Você já se candidatou a esta modalidade.'
            : msg
        }
      })
    )

    setAplicados((prev) => [...prev, ...novosAplicados])
    setSelecionados((prev) => prev.filter((e) => !novosAplicados.includes(e)))
    setErros(novosErros)
    setAplicando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!inst) return null

  const distanciaLabel = formatarDistancia(distanciaState)
  const podeCandidatar = selecionados.length > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <ImageViewer src={fotoAberta} onClose={() => setFotoAberta(null)} />
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-primary transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <img src="/SportFinder-logo.svg" alt="Sport Finder" className="h-8" />
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 flex flex-col gap-4">

        <div className="bg-gray-100 rounded-2xl px-5 py-4 text-center">
          {inst.foto_perfil && (
            <div className="flex justify-center mb-3">
              <img
                src={inst.foto_perfil}
                alt={inst.nome_fantasia}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow cursor-pointer"
                onClick={() => setFotoAberta(inst.foto_perfil)}
              />
            </div>
          )}
          <h1 className="text-base font-bold text-gray-800">{inst.nome_fantasia}</h1>
          {inst.telefone && (
            <p className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1.5">
              <Phone size={13} className="text-primary" />
              {inst.telefone}
            </p>
          )}
          {inst.endereco && (
            <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1.5">
              <MapPin size={13} className="text-primary" />
              {inst.endereco}
            </p>
          )}
          {distanciaLabel && (
            <p className="text-sm font-semibold text-primary mt-1.5">{distanciaLabel}</p>
          )}
          {inst.descricao && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">{inst.descricao}</p>
          )}
        </div>

        {(() => {
          let fotos = []
          try { fotos = inst.galeria ? JSON.parse(inst.galeria) : [] } catch {}
          const slots = [fotos[0] || null, fotos[1] || null, fotos[2] || null]
          const temFoto = slots.some(Boolean)
          if (!temFoto) return null
          return (
            <div className="flex gap-2">
              {slots.map((foto, i) => (
                <div key={i} className="flex-1 aspect-square rounded-xl overflow-hidden bg-gray-200">
                  {foto
                    ? <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setFotoAberta(foto)} />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Camera size={20} className="text-gray-400" />
                      </div>
                  }
                </div>
              ))}
            </div>
          )
        })()}

        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Modalidades</h2>

          {inst.modalidades.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma modalidade cadastrada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {inst.modalidades.map((mod) => {
                const jaAplicado = aplicados.includes(mod.id_esporte)
                const selecionado = selecionados.includes(mod.id_esporte)
                const errMsg = erros[mod.id_esporte]

                return (
                  <div key={mod.id_esporte}>
                    <button
                      onClick={() => toggleModality(mod.id_esporte)}
                      disabled={jaAplicado}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                        jaAplicado
                          ? 'bg-green-50 opacity-80'
                          : selecionado
                          ? 'bg-primary/5 border border-primary/30'
                          : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        jaAplicado
                          ? 'bg-green-500'
                          : selecionado
                          ? 'bg-primary'
                          : 'border-2 border-gray-300'
                      }`}>
                        {(jaAplicado || selecionado) && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{mod.nome}</p>
                        {mod.horarios && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock size={11} />
                            {mod.horarios}
                          </p>
                        )}
                        {jaAplicado && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">Candidatura enviada!</p>
                        )}
                      </div>
                    </button>

                    {errMsg && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1 px-1">
                        <AlertCircle size={11} />
                        {errMsg}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {inst.modalidades.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleAplicar}
              disabled={!podeCandidatar || aplicando}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm tracking-wide hover:bg-primary-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {aplicando && <Loader2 size={16} className="animate-spin" />}
              APLICAR
              {selecionados.length > 0 && !aplicando && (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selecionados.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
