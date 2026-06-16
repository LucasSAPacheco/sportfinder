# Sport Finder

Plataforma que conecta praticantes de esportes a instituições esportivas próximas. O praticante busca instituições por localização e modalidade, se candidata a uma vaga e acompanha o status. A instituição gerencia candidaturas, alunos matriculados e sua página de perfil.

## Acesso online

> **Atenção:** o servidor backend está hospedado no plano gratuito do Railway e vai sair do ar no dia 14/07/2026. Se o site não responder, siga as instruções de execução local abaixo.

| Serviço | URL |
|---|---|
| Frontend (Vercel) | https://sportfinder-lemon.vercel.app |
| Backend (Railway) | https://sportfinder-production-b75a.up.railway.app |
| Documentação da API | https://sportfinder-production-b75a.up.railway.app/docs |

### Contas de teste (senha `123`)

| Tipo | E-mail |
|---|---|
| Praticante | alice@mail.com |
| Praticante | bruno@mail.com |
| Instituição | clube@vila.com |
| Instituição | contato@academia.com |
| Instituição | judo@sp.com |

---

## Execução local

Requisitos: **Python 3.10+** e **Node.js 18+**.

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py        # cria e popula o banco (rode uma vez)
uvicorn main:app --reload
```

A API ficará disponível em `http://localhost:8000`.  
Documentação interativa: `http://localhost:8000/docs`

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie o arquivo `frontend/.env.local` com o conteúdo:

```
VITE_API_URL=http://localhost:8000
```

Depois inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O app abrirá em `http://localhost:5173`.

---

## Tecnologias

**Backend**
- Python · FastAPI · SQLModel · SQLite
- Autenticação via JWT (PyJWT) com hash bcrypt
- Distância calculada por fórmula de Haversine

**Frontend**
- React 18 · Vite · Tailwind CSS
- Leaflet (mapa interativo)
- React Router · Axios

**Deploy**
- Backend: Railway (Python/FastAPI)
- Frontend: Vercel (SPA estática)

---

## Estrutura do projeto

```
/
├── backend/
│   ├── main.py          # API e rotas
│   ├── models.py        # Tabelas (SQLModel)
│   ├── database.py      # Conexão com o banco
│   ├── security.py      # JWT + bcrypt
│   ├── utils.py         # Haversine
│   ├── seed.py          # Dados de teste
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/       # Telas (JSX)
        ├── components/  # Componentes reutilizáveis
        ├── context/     # AuthContext (JWT)
        └── api.js       # Chamadas à API
```

## Funcionalidades

- Cadastro e login separados para praticantes e instituições
- Busca de instituições por geolocalização (GPS ou endereço) e modalidade esportiva
- Mapa interativo com marcadores
- Candidatura a modalidades com acompanhamento de status
- Dashboard da instituição: aprovar/rejeitar candidaturas, gerenciar modalidades e alunos matriculados
- Perfil editável com foto para praticantes e instituições
- Galeria de fotos para instituições (até 3 fotos)
- Recuperação de senha por código
