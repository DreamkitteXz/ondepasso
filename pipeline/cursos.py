"""Nomes de curso que o MEC escreve de jeitos diferentes para o mesmo curso.

Cada universidade cadastra o nome do seu jeito ("Sistema de Informação", "Engenharia da Computação",
"Letras - Língua e Literatura Inglesa"...). Sem juntar, o mesmo curso vira várias páginas, e a busca, o mapa
e o Google se dividem entre elas. Aqui ficam só variações de escrita do MESMO curso; ênfases e habilitações
diferentes ("Engenharia Elétrica - Eletrônica", "ABI - ...", "Música - Piano") continuam separadas.

O endereço antigo de cada curso juntado redireciona (301) para o novo: veja `redirecionamentos()`.
"""
import re

# nome como sai de construir.titulo()  ->  nome canônico
_GRUPOS = {
    "Ciência da Computação": ["Ciências da Computação"],
    "Sistemas de Informação": ["Sistema de Informação"],
    "Engenharia de Computação": ["Engenharia da Computação"],
    "Ciências Econômicas": ["Ciência Econômica"],
    "Agronomia": ["Engenharia Agronômica"],
    "Administração": ["Administração de Empresas"],
    "Jornalismo": ["Comunicação Social - Jornalismo"],
    "Publicidade e Propaganda": ["Comunicação Social - Publicidade e Propaganda"],
    "Relações Públicas": ["Comunicação Social - Relações Públicas"],
    "Rádio, TV e Internet": ["Comunicação Social - Rádio, TV e Internet"],
    "Radialismo": ["Comunicação Social  - Radialismo", "Comunicação Social - Radialismo"],
    "Audiovisual": ["Comunicação Social - Audiovisual"],
    "Engenharia Ambiental e Sanitária": ["Engenharia Sanitaria e Ambiental", "Engenharia Sanitária e Ambiental"],
    "Engenharia Cartográfica e de Agrimensura": ["Engenharia de Agrimensura e Cartográfica"],
    "Engenharia de Bioprocessos e Biotecnologia": ["Engenharia de Biotecnologia e Bioprocessos"],
    "Engenharia de Energia": ["Engenharia de Energias"],
    "Engenharia Mecatrônica": ["Engenharia de Mecatrônica"],
    "Engenharia de Transportes e Logística": ["Engenharia de Transporte e Logística"],
    "Design de Moda": ["Design - Moda"],
    "Gestão do Agronegócio": ["Gestão de Agronegócios"],
    "Ciência de Dados": ["Ciência dos Dados"],
    "Ciência de Dados e Inteligência Artificial": ["Inteligência Artificial e Ciência de Dados"],
    "Estatística e Ciência de Dados": ["Ciência de Dados e Estatística"],
    "Ciências da Religião": ["Ciência da Religião", "Ciências das Religiões"],
    "Interdisciplinar em Ciência, Tecnologia e Inovação": ["Interdisciplinar em Inovação, Ciência e Tecnologia"],
    "Conservação e Restauração": ["Conservação e Restauro"],
    "Artes": ["Arte"],
    "Letras - Português": [
        "Letras - Língua Portuguesa", "Letras - Língua Portuguesa e Literaturas de Língua Portuguesa",
        "Letras - Língua e Literatura Portuguesa", "Letras - Português e Literaturas de Língua Portuguesa",
        "Letras - Português e Literaturas", "Letras - Português e Literaturas da Língua Portuguesa",
        "Letras - Língua Portuguesa e Respectiva Literatura", "Língua Portuguesa e Respectivas Literaturas",
    ],
    "Letras - Inglês": [
        "Letras - Língua Inglesa", "Letras - Língua Inglesa e Respectivas Literaturas", "Letras - Língua e Literatura Inglesa",
        "Letras - Língua e Literaturas de Língua Inglesa", "Letras  - Inglês e Literaturas da Língua Inglesa",
        "Letras - Inglês e Literaturas da Língua Inglesa", "Letras - Língua Inglesa e Suas Literaturas", "Língua e Literaturas da Língua Inglesa",
    ],
    "Letras - Espanhol": [
        "Letras - Lingua Espanhola", "Letras - Língua Espanhola", "Letras - Língua Espanhola e Literatura", "Letras - Língua e Literatura Espanhola",
        "Letras - Espanhol e Literatura Hispânica", "Letras - Espanhol e Literaturas de Língua Espanhola",
        "Letras - Língua Espanhola e Literatura Espanhola e Hispano-Americana",
    ],
    "Letras - Francês": ["Letras - Língua e Literatura Francesa", "Letras - Língua Francesa e Literatura", "Letras - Francês e Literaturas de Língua Francesa"],
    "Letras - Português e Inglês": [
        "Letras - Português-Inglês", "Letras - Português e Inglês e Respectivas Literaturas",
        "Letras - Língua Portuguesa e Língua Inglesa e Respectivas Literaturas", "Letras - Língua e Literatura Portuguesa e Língua e Literatura Inglesa",
        "Letras - Língua Portuguesa e Língua Inglesa", "Letras - Língua Portuguesa e Respectivas Literaturas e Língua Inglesa",
        "Letras Modernas - Português/Inglês e Respectivas Literaturas",
    ],
    "Letras - Português e Espanhol": [
        "Letras Português e Espanhol e Respectivas Literaturas", "Letras - Língua Portuguesa e Língua Espanhola e Respectivas Literaturas",
        "Letras - Língua e Literatura Portuguesa e Língua e Literatura Espanhola", "Letras - Língua Portuguesa e Respectivas Literaturas e Língua Espanhola",
    ],
    "Letras - Português e Francês": ["Letras - Língua Portuguesa e Língua Francesa"],
}
CANONICO = {variante: canon for canon, variantes in _GRUPOS.items() for variante in variantes}
_SUFIXO = re.compile(r"\s*-\s*Licenciatura Ou Bacharelado$")


def canonico(nome: str) -> str:
    """Nome canônico de um curso (o próprio nome se não houver variação conhecida)."""
    nome = _SUFIXO.sub("", nome)
    return CANONICO.get(nome, nome)


def redirecionamentos(nomes_antigos, slug) -> list[str]:
    """Linhas do _redirects (Cloudflare) para cada nome que mudou de slug: a página do curso e, com *, as das opções."""
    estaticas, dinamicas = set(), set()
    for nome in nomes_antigos:
        de, para = slug(nome), slug(canonico(nome))
        if de != para:
            estaticas |= {f"/curso/{de} /curso/{para}/ 301", f"/curso/{de}/ /curso/{para}/ 301"}
            dinamicas.add(f"/curso/{de}/* /curso/{para}/:splat 301")
    # O Cloudflare pede as regras fixas antes das com * (limites: 2.000 fixas e 100 com *).
    return sorted(estaticas) + sorted(dinamicas)


def regras_de(linha_com_asterisco: str) -> set[str]:
    """As 3 regras (sem barra, com barra, com *) a partir da regra com *, para reescrever o _redirects sem perder nada."""
    de, para, cod = linha_com_asterisco.split()
    de, para = de[:-2], para[: -len("/:splat")]
    return {f"{de} {para}/ {cod}", f"{de}/ {para}/ {cod}", linha_com_asterisco}
