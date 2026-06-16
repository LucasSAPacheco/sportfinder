from datetime import datetime, date
from typing import Optional

from sqlmodel import SQLModel, Field, UniqueConstraint


class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    email: str = Field(unique=True, index=True)
    senha_hash: str
    tipo_usuario: str  # "estudante" | "instituicao"
    data_criacao: datetime = Field(default_factory=datetime.utcnow)


class Estudante(SQLModel, table=True):
    id_usuario: int = Field(foreign_key="usuario.id", primary_key=True)
    cpf: Optional[str] = Field(default=None, unique=True, index=True)
    data_nascimento: Optional[date] = None
    genero: Optional[str] = None
    foto_perfil: Optional[str] = None  # base64 data URL
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class Instituicao(SQLModel, table=True):
    id_usuario: int = Field(foreign_key="usuario.id", primary_key=True)
    cnpj: str = Field(unique=True, index=True)
    nome_fantasia: str
    endereco: Optional[str] = None
    descricao: Optional[str] = None
    telefone: Optional[str] = None
    foto_perfil: Optional[str] = None
    galeria: Optional[str] = None  # JSON list of up to 3 base64 data URLs
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class Esporte(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(unique=True)
    icone_url: Optional[str] = None


class InstituicaoEsporte(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("id_instituicao", "id_esporte"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    id_instituicao: int = Field(foreign_key="instituicao.id_usuario")
    id_esporte: int = Field(foreign_key="esporte.id")
    horarios: Optional[str] = None  # ex.: "Qui 19h00; Sáb 09h30"


class Aplicacao(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("id_estudante", "id_instituicao", "id_esporte"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    id_estudante: int = Field(foreign_key="estudante.id_usuario")
    id_instituicao: int = Field(foreign_key="instituicao.id_usuario")
    id_esporte: Optional[int] = Field(default=None, foreign_key="esporte.id")
    status: str = Field(default="pendente")
    data_aplicacao: datetime = Field(default_factory=datetime.utcnow)
