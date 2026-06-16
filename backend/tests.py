"""
Testes completos do Sport Finder API.

Execute com:   pytest tests.py -v
Requer:        pip install pytest httpx

Cobre:
  - Auth:         registro estudante/instituição, login, token inválido/ausente
  - Esportes:     listagem (com e sem dados)
  - Instituições: busca por proximidade, filtro por esporte, ordenação, detalhes, 404
  - Aplicações:   criar, duplicata 409, permissões 403, listar, aprovar, rejeitar,
                  candidatura inexistente 404, instituição não decide candidatura alheia
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session, select
from sqlmodel.pool import StaticPool

# ---------------------------------------------------------------------------
# Redireciona o engine para banco em memória ANTES de importar main/app
# ---------------------------------------------------------------------------
import database as _db

_test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_db.engine = _test_engine

from main import app  # noqa: E402 — importado após patch do engine
from database import get_session
from models import Esporte, InstituicaoEsporte


def _get_test_session():
    with Session(_test_engine) as s:
        yield s


app.dependency_overrides[get_session] = _get_test_session


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_db():
    """Recria todas as tabelas antes de cada teste e derruba depois."""
    SQLModel.metadata.create_all(_test_engine)
    yield
    SQLModel.metadata.drop_all(_test_engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def esportes(client):
    """Insere Futebol, Natação e Judô no banco; devolve {nome: id}."""
    with Session(_test_engine) as s:
        nomes = ["Futebol", "Natação", "Judô"]
        objs = {n: Esporte(nome=n) for n in nomes}
        for e in objs.values():
            s.add(e)
        s.commit()
        for e in objs.values():
            s.refresh(e)
        return {n: e.id for n, e in objs.items()}


@pytest.fixture
def token_estudante(client, esportes):
    """Registra Alice e devolve seu JWT."""
    client.post("/auth/registrar/estudante", json={
        "nome": "Alice Teste", "email": "alice@test.com", "senha": "senha123",
        "cpf": "111.222.333-00",
        "latitude": -23.551, "longitude": -46.634,
    })
    return client.post("/auth/login", json={
        "email": "alice@test.com", "senha": "senha123",
    }).json()["token"]


@pytest.fixture
def token_e_id_instituicao(client, esportes):
    """Registra Clube Teste com Natação e devolve (token, id)."""
    r = client.post("/auth/registrar/instituicao", json={
        "nome": "Clube Teste", "email": "clube@test.com", "senha": "senha123",
        "cnpj": "11.111.111/0001-11", "nome_fantasia": "Clube Teste",
        "latitude": -23.552, "longitude": -46.635,
    })
    inst_id = r.json()["id"]
    with Session(_test_engine) as s:
        s.add(InstituicaoEsporte(
            id_instituicao=inst_id,
            id_esporte=esportes["Natação"],
            horarios="Seg 18h",
        ))
        s.commit()
    token = client.post("/auth/login", json={
        "email": "clube@test.com", "senha": "senha123",
    }).json()["token"]
    return token, inst_id


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _aplicar(client, token_estudante, inst_id, esporte_id):
    return client.post(
        "/aplicacoes",
        json={"id_instituicao": inst_id, "id_esporte": esporte_id},
        headers=_auth(token_estudante),
    )


def _minhas_aplicacoes(client, token_inst):
    return client.get("/minhas-aplicacoes", headers=_auth(token_inst)).json()


# ===========================================================================
# AUTH — Registro de Estudante
# ===========================================================================

class TestRegistroEstudante:
    def test_registra_com_sucesso(self, client):
        r = client.post("/auth/registrar/estudante", json={
            "nome": "João", "email": "joao@test.com", "senha": "abc123", "cpf": "100.000.000-00",
        })
        assert r.status_code == 201
        assert r.json()["tipo"] == "estudante"
        assert "id" in r.json()

    def test_retorna_nome_e_id(self, client):
        r = client.post("/auth/registrar/estudante", json={
            "nome": "Maria", "email": "maria@test.com", "senha": "x", "cpf": "200.000.000-00",
        })
        assert r.json()["nome"] == "Maria"

    def test_email_duplicado_retorna_409(self, client):
        payload = {"nome": "X", "email": "dup@test.com", "senha": "123", "cpf": "300.000.000-00"}
        client.post("/auth/registrar/estudante", json=payload)
        r = client.post("/auth/registrar/estudante", json=payload)
        assert r.status_code == 409

    def test_campos_obrigatorios_retorna_422(self, client):
        r = client.post("/auth/registrar/estudante", json={"email": "x@test.com"})
        assert r.status_code == 422

    def test_campos_opcionais_aceitos(self, client):
        r = client.post("/auth/registrar/estudante", json={
            "nome": "Z", "email": "z@test.com", "senha": "z", "cpf": "400.000.000-00",
            "data_nascimento": "2000-01-01", "genero": "Feminino",
            "latitude": -23.5, "longitude": -46.6,
        })
        assert r.status_code == 201


# ===========================================================================
# AUTH — Registro de Instituição
# ===========================================================================

class TestRegistroInstituicao:
    def test_registra_com_sucesso(self, client):
        r = client.post("/auth/registrar/instituicao", json={
            "nome": "Inst", "email": "inst@test.com", "senha": "abc",
            "cnpj": "00.000.000/0001-00", "nome_fantasia": "Inst Teste",
        })
        assert r.status_code == 201
        assert r.json()["tipo"] == "instituicao"

    def test_email_duplicado_retorna_409(self, client):
        payload = {
            "nome": "I", "email": "i@test.com", "senha": "x",
            "cnpj": "11.111.111/0001-11", "nome_fantasia": "I",
        }
        client.post("/auth/registrar/instituicao", json=payload)
        r = client.post("/auth/registrar/instituicao", json=payload)
        assert r.status_code == 409

    def test_campos_obrigatorios_retorna_422(self, client):
        r = client.post("/auth/registrar/instituicao", json={"email": "i@test.com"})
        assert r.status_code == 422


# ===========================================================================
# AUTH — Login
# ===========================================================================

class TestLogin:
    def test_login_valido_retorna_token(self, client, token_estudante):
        assert len(token_estudante) > 20

    def test_login_retorna_dados_usuario(self, client, esportes):
        client.post("/auth/registrar/estudante", json={
            "nome": "Bob", "email": "bob@test.com", "senha": "pass", "cpf": "500.000.000-00",
        })
        r = client.post("/auth/login", json={"email": "bob@test.com", "senha": "pass"})
        assert r.json()["usuario"]["nome"] == "Bob"
        assert r.json()["usuario"]["tipo"] == "estudante"

    def test_senha_errada_retorna_401(self, client, esportes):
        client.post("/auth/registrar/estudante", json={
            "nome": "X", "email": "x@test.com", "senha": "certa", "cpf": "600.000.000-00",
        })
        r = client.post("/auth/login", json={"email": "x@test.com", "senha": "errada"})
        assert r.status_code == 401

    def test_email_inexistente_retorna_401(self, client):
        r = client.post("/auth/login", json={"email": "nobody@test.com", "senha": "123"})
        assert r.status_code == 401

    def test_token_invalido_retorna_401(self, client):
        r = client.get("/minhas-aplicacoes", headers=_auth("token_invalido"))
        assert r.status_code == 401

    def test_header_malformado_retorna_401(self, client):
        r = client.get("/minhas-aplicacoes", headers={"Authorization": "SemBearer abc"})
        assert r.status_code == 401


# ===========================================================================
# Esportes
# ===========================================================================

class TestEsportes:
    def test_lista_esportes_populados(self, client, esportes):
        r = client.get("/esportes")
        assert r.status_code == 200
        nomes = [e["nome"] for e in r.json()]
        assert "Futebol" in nomes
        assert "Natação" in nomes
        assert "Judô" in nomes

    def test_lista_vazia_sem_seed(self, client):
        r = client.get("/esportes")
        assert r.status_code == 200
        assert r.json() == []

    def test_esporte_tem_campos_esperados(self, client, esportes):
        r = client.get("/esportes")
        item = r.json()[0]
        assert "id" in item
        assert "nome" in item


# ===========================================================================
# Instituições — Busca
# ===========================================================================

class TestBuscaInstituicoes:
    def test_encontra_instituicao_no_raio(self, client, token_e_id_instituicao, esportes):
        r = client.get("/instituicoes/buscar", params={
            "lat": -23.551, "lon": -46.634, "max_km": 5,
        })
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_nao_encontra_fora_do_raio(self, client, token_e_id_instituicao, esportes):
        r = client.get("/instituicoes/buscar", params={
            "lat": -20.0, "lon": -43.0, "max_km": 1,
        })
        assert r.status_code == 200
        assert r.json() == []

    def test_busca_com_filtro_esporte_existente(self, client, token_e_id_instituicao, esportes):
        r = client.get("/instituicoes/buscar", params={
            "lat": -23.551, "lon": -46.634, "max_km": 5,
            "id_esporte": esportes["Natação"],
        })
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_busca_com_filtro_esporte_nao_ofertado(self, client, token_e_id_instituicao, esportes):
        r = client.get("/instituicoes/buscar", params={
            "lat": -23.551, "lon": -46.634, "max_km": 5,
            "id_esporte": esportes["Judô"],
        })
        assert r.status_code == 200
        assert r.json() == []

    def test_busca_filtro_id_esporte_inexistente(self, client, token_e_id_instituicao, esportes):
        r = client.get("/instituicoes/buscar", params={
            "lat": -23.551, "lon": -46.634, "max_km": 5, "id_esporte": 9999,
        })
        assert r.status_code == 200
        assert r.json() == []

    def test_resultado_tem_distancia_km(self, client, token_e_id_instituicao, esportes):
        r = client.get("/instituicoes/buscar", params={
            "lat": -23.551, "lon": -46.634, "max_km": 5,
        })
        assert "distancia_km" in r.json()[0]

    def test_resultado_ordenado_por_distancia(self, client, esportes):
        for i, (lat, lon, cnpj, email) in enumerate([
            (-23.560, -46.640, "11.111.111/0001-11", "longe@test.com"),
            (-23.552, -46.635, "22.222.222/0001-22", "perto@test.com"),
        ]):
            client.post("/auth/registrar/instituicao", json={
                "nome": f"Inst{i}", "email": email, "senha": "x",
                "cnpj": cnpj, "nome_fantasia": f"Inst{i}",
                "latitude": lat, "longitude": lon,
            })
        r = client.get("/instituicoes/buscar", params={
            "lat": -23.551, "lon": -46.634, "max_km": 20,
        })
        dists = [i["distancia_km"] for i in r.json()]
        assert dists == sorted(dists)

    def test_lat_lon_obrigatorios(self, client):
        r = client.get("/instituicoes/buscar")
        assert r.status_code == 422


# ===========================================================================
# Instituições — Detalhes
# ===========================================================================

class TestDetalhesInstituicao:
    def test_detalhes_retorna_modalidades(self, client, token_e_id_instituicao, esportes):
        _, inst_id = token_e_id_instituicao
        r = client.get(f"/instituicoes/{inst_id}")
        assert r.status_code == 200
        data = r.json()
        assert "modalidades" in data
        assert len(data["modalidades"]) == 1
        assert data["modalidades"][0]["nome"] == "Natação"

    def test_detalhes_campos_esperados(self, client, token_e_id_instituicao, esportes):
        _, inst_id = token_e_id_instituicao
        r = client.get(f"/instituicoes/{inst_id}")
        data = r.json()
        for campo in ("id", "nome_fantasia", "endereco", "descricao", "latitude", "longitude"):
            assert campo in data

    def test_id_inexistente_retorna_404(self, client):
        r = client.get("/instituicoes/9999")
        assert r.status_code == 404


# ===========================================================================
# Aplicações — Criar
# ===========================================================================

class TestCriarAplicacao:
    def test_estudante_aplica_com_sucesso(self, client, token_estudante, token_e_id_instituicao, esportes):
        tok_inst, inst_id = token_e_id_instituicao
        r = _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        assert r.status_code == 201
        assert r.json()["status"] == "pendente"
        assert "id" in r.json()

    def test_aplicacao_duplicada_retorna_409(self, client, token_estudante, token_e_id_instituicao, esportes):
        _, inst_id = token_e_id_instituicao
        _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        r = _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        assert r.status_code == 409

    def test_instituicao_nao_pode_aplicar(self, client, token_e_id_instituicao, esportes):
        tok_inst, inst_id = token_e_id_instituicao
        r = client.post(
            "/aplicacoes",
            json={"id_instituicao": inst_id, "id_esporte": esportes["Natação"]},
            headers=_auth(tok_inst),
        )
        assert r.status_code == 403

    def test_sem_token_retorna_422(self, client):
        r = client.post("/aplicacoes", json={"id_instituicao": 1, "id_esporte": 1})
        assert r.status_code == 422

    def test_token_invalido_retorna_401(self, client):
        r = client.post(
            "/aplicacoes",
            json={"id_instituicao": 1, "id_esporte": 1},
            headers=_auth("invalido"),
        )
        assert r.status_code == 401


# ===========================================================================
# Aplicações — Listar (instituição)
# ===========================================================================

class TestListarAplicacoes:
    def test_instituicao_ve_candidaturas_recebidas(self, client, token_estudante, token_e_id_instituicao, esportes):
        tok_inst, inst_id = token_e_id_instituicao
        _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        apps = _minhas_aplicacoes(client, tok_inst)
        assert len(apps) == 1
        assert apps[0]["aluno"] == "Alice Teste"
        assert apps[0]["modalidade"] == "Natação"

    def test_estudante_nao_ve_candidaturas_da_instituicao(self, client, token_estudante, esportes):
        r = client.get("/minhas-aplicacoes", headers=_auth(token_estudante))
        assert r.status_code == 403

    def test_lista_vazia_sem_candidaturas(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        apps = _minhas_aplicacoes(client, tok_inst)
        assert apps == []


# ===========================================================================
# Aplicações — Decidir (aprovar / rejeitar)
# ===========================================================================

class TestDecidirAplicacao:
    def _criar_candidatura(self, client, token_estudante, token_e_id_instituicao, esportes):
        tok_inst, inst_id = token_e_id_instituicao
        _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        return _minhas_aplicacoes(client, tok_inst)[0]["id"], tok_inst

    def test_instituicao_aprova(self, client, token_estudante, token_e_id_instituicao, esportes):
        ap_id, tok_inst = self._criar_candidatura(client, token_estudante, token_e_id_instituicao, esportes)
        r = client.patch(f"/aplicacoes/{ap_id}", json={"aprovar": True}, headers=_auth(tok_inst))
        assert r.status_code == 200
        assert r.json()["status"] == "aprovado"

    def test_instituicao_rejeita(self, client, token_estudante, token_e_id_instituicao, esportes):
        ap_id, tok_inst = self._criar_candidatura(client, token_estudante, token_e_id_instituicao, esportes)
        r = client.patch(f"/aplicacoes/{ap_id}", json={"aprovar": False}, headers=_auth(tok_inst))
        assert r.status_code == 200
        assert r.json()["status"] == "rejeitado"

    def test_estudante_nao_pode_decidir(self, client, token_estudante, token_e_id_instituicao, esportes):
        ap_id, _ = self._criar_candidatura(client, token_estudante, token_e_id_instituicao, esportes)
        r = client.patch(f"/aplicacoes/{ap_id}", json={"aprovar": True}, headers=_auth(token_estudante))
        assert r.status_code == 403

    def test_candidatura_inexistente_retorna_404(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.patch("/aplicacoes/9999", json={"aprovar": True}, headers=_auth(tok_inst))
        assert r.status_code == 404

    def test_instituicao_nao_decide_candidatura_alheia(self, client, token_estudante, token_e_id_instituicao, esportes):
        ap_id, _ = self._criar_candidatura(client, token_estudante, token_e_id_instituicao, esportes)

        # Segunda instituição sem vínculo com essa candidatura
        client.post("/auth/registrar/instituicao", json={
            "nome": "Outra", "email": "outra@test.com", "senha": "x",
            "cnpj": "99.999.999/0001-99", "nome_fantasia": "Outra",
        })
        tok_outra = client.post("/auth/login", json={
            "email": "outra@test.com", "senha": "x",
        }).json()["token"]

        r = client.patch(f"/aplicacoes/{ap_id}", json={"aprovar": True}, headers=_auth(tok_outra))
        assert r.status_code == 403

    def test_sem_token_retorna_422(self, client):
        r = client.patch("/aplicacoes/1", json={"aprovar": True})
        assert r.status_code == 422


# ===========================================================================
# Gestão da própria instituição
# ===========================================================================

class TestMinhaInstituicao:
    def test_get_minha_instituicao(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.get("/minha-instituicao", headers=_auth(tok_inst))
        assert r.status_code == 200
        assert "modalidades" in r.json()
        assert "cnpj" in r.json()

    def test_estudante_nao_acessa_minha_instituicao(self, client, token_estudante, esportes):
        r = client.get("/minha-instituicao", headers=_auth(token_estudante))
        assert r.status_code == 403

    def test_atualizar_descricao(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.patch("/minha-instituicao",
                         json={"descricao": "Nova descrição top"},
                         headers=_auth(tok_inst))
        assert r.status_code == 200
        assert r.json()["descricao"] == "Nova descrição top"

    def test_atualizar_nome_fantasia(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.patch("/minha-instituicao",
                         json={"nome_fantasia": "Clube Atualizado"},
                         headers=_auth(tok_inst))
        assert r.status_code == 200
        assert r.json()["nome_fantasia"] == "Clube Atualizado"

    def test_adicionar_modalidade(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.post("/minha-instituicao/modalidades",
                        json={"id_esporte": esportes["Futebol"], "horarios": "Ter 19h"},
                        headers=_auth(tok_inst))
        assert r.status_code == 201
        assert r.json()["nome"] == "Futebol"

    def test_adicionar_modalidade_sem_horario(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.post("/minha-instituicao/modalidades",
                        json={"id_esporte": esportes["Judô"]},
                        headers=_auth(tok_inst))
        assert r.status_code == 201

    def test_adicionar_modalidade_duplicada_retorna_409(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.post("/minha-instituicao/modalidades",
                        json={"id_esporte": esportes["Natação"]},
                        headers=_auth(tok_inst))
        assert r.status_code == 409

    def test_remover_modalidade(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.delete(f"/minha-instituicao/modalidades/{esportes['Natação']}",
                          headers=_auth(tok_inst))
        assert r.status_code == 204

    def test_remover_modalidade_inexistente_retorna_404(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.delete("/minha-instituicao/modalidades/9999",
                          headers=_auth(tok_inst))
        assert r.status_code == 404

    def test_estudante_nao_adiciona_modalidade(self, client, token_estudante, esportes):
        r = client.post("/minha-instituicao/modalidades",
                        json={"id_esporte": esportes["Futebol"]},
                        headers=_auth(token_estudante))
        assert r.status_code == 403


# ===========================================================================
# Recuperar senha
# ===========================================================================

class TestRecuperarSenha:
    def test_solicitar_codigo_email_existente(self, client, esportes):
        client.post("/auth/registrar/estudante",
                    json={"nome": "Reset", "email": "reset@test.com", "senha": "velha123", "cpf": "700.000.000-00"})
        r = client.post("/auth/esqueci-senha", json={"email": "reset@test.com"})
        assert r.status_code == 200
        assert "codigo" in r.json()

    def test_solicitar_codigo_email_inexistente_nao_revela(self, client):
        r = client.post("/auth/esqueci-senha", json={"email": "naoexiste@test.com"})
        assert r.status_code == 200
        assert "codigo" not in r.json()

    def test_fluxo_completo_redefinir_senha(self, client, esportes):
        client.post("/auth/registrar/estudante",
                    json={"nome": "Fluxo", "email": "fluxo@test.com", "senha": "senhavelha", "cpf": "800.000.000-00"})
        r = client.post("/auth/esqueci-senha", json={"email": "fluxo@test.com"})
        codigo = r.json()["codigo"]

        r2 = client.post("/auth/redefinir-senha",
                         json={"email": "fluxo@test.com",
                               "codigo": codigo, "nova_senha": "senhanova123"})
        assert r2.status_code == 200

        r3 = client.post("/auth/login",
                         json={"email": "fluxo@test.com", "senha": "senhanova123"})
        assert r3.status_code == 200
        assert "token" in r3.json()

    def test_codigo_invalido_retorna_400(self, client, esportes):
        client.post("/auth/registrar/estudante",
                    json={"nome": "X", "email": "x3@test.com", "senha": "senha", "cpf": "900.000.000-00"})
        client.post("/auth/esqueci-senha", json={"email": "x3@test.com"})
        r = client.post("/auth/redefinir-senha",
                        json={"email": "x3@test.com",
                              "codigo": "ERRADO", "nova_senha": "nova"})
        assert r.status_code == 400

    def test_codigo_nao_pode_ser_reutilizado(self, client, esportes):
        client.post("/auth/registrar/estudante",
                    json={"nome": "Re2", "email": "re2@test.com", "senha": "senha", "cpf": "111.100.000-00"})
        r = client.post("/auth/esqueci-senha", json={"email": "re2@test.com"})
        codigo = r.json()["codigo"]
        client.post("/auth/redefinir-senha",
                    json={"email": "re2@test.com", "codigo": codigo, "nova_senha": "nova1"})
        # Segunda tentativa com mesmo código deve falhar
        r2 = client.post("/auth/redefinir-senha",
                         json={"email": "re2@test.com", "codigo": codigo, "nova_senha": "nova2"})
        assert r2.status_code == 400

    def test_codigo_case_insensitive(self, client, esportes):
        client.post("/auth/registrar/estudante",
                    json={"nome": "Case", "email": "case@test.com", "senha": "senha", "cpf": "111.200.000-00"})
        r = client.post("/auth/esqueci-senha", json={"email": "case@test.com"})
        codigo = r.json()["codigo"].lower()  # envia em minúsculo
        r2 = client.post("/auth/redefinir-senha",
                         json={"email": "case@test.com",
                               "codigo": codigo, "nova_senha": "nova123"})
        assert r2.status_code == 200


# ===========================================================================
# Painel do estudante
# ===========================================================================

class TestPainelEstudante:
    def test_meu_perfil_retorna_dados(self, client, token_estudante, esportes):
        r = client.get("/meu-perfil", headers=_auth(token_estudante))
        assert r.status_code == 200
        data = r.json()
        assert data["nome"] == "Alice Teste"
        assert data["email"] == "alice@test.com"
        assert "id" in data

    def test_instituicao_nao_acessa_meu_perfil(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.get("/meu-perfil", headers=_auth(tok_inst))
        assert r.status_code == 403

    def test_minhas_candidaturas_vazia(self, client, token_estudante, esportes):
        r = client.get("/minhas-candidaturas", headers=_auth(token_estudante))
        assert r.status_code == 200
        assert r.json() == []

    def test_minhas_candidaturas_apos_aplicar(self, client, token_estudante,
                                              token_e_id_instituicao, esportes):
        tok_inst, inst_id = token_e_id_instituicao
        _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        r = client.get("/minhas-candidaturas", headers=_auth(token_estudante))
        assert r.status_code == 200
        assert len(r.json()) == 1
        ap = r.json()[0]
        assert ap["status"] == "pendente"
        assert ap["modalidade"] == "Natação"
        assert ap["nome_fantasia"] == "Clube Teste"

    def test_candidatura_aprovada_aparece_corretamente(self, client, token_estudante,
                                                       token_e_id_instituicao, esportes):
        tok_inst, inst_id = token_e_id_instituicao
        _aplicar(client, token_estudante, inst_id, esportes["Natação"])
        apps = _minhas_aplicacoes(client, tok_inst)
        client.patch(f"/aplicacoes/{apps[0]['id']}",
                     json={"aprovar": True},
                     headers=_auth(tok_inst))
        r = client.get("/minhas-candidaturas", headers=_auth(token_estudante))
        assert r.json()[0]["status"] == "aprovado"

    def test_instituicao_nao_acessa_minhas_candidaturas(self, client, token_e_id_instituicao, esportes):
        tok_inst, _ = token_e_id_instituicao
        r = client.get("/minhas-candidaturas", headers=_auth(tok_inst))
        assert r.status_code == 403
