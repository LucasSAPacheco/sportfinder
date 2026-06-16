import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Navigation, Search, Loader2, RefreshCw, Map, List,
} from 'lucide-react'
import { getEsportes, buscarInstituicoes, geocodificar } from '../api'
import MapaInstituicoes from '../components/MapaInstituicoes'
import StudentHeader from '../components/StudentHeader'

export default function BuscarInstituicoes() {
  const navigate = useNavigate()

  const [posicao, setPosicao] = useState(null)
  const [centroMapa, setCentroMapa] = useState(null)
  const [raio, setRaio] = useState(10)
  const [esportes, setEsportes] = useState([])
  const [selecionados, setSelecionados] = useState([])
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [enderecoInput, setEnderecoInput] = useState('')
  const [erro, setErro] = useState('')
  const [view, setView] = useState('mapa')

  useEffect(() => {
    getEsportes().then((r) => setEsportes(r.data)).catch(console.error)
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCentroMapa({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {}
    )
  }, [])

  const buscar = useCallback(
    async (pos = posicao, filtros = selecionados, raioAtual = raio) => {
      if (!pos) { setErro('Defina sua localização para buscar.'); return }
      setLoading(true)
      setErro('')
      try {
        let results
        if (filtros.length === 0) {
          const res = await buscarInstituicoes(pos.lat, pos.lon, raioAtual)
          results = res.data
        } else {
          const calls = filtros.map((id) =>
            buscarInstituicoes(pos.lat, pos.lon, raioAtual, id).then((r) => r.data)
          )
          const all = await Promise.all(calls)
          const seen = new Set()
          results = all.flat().filter((inst) => {
            if (seen.has(inst.id)) return false
            seen.add(inst.id)
            return true
          })
          results.sort((a, b) => a.distancia_km - b.distancia_km)
        }
        setResultados(results)
      } catch {
        setErro('Erro ao buscar. Verifique se a API está rodando.')
      } finally {
        setLoading(false)
      }
    },
    [posicao, selecionados, raio]
  )

  const usarGPS = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setPosicao(p)
        setGpsLoading(false)
        buscar(p, selecionados, raio)
      },
      () => {
        setErro('GPS indisponível. Tente digitar seu endereço.')
        setGpsLoading(false)
      }
    )
  }

  const buscarPorEndereco = async () => {
    if (!enderecoInput.trim()) return
    setLoading(true)
    const pos = await geocodificar(enderecoInput)
    if (pos) {
      setPosicao(pos)
      buscar(pos, selecionados, raio)
    } else {
      setErro('Endereço não encontrado. Seja mais específico.')
      setLoading(false)
    }
  }

  const handleMapClick = useCallback(
    (lat, lon) => {
      const p = { lat, lon }
      setPosicao(p)
      buscar(p, selecionados, raio)
    },
    [buscar, selecionados, raio]
  )

  const toggleEsporte = (id) =>
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <StudentHeader />

      <div className="flex sm:hidden bg-white border-b border-gray-100 shrink-0">
        <button
          onClick={() => setView('mapa')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            view === 'mapa' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
          }`}
        >
          <Map size={15} /> Mapa
        </button>
        <button
          onClick={() => setView('lista')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            view === 'lista' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
          }`}
        >
          <List size={15} /> Filtros e resultados
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            w-full sm:w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0
            ${view === 'lista' ? 'block' : 'hidden'} sm:block
          `}
        >
          <div className="p-4 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Localização
              </h3>
              <button
                onClick={usarGPS}
                disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                {gpsLoading ? 'Obtendo GPS...' : 'Usar minha localização'}
              </button>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={enderecoInput}
                  onChange={(e) => setEnderecoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPorEndereco()}
                  placeholder="Ou busque por endereço..."
                  className="input-field text-sm py-2"
                />
                <button
                  onClick={buscarPorEndereco}
                  className="bg-gray-100 hover:bg-gray-200 px-3 rounded-lg transition-colors"
                >
                  <Search size={15} />
                </button>
              </div>
              {posicao && (
                <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                  <MapPin size={11} />
                  Posição definida — clique no mapa para mudar
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Raio: <span className="text-primary normal-case">{raio} km</span>
              </h3>
              <input
                type="range"
                min={1}
                max={50}
                value={raio}
                onChange={(e) => setRaio(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                <span>1 km</span><span>50 km</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Modalidades
              </h3>
              {esportes.length === 0 ? (
                <p className="text-xs text-gray-400">Carregando...</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {esportes.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(e.id)}
                        onChange={() => toggleEsporte(e.id)}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span className="text-gray-700 truncate">{e.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => buscar()}
              disabled={loading || !posicao}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><RefreshCw size={14} className="animate-spin" /> Buscando...</>
                : <><Search size={14} /> BUSCAR</>}
            </button>

            {erro && (
              <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
            )}
          </div>

          <div className="border-t border-gray-100 p-4 flex flex-col gap-2">
            {resultados.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {resultados.length} {resultados.length === 1 ? 'instituição' : 'instituições'} encontrada{resultados.length === 1 ? '' : 's'}
              </p>
            )}
            {resultados.map((inst) => (
              <button
                key={inst.id}
                onClick={() => navigate(`/instituicao/${inst.id}`, { state: { distancia_km: inst.distancia_km } })}
                className="text-left p-3 bg-gray-50 hover:bg-green-50 rounded-xl border border-gray-200 hover:border-primary/40 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {inst.foto_perfil
                    ? <img src={inst.foto_perfil} alt="" className="w-full h-full object-cover" />
                    : <span className="text-primary font-bold text-xs">{inst.nome_fantasia?.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{inst.nome_fantasia}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={11} className="text-primary shrink-0" />
                    {inst.distancia_km} km
                    {inst.endereco ? ` • ${inst.endereco}` : ''}
                  </p>
                </div>
              </button>
            ))}
            {!loading && resultados.length === 0 && posicao && (
              <p className="text-xs text-gray-400 text-center py-4">
                Nenhuma instituição encontrada.<br />Tente aumentar o raio ou mudar os filtros.
              </p>
            )}
            {!posicao && (
              <p className="text-xs text-gray-400 text-center py-4">
                Use o GPS ou clique no mapa para buscar.
              </p>
            )}
          </div>
        </aside>

        <div
          className={`
            flex-1 relative
            ${view === 'mapa' ? 'block' : 'hidden'} sm:block
          `}
        >
          {!posicao && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 text-center shadow-xl max-w-xs">
                <Navigation size={32} className="text-primary mx-auto mb-3" />
                <p className="font-semibold text-gray-700 text-sm">
                  Clique no mapa para buscar nesse local
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Ou use o GPS / endereço no painel ao lado
                </p>
              </div>
            </div>
          )}
          <MapaInstituicoes
            posicao={posicao}
            centroMapa={centroMapa}
            raioKm={raio}
            instituicoes={resultados}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  )
}
