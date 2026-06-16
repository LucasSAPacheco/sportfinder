import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('sf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const authLogin = (email, senha) =>
  api.post('/auth/login', { email, senha })

export const authRegistrarEstudante = (dados) =>
  api.post('/auth/registrar/estudante', dados)

export const authRegistrarInstituicao = (dados) =>
  api.post('/auth/registrar/instituicao', dados)

export const getEsportes = () => api.get('/esportes')

export const buscarInstituicoes = (lat, lon, max_km = 10, id_esporte = undefined) =>
  api.get('/instituicoes/buscar', { params: { lat, lon, max_km, id_esporte } })

export const getInstituicao = (id) => api.get(`/instituicoes/${id}`)

export const aplicar = (id_instituicao, id_esporte) =>
  api.post('/aplicacoes', { id_instituicao, id_esporte })

export const getMinhasAplicacoes = () => api.get('/minhas-aplicacoes')

export const decidirAplicacao = (id, aprovar) =>
  api.patch(`/aplicacoes/${id}`, { aprovar })

export const getMeuPerfil = () => api.get('/meu-perfil')

export const atualizarMeuPerfil = (dados) => api.patch('/meu-perfil', dados)

export const getMinhasCandidaturas = () => api.get('/minhas-candidaturas')

export const getMinhaInstituicao = () => api.get('/minha-instituicao')

export const getMatriculados = () => api.get('/matriculados')

export const atualizarInstituicao = (dados) => api.patch('/minha-instituicao', dados)

export const adicionarModalidade = (id_esporte, horarios) =>
  api.post('/minha-instituicao/modalidades', { id_esporte, horarios })

export const removerModalidade = (id_esporte) =>
  api.delete(`/minha-instituicao/modalidades/${id_esporte}`)

export const esqueceuSenha = (email) =>
  api.post('/auth/esqueci-senha', { email })

export const redefinirSenha = (email, codigo, nova_senha) =>
  api.post('/auth/redefinir-senha', { email, codigo, nova_senha })

export const geocodificar = async (endereco) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco + ', Brasil')}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
  const data = await res.json()
  if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  return null
}
