"""Teste de fumaça: roda o ciclo completo."""
import os
if os.path.exists("sportfinder.db"):
    os.remove("sportfinder.db")

import seed  # popula o banco
from fastapi.testclient import TestClient
from main import app

c = TestClient(app)

print("=== LOGIN ALICE ===")
r = c.post("/auth/login", json={"email": "alice@mail.com", "senha": "123"})
print(r.status_code, r.json()["usuario"])
token_alice = r.json()["token"]

print("\n=== ESPORTES ===")
esportes = c.get("/esportes").json()
nat = next(e["id"] for e in esportes if e["nome"] == "Natação")
print("id Natação =", nat)

print("\n=== BUSCA <5km (sem filtro) ===")
r = c.get("/instituicoes/buscar", params={"lat": -23.551, "lon": -46.634, "max_km": 5})
for i in r.json():
    print(i)

print("\n=== BUSCA <5km filtrando por Natação ===")
r = c.get("/instituicoes/buscar", params={"lat": -23.551, "lon": -46.634, "max_km": 5, "id_esporte": nat})
for i in r.json():
    print(i)

print("\n=== DETALHES Clube da Vila (id=2) ===")
print(c.get("/instituicoes/2").json())

print("\n=== ALICE APLICA p/ Natação no Clube da Vila ===")
r = c.post("/aplicacoes", json={"id_instituicao": 2, "id_esporte": nat},
           headers={"Authorization": f"Bearer {token_alice}"})
print(r.status_code, r.json())

print("\n=== APLICAR DE NOVO (deve dar 409) ===")
r = c.post("/aplicacoes", json={"id_instituicao": 2, "id_esporte": nat},
           headers={"Authorization": f"Bearer {token_alice}"})
print(r.status_code, r.json())

print("\n=== INSTITUIÇÃO VÊ CANDIDATURAS ===")
tok_inst = c.post("/auth/login", json={"email": "clube@vila.com", "senha": "123"}).json()["token"]
apps = c.get("/minhas-aplicacoes", headers={"Authorization": f"Bearer {tok_inst}"}).json()
for a in apps:
    print(a)

print("\n=== APROVAR PRIMEIRA ===")
r = c.patch(f"/aplicacoes/{apps[0]['id']}", json={"aprovar": True},
            headers={"Authorization": f"Bearer {tok_inst}"})
print(r.status_code, r.json())

print("\n=== ESTUDANTE TENTANDO APROVAR (deve dar 403) ===")
r = c.patch(f"/aplicacoes/{apps[0]['id']}", json={"aprovar": True},
            headers={"Authorization": f"Bearer {token_alice}"})
print(r.status_code, r.json())
