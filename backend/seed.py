"""
Popula o banco com dados de teste
Rode UMA vez:   python seed.py
"""
from datetime import date

from sqlmodel import Session, select

from database import engine, criar_tabelas
from models import Usuario, Estudante, Instituicao, Esporte, InstituicaoEsporte
from security import gerar_hash

criar_tabelas()

with Session(engine) as s:
    if s.exec(select(Esporte)).first():
        print("Banco já populado. Apague sportfinder.db para recriar.")
        raise SystemExit

    # --- Esportes ---
    nomes = ["Futebol", "Basquete", "Natação", "Vôlei", "Judô", "Ginástica", "Tênis de Mesa", "Academia"]
    esportes = {n: Esporte(nome=n) for n in nomes}
    for e in esportes.values():
        s.add(e)
    s.commit()
    for e in esportes.values():
        s.refresh(e)

    def nova_instituicao(nome, email, cnpj, fantasia, endereco, desc, lat, lon, mods):
        u = Usuario(nome=nome, email=email, senha_hash=gerar_hash("123"), tipo_usuario="instituicao")
        s.add(u); s.commit(); s.refresh(u)
        s.add(Instituicao(id_usuario=u.id, cnpj=cnpj, nome_fantasia=fantasia,
                          endereco=endereco, descricao=desc, latitude=lat, longitude=lon))
        s.commit()
        for m in mods:
            s.add(InstituicaoEsporte(id_instituicao=u.id, id_esporte=esportes[m].id,
                                     horarios="Qui 19h00; Sáb 09h30"))
        s.commit()
        return u.id

    nova_instituicao("Academia Atlética", "contato@academia.com", "12.345.678/0001-10",
                     "Academia Atlética", "Rua A, Centro", "Foco em treinamento funcional.",
                     -23.550520, -46.633308, ["Ginástica", "Natação"])
    nova_instituicao("Clube da Vila", "clube@vila.com", "98.765.432/0001-55",
                     "Clube da Vila", "Av. B, Bairro", "Clube esportivo completo.",
                     -23.558704, -46.625290, ["Futebol", "Natação"])
    nova_instituicao("Judô SP", "judo@sp.com", "22.333.444/0001-77",
                     "Escola de Judô SP", "Rua C, Zona Leste", "Escola especializada em judô.",
                     -23.512200, -46.620000, ["Judô"])

    def novo_estudante(nome, email, cpf, nasc, genero, lat, lon):
        u = Usuario(nome=nome, email=email, senha_hash=gerar_hash("123"), tipo_usuario="estudante")
        s.add(u); s.commit(); s.refresh(u)
        s.add(Estudante(id_usuario=u.id, cpf=cpf, data_nascimento=date.fromisoformat(nasc), genero=genero, latitude=lat, longitude=lon))
        s.commit()

    novo_estudante("Alice", "alice@mail.com", "111.222.333-44", "2000-05-15", "Feminino", -23.551000, -46.634000)
    novo_estudante("Bruno", "bruno@mail.com", "555.666.777-88", "1998-01-20", "Masculino", -23.560000, -46.620000)

    print("Banco populado com sucesso!")
    print("Logins de teste (senha '123'): alice@mail.com, clube@vila.com")
