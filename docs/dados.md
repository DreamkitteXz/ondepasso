# Fontes de dados (verificado em 30/10/2026)

## Sisu: portal oficial › Relatórios
https://sisu.mec.gov.br/#/relatorio. O portal de dados abertos (dadosabertos.mec.gov.br) só tem até 2023.

| Arquivo (em dados/brutos) | Linhas | O que traz |
|---|---|---|
| sisu{2024,2025,2026}_inscricoes_notas_corte.xlsx | 58–63 mil | nota de corte oficial (NU_NOTACORTE), vagas e inscrições por oferta × modalidade |
| sisu{2024,2025,2026}_vagas_ofertadas.xlsx | 58–63 mil | pesos e notas mínimas por área, média mínima, turno, grau, periodicidade, % de cotas |

- A aba 1 é o dicionário de dados e a aba 2 são os dados.
- Também existem: 2019–2023 (por semestre), 2010–2018 (planilha única) e Sisu+ 2026 (só vagas).

## Chaves e diferenças entre anos
- **Juntar os arquivos:** `CO_IES_CURSO` + `TIPO_CONCORRENCIA` (inscrições) = `CO_IES_CURSO` + `TP_COTA` (vagas). Em 2026, 100% das linhas casam.
- **Ampla concorrência:** `TIPO_CONCORRENCIA = AC`.
- **Colunas que mudam de nome ou de posição:**
  - em 2026, `QT_VAGAS_OFERTADAS` passa a se chamar `QT_VAGAS_CONCORRENCIA`
  - nas planilhas de vagas, a ordem de UF e município se inverte a partir de 2025
- **EDICAO** vem como "302" em 2026 (é um código, não o ano). Use o ano do nome do arquivo.
- **Nota de corte 0 ou vazia** em 25–36% das linhas: modalidade sem inscritos ou sem vaga. Isso vira "sem corte", nunca zero.
- **Bônus regional:** os cortes acima de 900 em 2024 (Medicina UFBA Vitória da Conquista 938,25, UFRN Caicó, UFAM, UFMT) não são erro. Nessas ofertas, a modalidade "B" dá de 15% a 20% de bônus a candidatos da região, e eles disputam junto com a ampla. Por isso, o corte da ampla já sai com a nota inflada pelo bônus. O site precisa avisar quando `bonus_regional_pct` > 0, porque um aluno de fora compara a nota dele, sem bônus, com um corte que tem bônus.

## Município → IBGE + coordenadas
- **O Sisu não traz o código do IBGE**, só `NO_MUNICIPIO_CAMPUS` + `SG_UF_CAMPUS`.
- **Referência usada:** `dados/referencia/municipios_ibge.csv` (kelvins/municipios-brasileiros, 5.570 municípios com latitude e longitude).
- **Casamento por nome normalizado + UF:** 608 de 609 municípios (2024–2026) casam.
- **Única exceção:** "Itapagé" (CE), que no IBGE é "Itapajé" (código 2306306).
