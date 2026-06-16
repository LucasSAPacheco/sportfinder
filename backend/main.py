import os
from datetime import date
from secrets import token_hex
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from sqlalchemy import text
from database import criar_tabelas, get_session, engine
from models import Usuario, Estudante, Instituicao, Esporte, InstituicaoEsporte, Aplicacao
from security import gerar_hash, conferir_senha, criar_token, ler_token
from utils import haversine

app = FastAPI(title="Sport Finder API", version="0.1.0")

_tokens_reset: dict = {}

_cors = os.getenv("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors.split(",") if _cors != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    criar_tabelas()
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE instituicao ADD COLUMN galeria TEXT"))
            conn.commit()
        except Exception:
            pass


# ----------------------------------------------------------------------------
# Schemas (o que entra e sai pela API — separado das tabelas do banco)
# ----------------------------------------------------------------------------
class RegistroEstudante(BaseModel):
    nome: str
    cpf: str
    email: str
    senha: str
    data_nascimento: Optional[date] = None
    genero: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RegistroInstituicao(BaseModel):
    nome: str
    email: str
    senha: str
    cnpj: str
    nome_fantasia: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    descricao: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LoginIn(BaseModel):
    email: str
    senha: str


class AplicacaoIn(BaseModel):
    id_instituicao: int
    id_esporte: int


class DecisaoIn(BaseModel):
    aprovar: bool


class AtualizarEstudanteIn(BaseModel):
    nome: Optional[str] = None
    data_nascimento: Optional[date] = None
    genero: Optional[str] = None
    foto_perfil: Optional[str] = None


class AtualizarInstituicaoIn(BaseModel):
    nome_fantasia: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    descricao: Optional[str] = None
    foto_perfil: Optional[str] = None
    galeria: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AdicionarModalidadeIn(BaseModel):
    id_esporte: int
    horarios: Optional[str] = None


class RedefinirSenhaIn(BaseModel):
    email: str
    codigo: str
    nova_senha: str


# ----------------------------------------------------------------------------
# Autenticação: lê o token do header "Authorization: Bearer <token>"
# ----------------------------------------------------------------------------
def usuario_atual(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token ausente ou mal formatado")
    try:
        dados = ler_token(authorization.removeprefix("Bearer "))
    except Exception:
        raise HTTPException(401, "Token inválido ou expirado")
    return {"id": int(dados["sub"]), "tipo": dados["tipo"]}


def exigir_tipo(tipo_esperado: str):
    def _checar(user: dict = Depends(usuario_atual)) -> dict:
        if user["tipo"] != tipo_esperado:
            raise HTTPException(403, f"Apenas usuários do tipo '{tipo_esperado}' podem fazer isso")
        return user
    return _checar


# ----------------------------------------------------------------------------
# Cadastro e login
# ----------------------------------------------------------------------------
@app.post("/auth/registrar/estudante", status_code=201)
def registrar_estudante(dados: RegistroEstudante, s: Session = Depends(get_session)):
    if s.exec(select(Usuario).where(Usuario.email == dados.email)).first():
        raise HTTPException(409, "E-mail já cadastrado")
    if s.exec(select(Estudante).where(Estudante.cpf == dados.cpf)).first():
        raise HTTPException(409, "CPF já cadastrado")
    u = Usuario(nome=dados.nome, email=dados.email,
                senha_hash=gerar_hash(dados.senha), tipo_usuario="estudante")
    s.add(u); s.commit(); s.refresh(u)
    s.add(Estudante(id_usuario=u.id, cpf=dados.cpf, data_nascimento=dados.data_nascimento,
                    genero=dados.genero, latitude=dados.latitude, longitude=dados.longitude))
    s.commit()
    return {"id": u.id, "nome": u.nome, "tipo": u.tipo_usuario}


@app.post("/auth/registrar/instituicao", status_code=201)
def registrar_instituicao(dados: RegistroInstituicao, s: Session = Depends(get_session)):
    if s.exec(select(Usuario).where(Usuario.email == dados.email)).first():
        raise HTTPException(409, "E-mail já cadastrado")
    u = Usuario(nome=dados.nome, email=dados.email,
                senha_hash=gerar_hash(dados.senha), tipo_usuario="instituicao")
    s.add(u); s.commit(); s.refresh(u)
    s.add(Instituicao(id_usuario=u.id, cnpj=dados.cnpj, nome_fantasia=dados.nome_fantasia,
                      telefone=dados.telefone, endereco=dados.endereco, descricao=dados.descricao,
                      latitude=dados.latitude, longitude=dados.longitude))
    s.commit()
    return {"id": u.id, "nome": u.nome, "tipo": u.tipo_usuario}


@app.post("/auth/login")
def login(dados: LoginIn, s: Session = Depends(get_session)):
    u = s.exec(select(Usuario).where(Usuario.email == dados.email)).first()
    if not u or not conferir_senha(dados.senha, u.senha_hash):
        raise HTTPException(401, "E-mail ou senha inválidos")
    return {"token": criar_token(u.id, u.tipo_usuario),
            "usuario": {"id": u.id, "nome": u.nome, "tipo": u.tipo_usuario}}


# ----------------------------------------------------------------------------
# Esportes (catálogo)
# ----------------------------------------------------------------------------
@app.get("/esportes")
def listar_esportes(s: Session = Depends(get_session)):
    return s.exec(select(Esporte)).all()


# ----------------------------------------------------------------------------
# Busca de instituições por proximidade (+ filtro opcional por esporte)
# ----------------------------------------------------------------------------
@app.get("/instituicoes/buscar")
def buscar_instituicoes(
    lat: float = Query(..., description="Latitude do usuário"),
    lon: float = Query(..., description="Longitude do usuário"),
    id_esporte: Optional[int] = Query(None, description="Filtrar por modalidade"),
    max_km: float = Query(10, description="Raio máximo em km"),
    s: Session = Depends(get_session),
):
    resultados = []
    for inst in s.exec(select(Instituicao)).all():
        if inst.latitude is None or inst.longitude is None:
            continue
        dist = haversine(lat, lon, inst.latitude, inst.longitude)
        if dist > max_km:
            continue
        if id_esporte is not None:
            tem = s.exec(select(InstituicaoEsporte).where(
                InstituicaoEsporte.id_instituicao == inst.id_usuario,
                InstituicaoEsporte.id_esporte == id_esporte)).first()
            if not tem:
                continue
        resultados.append({
            "id": inst.id_usuario, "nome_fantasia": inst.nome_fantasia,
            "foto_perfil": inst.foto_perfil,
            "endereco": inst.endereco, "distancia_km": round(dist, 2),
            "latitude": inst.latitude, "longitude": inst.longitude,
        })
    resultados.sort(key=lambda r: r["distancia_km"])
    return resultados


@app.get("/instituicoes/{id_instituicao}")
def detalhes_instituicao(id_instituicao: int, s: Session = Depends(get_session)):
    inst = s.get(Instituicao, id_instituicao)
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    modalidades = []
    for ie in s.exec(select(InstituicaoEsporte).where(
            InstituicaoEsporte.id_instituicao == id_instituicao)).all():
        esp = s.get(Esporte, ie.id_esporte)
        modalidades.append({"id_esporte": ie.id_esporte,
                            "nome": esp.nome if esp else None,
                            "horarios": ie.horarios})
    return {
        "id": inst.id_usuario, "nome_fantasia": inst.nome_fantasia,
        "telefone": inst.telefone, "endereco": inst.endereco, "descricao": inst.descricao,
        "foto_perfil": inst.foto_perfil, "galeria": inst.galeria,
        "latitude": inst.latitude, "longitude": inst.longitude,
        "modalidades": modalidades,
    }


# ----------------------------------------------------------------------------
# Candidaturas
# ----------------------------------------------------------------------------
@app.post("/aplicacoes", status_code=201)
def aplicar(dados: AplicacaoIn, user: dict = Depends(exigir_tipo("estudante")),
            s: Session = Depends(get_session)):
    ja = s.exec(select(Aplicacao).where(
        Aplicacao.id_estudante == user["id"],
        Aplicacao.id_instituicao == dados.id_instituicao,
        Aplicacao.id_esporte == dados.id_esporte)).first()
    if ja:
        raise HTTPException(409, "Você já se candidatou a essa modalidade")
    ap = Aplicacao(id_estudante=user["id"], id_instituicao=dados.id_instituicao,
                   id_esporte=dados.id_esporte)
    s.add(ap); s.commit(); s.refresh(ap)
    return {"id": ap.id, "status": ap.status}


@app.get("/minhas-aplicacoes")
def aplicacoes_da_instituicao(user: dict = Depends(exigir_tipo("instituicao")),
                              s: Session = Depends(get_session)):
    """Instituição vê as candidaturas que recebeu (com nome do aluno e modalidade)."""
    saida = []
    for ap in s.exec(select(Aplicacao).where(Aplicacao.id_instituicao == user["id"])).all():
        aluno = s.get(Usuario, ap.id_estudante)
        est = s.get(Estudante, ap.id_estudante)
        esp = s.get(Esporte, ap.id_esporte) if ap.id_esporte else None
        saida.append({
            "id": ap.id, "aluno": aluno.nome if aluno else None,
            "foto_perfil": est.foto_perfil if est else None,
            "modalidade": esp.nome if esp else None,
            "status": ap.status, "data": ap.data_aplicacao,
        })
    return saida


@app.patch("/aplicacoes/{id_aplicacao}")
def decidir(id_aplicacao: int, decisao: DecisaoIn,
            user: dict = Depends(exigir_tipo("instituicao")),
            s: Session = Depends(get_session)):
    ap = s.get(Aplicacao, id_aplicacao)
    if not ap:
        raise HTTPException(404, "Candidatura não encontrada")
    if ap.id_instituicao != user["id"]:
        raise HTTPException(403, "Essa candidatura não é da sua instituição")
    ap.status = "aprovado" if decisao.aprovar else "rejeitado"
    s.add(ap); s.commit(); s.refresh(ap)
    return {"id": ap.id, "status": ap.status}


# ----------------------------------------------------------------------------
# Gestão da própria instituição
# ----------------------------------------------------------------------------
@app.get("/minha-instituicao")
def minha_instituicao(user: dict = Depends(exigir_tipo("instituicao")),
                      s: Session = Depends(get_session)):
    inst = s.get(Instituicao, user["id"])
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    u = s.get(Usuario, user["id"])
    modalidades = []
    for ie in s.exec(select(InstituicaoEsporte).where(
            InstituicaoEsporte.id_instituicao == user["id"])).all():
        esp = s.get(Esporte, ie.id_esporte)
        num_inscritos = len(s.exec(select(Aplicacao).where(
            Aplicacao.id_instituicao == user["id"],
            Aplicacao.id_esporte == ie.id_esporte,
            Aplicacao.status == "aprovado")).all())
        modalidades.append({"id": ie.id, "id_esporte": ie.id_esporte,
                            "nome": esp.nome if esp else None,
                            "horarios": ie.horarios,
                            "num_inscritos": num_inscritos})
    return {"id": inst.id_usuario, "nome": u.nome if u else None,
            "cnpj": inst.cnpj, "nome_fantasia": inst.nome_fantasia,
            "telefone": inst.telefone, "endereco": inst.endereco, "descricao": inst.descricao,
            "foto_perfil": inst.foto_perfil, "galeria": inst.galeria,
            "modalidades": modalidades}


@app.patch("/minha-instituicao")
def atualizar_instituicao(dados: AtualizarInstituicaoIn,
                          user: dict = Depends(exigir_tipo("instituicao")),
                          s: Session = Depends(get_session)):
    inst = s.get(Instituicao, user["id"])
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    for campo, val in dados.model_dump(exclude_unset=True).items():
        setattr(inst, campo, val)
    s.add(inst); s.commit(); s.refresh(inst)
    return {"nome_fantasia": inst.nome_fantasia,
            "telefone": inst.telefone,
            "endereco": inst.endereco, "descricao": inst.descricao,
            "foto_perfil": inst.foto_perfil, "galeria": inst.galeria}


@app.get("/matriculados")
def matriculados(user: dict = Depends(exigir_tipo("instituicao")),
                 s: Session = Depends(get_session)):
    saida = []
    for ap in s.exec(select(Aplicacao).where(
            Aplicacao.id_instituicao == user["id"],
            Aplicacao.status == "aprovado")).all():
        aluno_u = s.get(Usuario, ap.id_estudante)
        esp = s.get(Esporte, ap.id_esporte) if ap.id_esporte else None
        est = s.get(Estudante, ap.id_estudante)
        saida.append({
            "id": ap.id,
            "id_estudante": ap.id_estudante,
            "aluno": aluno_u.nome if aluno_u else None,
            "foto_perfil": est.foto_perfil if est else None,
            "cpf": est.cpf if est else None,
            "id_esporte": ap.id_esporte,
            "modalidade": esp.nome if esp else None,
            "data_matricula": ap.data_aplicacao,
        })
    return saida


@app.post("/minha-instituicao/modalidades", status_code=201)
def adicionar_modalidade(dados: AdicionarModalidadeIn,
                         user: dict = Depends(exigir_tipo("instituicao")),
                         s: Session = Depends(get_session)):
    existe = s.exec(select(InstituicaoEsporte).where(
        InstituicaoEsporte.id_instituicao == user["id"],
        InstituicaoEsporte.id_esporte == dados.id_esporte)).first()
    if existe:
        raise HTTPException(409, "Modalidade já cadastrada para esta instituição")
    ie = InstituicaoEsporte(id_instituicao=user["id"],
                            id_esporte=dados.id_esporte, horarios=dados.horarios)
    s.add(ie); s.commit(); s.refresh(ie)
    esp = s.get(Esporte, ie.id_esporte)
    return {"id": ie.id, "id_esporte": ie.id_esporte,
            "nome": esp.nome if esp else None, "horarios": ie.horarios}


@app.delete("/minha-instituicao/modalidades/{id_esporte}", status_code=204)
def remover_modalidade(id_esporte: int,
                       user: dict = Depends(exigir_tipo("instituicao")),
                       s: Session = Depends(get_session)):
    ie = s.exec(select(InstituicaoEsporte).where(
        InstituicaoEsporte.id_instituicao == user["id"],
        InstituicaoEsporte.id_esporte == id_esporte)).first()
    if not ie:
        raise HTTPException(404, "Modalidade não encontrada nesta instituição")
    s.delete(ie); s.commit()


# ----------------------------------------------------------------------------
# Recuperar senha (demo: código retornado diretamente; em produção: e-mail)
# ----------------------------------------------------------------------------
@app.post("/auth/esqueci-senha")
def esqueci_senha(email: str = Body(..., embed=True),
                  s: Session = Depends(get_session)):
    u = s.exec(select(Usuario).where(Usuario.email == email)).first()
    if not u:
        return {"mensagem": "Se o e-mail estiver cadastrado, um código foi gerado."}
    codigo = token_hex(3).upper()  # 6 caracteres hex — ex.: "A3F9C2"
    _tokens_reset[email] = codigo
    return {"mensagem": "Código gerado.", "codigo": codigo}


# ----------------------------------------------------------------------------
# Painel do estudante
# ----------------------------------------------------------------------------
@app.get("/meu-perfil")
def meu_perfil(user: dict = Depends(exigir_tipo("estudante")),
               s: Session = Depends(get_session)):
    u = s.get(Usuario, user["id"])
    est = s.get(Estudante, user["id"])
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    return {
        "id": u.id, "nome": u.nome, "email": u.email,
        "cpf": est.cpf if est else None,
        "data_nascimento": est.data_nascimento if est else None,
        "genero": est.genero if est else None,
        "foto_perfil": est.foto_perfil if est else None,
    }


@app.patch("/meu-perfil")
def atualizar_perfil(dados: AtualizarEstudanteIn,
                     user: dict = Depends(exigir_tipo("estudante")),
                     s: Session = Depends(get_session)):
    u = s.get(Usuario, user["id"])
    est = s.get(Estudante, user["id"])
    if not u or not est:
        raise HTTPException(404, "Usuário não encontrado")
    if dados.nome is not None:
        u.nome = dados.nome
    if dados.data_nascimento is not None:
        est.data_nascimento = dados.data_nascimento
    if dados.genero is not None:
        est.genero = dados.genero
    if 'foto_perfil' in dados.model_fields_set:
        est.foto_perfil = dados.foto_perfil
    s.add(u); s.add(est); s.commit()
    return {
        "id": u.id, "nome": u.nome, "email": u.email,
        "data_nascimento": est.data_nascimento,
        "genero": est.genero,
        "foto_perfil": est.foto_perfil,
    }


@app.get("/minhas-candidaturas")
def minhas_candidaturas(user: dict = Depends(exigir_tipo("estudante")),
                        s: Session = Depends(get_session)):
    saida = []
    for ap in s.exec(select(Aplicacao).where(Aplicacao.id_estudante == user["id"])).all():
        inst = s.get(Instituicao, ap.id_instituicao)
        u_inst = s.get(Usuario, ap.id_instituicao) if inst else None
        esp = s.get(Esporte, ap.id_esporte) if ap.id_esporte else None
        saida.append({
            "id": ap.id,
            "id_instituicao": ap.id_instituicao,
            "nome_fantasia": inst.nome_fantasia if inst else None,
            "instituicao": u_inst.nome if u_inst else None,
            "modalidade": esp.nome if esp else None,
            "status": ap.status,
            "data": ap.data_aplicacao,
        })
    return saida


@app.post("/auth/redefinir-senha")
def redefinir_senha(dados: RedefinirSenhaIn, s: Session = Depends(get_session)):
    if _tokens_reset.get(dados.email) != dados.codigo.upper():
        raise HTTPException(400, "Código inválido ou expirado")
    u = s.exec(select(Usuario).where(Usuario.email == dados.email)).first()
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    u.senha_hash = gerar_hash(dados.nova_senha)
    s.add(u); s.commit()
    del _tokens_reset[dados.email]
    return {"mensagem": "Senha redefinida com sucesso."}
