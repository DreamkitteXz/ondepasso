# Biblioteca de provas (`/provas`)

Biblioteca das provas oficiais do Enem (2021 a 2025), com um leitor que folheia como um caderno, e catálogo das provas de outros vestibulares (hoje: Fuvest, ingresso 2022 a 2026), com link para o site oficial. A parte de outros vestibulares está na seção [Outros vestibulares](#outros-vestibulares-fuvest-unicamp), no fim.

## Rotas

| Rota | O que é |
|---|---|
| `/provas/` | Biblioteca: busca, filtros (ano, dia, área, cor, aplicação, acessibilidade), salvas, grupos por edição. O HTML estático traz todos os cadernos (SEO); os filtros só escondem no navegador e ficam na URL (`?ano=2025&dia=1&cor=azul…`). |
| `/provas/<id>/` | Uma página por caderno (ex.: `enem-2025-primeiro-dia-caderno-1-azul`): título, fatos, leitor, gabarito, versões acessíveis, outros cadernos, fonte e dados estruturados (`LearningResource`). `#ler` abre o leitor direto. |

Ficam no sitemap (`app/sitemap.ts`) e na navegação principal ("Provas").

## De onde vêm os dados

1. A página oficial [Provas e Gabaritos do Inep](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos) foi lida aba por aba (2021 a 2025). O resultado está em `dados/inep/provas-links-<data>.json`, com ano, seção (aplicação), cabeçalho do caderno, texto e URL de cada link.
2. Cada arquivo foi conferido com `HEAD` em `download.inep.gov.br`, e o resultado está em `dados/inep/provas-verificacao-<data>.json` (status, tamanho e tipo).
   - Dois links da página estão em `http://`; foram reconferidos em `https://`.
   - Dois estão fora do ar (404): `2025_GB_impresso_D6_CD11.pdf` e `2024_PV_impresso_D2_CD12_Superampliada.pdf`. Eles aparecem como indisponíveis.
3. `python3 pipeline/provas_inep.py` gera `dados/saida/site/provas.json`, com um item por caderno: prova, gabarito do **mesmo bloco** do Inep (ano + aplicação + dia + caderno, nunca só pela cor) e versões acessíveis (ampliada, superampliada, ledor, NVDA, DOSVOX).

Hoje: 144 cadernos, 143 com gabarito e 89 versões acessíveis.

**Para atualizar** (por exemplo, quando o Inep publicar 2026):
1. Repita a coleta e a conferência.
2. Salve os dois JSON com a data nova.
3. Ponha o ano em `ANOS` no pipeline e rode o script.

Não publique 2026 antes de os arquivos estarem na página oficial.

**Hospedagem e licença.** Os PDFs não são copiados para o site: o leitor abre o arquivo direto do servidor do Inep, que libera CORS para `ondepasso.com.br` (conferido em 08/11/2026) e responde a pedidos por intervalo. O portal do Inep publica o conteúdo sob CC BY-ND 3.0. O site mostra a fonte em toda página e não altera os arquivos.

## Leitor

| Arquivo | Papel |
|---|---|
| `components/provas/AbrirLeitor.tsx` | Convite e carregamento sob demanda. O leitor e o PDF.js só são baixados ao clicar (ou com `#ler`). |
| `components/provas/leitor/ExamReader.tsx` | Estado do leitor: documento (prova ou gabarito), modo, zoom, página, painéis, tela cheia, teclado, pinça, marcadores e analytics. |
| `components/provas/leitor/FlipBookViewer.tsx` | Adaptador StPageFlip (`page-flip` 2.0.7, MIT) × PDF.js. As folhas são criadas fora do React (o page-flip move os nós) e recebem o canvas só perto da vista. |
| `components/provas/leitor/PdfPageRenderer.tsx` | Página em canvas com esqueleto e texto para leitor de tela; `LeituraContinua` (modo leitura com IntersectionObserver) e `EspelhoEstatico` (livro sem animação). |
| `components/provas/leitor/ReaderToolbar.tsx`, `ReaderSettings.tsx`, `ExamNavigation.tsx`, `AnswerKeyViewer.tsx` | Barra, configurações, índice (páginas, questões, marcados) e gabarito. |
| `lib/leitor/pdf.ts` | PDF.js (`pdfjs-dist` 6.4.299, build legacy): abertura com progresso, renderização com fila de prioridade, até 2 em paralelo, cache LRU de 12 canvases, liberação ao trocar de documento, índice de questões e leitura do gabarito. |
| `lib/leitor/preferencias.ts` | Preferências, marcadores, questões para revisar, provas salvas e som de papel sintetizado. Tudo no `localStorage`. |

**Desempenho:**
- Nada é baixado antes de abrir.
- `disableAutoFetch` está ligado.
- Só a dupla atual e as vizinhas (±2/3) são desenhadas.
- As folhas distantes perdem o canvas e o cache zera a memória dos que saíram.
- A resolução é a largura × `devicePixelRatio` (até 2,5×).
- O worker, as fontes padrão e o wasm do PDF.js são copiados para `public/pdfjs/` por `scripts/copiar-pdfjs.mjs` (roda em `predev`/`prebuild`; a pasta não vai para o git).

**Índice de questões e gabarito.** São feitos no navegador, a partir do texto oficial:
- **Índice:** procura "Questão NN" em cada página. Só aparece se encontrar a sequência inteira do caderno: 1–90 no 1º dia, 91–180 no 2º.
- **Gabarito:** lê a tabela do PDF do gabarito pelas posições do texto. A consulta por número só aparece se todas as questões tiverem letra A–E (ou "anulada") e as questões 1–5 do 1º dia tiverem inglês e espanhol.
- O leitor de gabarito foi conferido em 08/11/2026 contra os 143 gabaritos oficiais (2021–2025): todos lidos por inteiro. Isso inclui questões anuladas ("Anulado", "anulada") e números que o PDF quebra em pedaços ("12"+"1" em 2021–2023).
- Sem leitura completa, fica só o PDF. Nenhuma resposta é inventada.
- Acertos não viram nota (TRI).

**Ainda não feito (depende de índice revisado):**
- disciplina por questão;
- resolução interativa (alternativas, correção, histórico, erros, favoritas por questão).

O tipo `QuestaoIndexada` em `lib/provas-tipos.ts` já descreve o formato. O filtro "Disciplina" aparece como "em preparação".

**Acessibilidade:**
- Tudo funciona por teclado: ← e →, e Esc fecha o painel ou sai da tela cheia. As teclas não são capturadas em campos de texto.
- Todos os botões têm nome acessível.
- `prefers-reduced-motion` liga o livro sem animação.
- O texto da página fica disponível para leitores de tela.
- Os links para as versões NVDA e DOSVOX do Inep aparecem quando existem.

## Testes

```bash
npm run dev -- -p 3100
BASE=http://localhost:3100 PDFS=<pasta com teste-<arquivo>.pdf> node tests/provas.e2e.mjs <pasta-capturas>
```

A rede do ambiente de teste pode não alcançar o Inep. Por isso o teste serve cópias locais dos PDFs (não versionadas) no lugar de `download.inep.gov.br`, e trata arquivos ausentes como falha de rede.

O teste cobre:
- filtros, URL, estado vazio, salvas e botões sem nome;
- largura no celular;
- página indexável;
- virada por teclado, mouse (arrasto) e toque (arrasto e deslize);
- memória (folhas com canvas) e campo que não rouba as setas;
- índice de questões, marcados e gabarito (q3, q46, q90);
- modo leitura, zoom, livro sem animação e tela cheia/Esc;
- download oficial, rede lenta e erro.

## Outros vestibulares (Fuvest, Unicamp)

Plano, andamento e pendências: documento `claude/provas-vestibulares.md` do projeto.

**Modelo.** O Enem continua no tipo `Prova` (um item por caderno), sem mudança de ids, URLs, favoritos ou progresso. Os outros vestibulares usam o tipo `Exame` (`lib/provas-tipos.ts`): vestibular + edição (ano de ingresso) + fase + dia, com as versões do caderno dentro (`versoes`), os documentos complementares (`complementares`: gabarito, respostas esperadas, abordagem da redação) e as lacunas (`lacunas`, com um de quatro estados: não publicado, não encontrado, fora do ar, não se aplica). Cada documento traz `acesso` (`leitor` ou `oficial`) e `procedencia` (página, seção, texto do link, data da coleta e tipo de conferência).

**Dados.**
1. Os links das páginas oficiais do acervo ficam em `dados/vestibulares/<vestibular>-links-<data>.json`, com a seção e o texto de cada link, o método e os limites da coleta.
2. `python3 pipeline/provas_vestibulares.py` gera `dados/saida/site/vestibulares.json` e a auditoria `dados/vestibulares/cobertura.json` (o que entrou, o que ficou de fora e por quê, lacunas). Um link de prova que nenhuma regra reconhece para o script.
3. Sem arquivo de links, o vestibular aparece como "em preparação", com o motivo em `dados/vestibulares/<vestibular>-pendencia.json`.

**Acesso.** Os PDFs da Fuvest e da Comvest não respondem com `Access-Control-Allow-Origin`, então o leitor do site não pode abri-los. Todo documento desses vestibulares é `acesso: "oficial"`: o site só leva ao arquivo no servidor oficial, em outra aba. Não há proxy, cópia nem recorte dos arquivos.

**Interface.** `ExamFilters` ganhou vestibular e fase; `ExamLibrary` lista primeiro o Enem (como antes) e depois uma seção por vestibular e edição; `ExameCard` é o cartão com o seletor de versão (o gabarito mostrado é sempre o da versão escolhida, `gabaritoDaVersao`); `PaginaExame` é a página `/provas/<id>/` de um exame. Filtros que só existem no Enem (cor, área, aplicação, acessíveis) tiram os exames da lista, e a fase tira o Enem.

**Testes.** `npm test` inclui `tests/provas.test.cjs`: ids e agrupamento do Enem, catálogo por edição, vínculo versão × gabarito, discursivas, redação, lacunas, filtros e URL.
