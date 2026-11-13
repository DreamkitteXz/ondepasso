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

**Modo "Por questão" (Enem, Etapa 2):**
- Terceiro modo do leitor, ao lado de Caderno e Rolagem. Mostra uma questão por vez, desenhada a partir do PDF oficial do Inep: o leitor desenha a página no navegador e mostra só o retângulo da questão (`recortarRegiao` em `lib/leitor/pdf.ts`). Nada é copiado, hospedado ou reescrito, e a resposta fica escondida até "Ver resposta". Sem cronômetro, pontuação nem correção. Licença: o conteúdo do Inep é CC BY-ND, e a decisão de exibir recortes por questão foi do Kayque (13/11/2026). A fonte aparece sob cada questão.
- O mapa de onde está cada questão é calculado no navegador, a partir da posição do texto no PDF (`lib/leitor/questoes.ts`, função pura). Regras: cabeçalho "QUESTÃO NN" (mesmo quebrado em pedaços); página de uma ou duas colunas deduzida do texto; ordem de leitura esquerda→direita, página a página; a questão vai até o próximo cabeçalho ou marcador e continua no topo da coluna seguinte se for preciso. Os marcadores são título de área, "Questões de 46 a 90", "PROPOSTA DE REDAÇÃO" e "INSTRUÇÕES PARA A REDAÇÃO". "Texto para as questões 06 a 10" vira texto de apoio, mostrado antes de cada questão da faixa. Faixas de cabeçalho/rodapé ficam de fora: marca d'água "ENEM2025…", código de barras, número de página ou linha que se repete na borda. Depois da última página com questão vem a contracapa, que fica de fora.
- Questões 01 a 05 do 1º dia: uma por idioma, com seletor Inglês/Espanhol (ou só a do idioma, nos cadernos digitais). A resposta vem do gabarito oficial já lido pelo leitor (`lerGabarito`); anulada aparece como anulada.
- **Só é oferecido quando o mapa fecha**: exatamente as 90 questões do caderno (95 no 1º dia impresso, por causa dos dois idiomas), cada uma com recorte. Se não fecha, aparece um aviso e nenhum recorte, para não mostrar questão cortada ou misturada.
- Guarda no navegador onde a pessoa parou (`Estudo.ultimaQuestao`) e usa as mesmas marcações "revisar" do índice. "Ver no caderno" volta ao modo Caderno na página da questão.
- **Conferência nos PDFs reais (13/11/2026)**, no navegador do Kayque, com o PDF.js da mesma versão do site:
  - **Amostra:** 60 cadernos de 2021 a 2025, um por ano × aplicação (regular, reaplicação, Belém, digital) × dia × variante (cor, braile/ledor, libras, idioma digital).
  - **Contagem:** 59 fecham.
  - **Falha:** só o 2023 reaplicação, 2º dia, caderno 5. A questão 146 não tem o cabeçalho na camada de texto do PDF, então o modo fica indisponível nesse caderno, como deve.
  - **Visual:** 12 questões conferidas a olho. Incluem coluna dupla, largura total, questão partida entre colunas, texto de apoio (06–10 de 2025), espanhol, a 45 antes da redação, a última do caderno (2021 e 2022 reaplicação) e uma digital.
  - **Defeito conhecido:** em 2021–2022, um recorte que começa no topo da coluna direita pode trazer, no canto, um pedaço do texto vertical decorativo da página ("…do Ensino Médio").
  - **Escopo da amostra:** as demais cores de cada aplicação têm a mesma diagramação, mas não foram abertas uma a uma.

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

Modo por questão:
- `npm test` roda `tests/questoes.test.cjs`, com regras do mapa em páginas sintéticas: colunas, continuação, apoio, seções, idiomas, faixas sem marca d'água, cadernos digitais, contracapa e questão faltando.
- `tests/questoes.e2e.mjs` é o teste de ponta a ponta. Usa cadernos e gabaritos **sintéticos** com a diagramação do Enem, servidos no lugar dos do Inep. Cobre separação, recorte, "Ver resposta", anulada, idioma, texto de apoio, revisar, retomar onde parou, "Ver no caderno", celular e o aviso quando o mapa não fecha. Os PDFs sintéticos não são versionados; o gerador é `tests/fixtures/gerar_cadernos_sinteticos.py`.

## Outros vestibulares (Fuvest, Unicamp)

Plano, andamento e pendências: documento `claude/provas-vestibulares.md` do projeto.

**Modelo.** O Enem continua no tipo `Prova` (um item por caderno), sem mudança de ids, URLs, favoritos ou progresso. Os outros vestibulares usam o tipo `Exame` (`lib/provas-tipos.ts`): vestibular + edição (ano de ingresso) + fase + dia, com as versões do caderno dentro (`versoes`), os documentos complementares (`complementares`: gabarito, respostas esperadas, abordagem da redação) e as lacunas (`lacunas`, com um de quatro estados: não publicado, não encontrado, fora do ar, não se aplica). Cada documento traz `acesso` (`leitor` ou `oficial`) e `procedencia` (página, seção, texto do link, data da coleta e tipo de conferência).

**Dados.**
1. Os links das páginas oficiais do acervo ficam em `dados/vestibulares/<vestibular>-links-<data>.json`, com a seção e o texto de cada link, o método e os limites da coleta.
2. `python3 pipeline/provas_vestibulares.py` gera `dados/saida/site/vestibulares.json` e a auditoria `dados/vestibulares/cobertura.json` (o que entrou, o que ficou de fora e por quê, lacunas). Um link de prova que nenhuma regra reconhece para o script.
3. Sem arquivo de links, o vestibular aparece como "em preparação", com o motivo em `dados/vestibulares/<vestibular>-pendencia.json` (hoje nenhum vestibular está assim: Fuvest e Unicamp estão catalogados).
4. Cada link pode trazer `conferido` (`http`, `tipo`, `bytes` e, quando a identidade foi confirmada, `identidade`). O pipeline passa isso para o documento: `bytes`, `procedencia.conferencia = "head"` e `procedencia.identidade`. Sem `conferido`, o documento vale só como "listado" na página oficial.

**Unicamp (Comvest).** Links coletados em 13/11/2026 abrindo as páginas oficiais no navegador (`unicamp-links-2026-11-13.json`, 78 links, todos HEAD 200 e PDF). Regras em `unicamp()` no pipeline:
- 1ª fase: um exame por edição; os cadernos vêm aos pares (`"Q e X"`), um PDF por par; o gabarito é por par (`versoes: ["Q e X"]`), exceto 2022 (um só para todos). **2023: a página não lista gabarito da 1ª fase** (lacuna `nao-encontrado`).
- 2ª fase, 1º dia: caderno único "Redação, Língua Portuguesa e Literaturas… interdisciplinar" (o título oficial cita a Redação, então `redacao: true`), respostas esperadas de Língua Portuguesa/Interdisciplinares e expectativa da banca de Redação.
- 2ª fase, 2º dia: três provas de área (Exatas, Biológicas, Humanas), cada uma um "caderno" do exame (`porArea(e)` troca os textos de "versão" por "área"), com respostas esperadas por área.
- Dia dos documentos: do rótulo oficial quando existe ("1º dia", "Dia-1/Dia-2" no arquivo); nos demais, da área (2º dia) ou do título da prova (Redação/Língua Portuguesa = 1º dia), mesma estrutura que 2023 e 2025 rotulam à mão. Datas de aplicação: não coletadas (`null`).
- Fora desta entrega: provas de habilidades específicas, provas comentadas, simulado, estatísticas.
- O texto "as versões trazem as mesmas questões em ordens diferentes" só aparece na Fuvest: não foi conferido para a Unicamp.

**Conferência da Fuvest (13/11/2026).** Os 49 links usados foram baixados pelo navegador: todos 200/PDF, com tamanho real. Identidade confirmada (metadados, capa ou cabeçalho do gabarito) nos arquivos com `identidade`. Datas de aplicação da 1ª fase vêm do cabeçalho do gabarito oficial: 12/12/2021, 04/12/2022, 19/11/2023, 17/11/2024 e 23/11/2025. Na 2ª fase nenhum documento aberto traz a data de aplicação: só há datas de publicação na página do acervo (ver `fatosDeDocumentos`), e a data fica `null`. A página de 2022 não lista respostas esperadas da 2ª fase (lacuna real). Número de questões: não conferido.

**Acesso.** Os PDFs da Fuvest e da Comvest não respondem com `Access-Control-Allow-Origin`, então o leitor do site não pode abri-los. Todo documento desses vestibulares é `acesso: "oficial"`: o site só leva ao arquivo no servidor oficial, em outra aba. Não há proxy, cópia nem recorte dos arquivos.

**Interface.** `ExamFilters` ganhou vestibular e fase; `ExamLibrary` lista primeiro o Enem (como antes) e depois uma seção por vestibular e edição; `ExameCard` é o cartão com o seletor de versão (o gabarito mostrado é sempre o da versão escolhida, `gabaritoDaVersao`); `PaginaExame` é a página `/provas/<id>/` de um exame. Filtros que só existem no Enem (cor, área, aplicação, acessíveis) tiram os exames da lista, e a fase tira o Enem.

**Testes.** `npm test` inclui `tests/provas.test.cjs`: ids e agrupamento do Enem, catálogo por edição, vínculo versão × gabarito, discursivas, redação, lacunas, filtros e URL.
