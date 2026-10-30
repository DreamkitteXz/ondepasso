# onde passo

Notas de corte do Sisu por curso, universidade, cota e ano. Grátis e sem cadastro.

Dados públicos do MEC (sisu.mec.gov.br › Relatórios). Não é um site oficial.

## Estrutura
- `dados/brutos/`: planilhas oficiais do Sisu, sem alteração (fora do git). Fonte em `docs/dados.md`.
- `dados/referencia/`: municípios do IBGE com coordenadas.
- `dados/saida/`: o que o pipeline gera (SQLite, JSON do site e `relatorio.md`).
- `pipeline/`: scripts Python.

## Rodar
```bash
pip install -r requirements.txt
python pipeline/construir.py      # ~1 min; leia dados/saida/relatorio.md depois
python pipeline/inspecionar.py    # opcional: confere colunas de arquivos novos
```

Para adicionar um ano, salve `sisuANO_inscricoes_notas_corte.xlsx` e `sisuANO_vagas_ofertadas.xlsx` em `dados/brutos/` e rode de novo.
Se aparecer "SEM PAR" no relatório, inclua a grafia em `pipeline/municipios.py` › `APELIDOS`.

## Publicar (Cloudflare Workers, só arquivos estáticos)
Em Workers & Pages › ondepasso › Settings › Build:
- Root directory: `web`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (usa `web/wrangler.jsonc`, que publica a pasta `out/`)
- Variável de build: `NODE_VERSION=22`

Não use o OpenNext (`opennextjs-cloudflare`): o site é 100% estático.
O build lê `dados/saida/site/` (versionado). Para atualizar os dados, rode o pipeline, faça commit da pasta e dê push.
