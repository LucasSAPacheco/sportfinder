import os
from datetime import datetime, timedelta

import bcrypt
import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
EXPIRA_MINUTOS = 60 * 24


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def conferir_senha(senha: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode(), senha_hash.encode())


def criar_token(id_usuario: int, tipo: str) -> str:
    payload = {
        "sub": str(id_usuario),
        "tipo": tipo,
        "exp": datetime.utcnow() + timedelta(minutes=EXPIRA_MINUTOS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def ler_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
