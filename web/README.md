# web — site do onde passo (Next.js, exportação estática)

Lê os JSON gerados por `pipeline/construir.py` em `../dados/saida/site/` no momento do build.

```bash
npm install
npm run dev     # http://localhost:3000 (desenvolvimento)
npm run build   # gera out/ com ~7.500 páginas estáticas (rode o pipeline antes)
npm start       # serve a pasta out/ localmente
```

Páginas:
- `/`: busca de cursos + mais procurados
- `/curso/<curso>/`: todas as universidades do curso, com filtro por estado e ordenação
- `/curso/<curso>/<sigla>-<id>/`: corte por modalidade, histórico, pesos, mínimas e aviso de bônus regional

Analytics (GA4, só com consentimento): ver `ANALYTICS.md`. Variável `NEXT_PUBLIC_GA_ID` no build.

Tema escuro/claro segue o sistema (tokens iguais às variáveis do Figma em `app/globals.css`).
