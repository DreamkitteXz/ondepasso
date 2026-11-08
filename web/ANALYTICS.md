# Analytics (Google Analytics 4) do onde passo

Medição de aquisição (de onde vêm as visitas), uso e conversão, **só com consentimento** e **sem nunca enviar notas do Enem**.

## Como funciona

| Arquivo | Papel |
|---|---|
| `lib/analytics.ts` | Único módulo que fala com o GA4: consentimento, carregamento do `gtag.js`, `page_view`, eventos, UTMs, deduplicação e o filtro de parâmetros. |
| `components/Analytics.tsx` | `<Analytics />` (registra a página a cada rota e mostra o aviso de cookies) e `<PreferenciasCookies />` (link do rodapé). |
| `app/layout.tsx` | Inclui `<Analytics />` e os links "Privacidade" e "Preferências de cookies" no rodapé. |
| `app/privacidade/page.tsx` | Política de privacidade e cookies (o texto muda sozinho se o GA estiver desligado). |
| `components/MapaInicio.tsx`, `ListaCurso.tsx`, `DetalheOferta.tsx`, `Calculadora.tsx`, `BuscaCursos.tsx` | Pontos onde os eventos são disparados (só em handlers e efeitos). |

Regras garantidas pelo código:

- **Sem ID, sem nada.** Se `NEXT_PUBLIC_GA_ID` não existir no build, o módulo fica desligado: nenhum aviso, nenhum script, nenhum cookie.
- **Nada antes do consentimento.** O `gtag.js` só é baixado depois de "Permitir". Antes disso não há requisição ao Google nem cookie `_ga`. As ações feitas antes da escolha ficam numa fila em memória (somem ao trocar de página) e só são enviadas se a pessoa permitir.
- **Recusar é tão fácil quanto aceitar** (dois botões iguais) e a escolha pode ser revista no rodapé. Recusar ou revogar apaga `_ga`/`_ga_*`, liga `ga-disable-<ID>` e manda `consent update` negando `analytics_storage`. A escolha vale 12 meses (`VALIDADE_MS`); mude `VERSAO_CONSENTIMENTO` se a finalidade mudar, e todos serão perguntados de novo.
- **Sem publicidade.** Consent Mode v2 com `ad_storage`, `ad_user_data` e `ad_personalization` sempre negados; `allow_google_signals: false`; `allow_ad_personalization_signals: false`; `ads_data_redaction`.
- **Sem dados pessoais.** Os eventos só aceitam os parâmetros de `PARAMETROS` e só valores que são rótulos (`a-z`, `0-9`, `-`, `_`, começando por letra). Número nenhum passa, então uma nota não tem como sair. `page_location` vai sem `#` e só com os parâmetros de URL permitidos (`utm_*`, `curso`, `campus`): um e-mail colado na URL é removido.
- **Sem duplicidade.** `page_view` é manual (`send_page_view: false`) e sai uma vez por URL. Os eventos "uma vez por página" usam uma chave por página (vale também para o efeito duplo do React Strict Mode em desenvolvimento). Nenhum evento é disparado durante o render.
- **Desempenho.** Nada é carregado antes do consentimento. Depois, o script entra `async` quando o navegador fica ocioso (`requestIdleCallback`).
- **UTMs preservadas.** O GA4 lê as UTMs da própria URL (`page_location`). Se a pessoa entrar com UTMs, navegar e só permitir em outra página, as UTMs e o site de origem da primeira página (guardados só nesta aba, em `sessionStorage`) vão no `config` dessa página. UTMs presentes na URL atual nunca são sobrescritas, e as páginas seguintes não repetem a campanha.

## Variável de ambiente

| Variável | Exemplo | Onde |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-AB12CD34EF` | No **build**. Como o site é uma exportação estática, o Next grava o valor no JavaScript durante o `npm run build`; mudar depois exige um novo build. |

- **Produção:** o ID está em `web/.env.production` (`G-8ZT4155ZEW`), lido em todo `npm run build`, inclusive no build da Cloudflare. Para trocar, edite o arquivo ou defina a variável no painel (que tem prioridade):
- **Painel (Cloudflare Workers Builds):** painel da Cloudflare → Workers & Pages → `ondepasso` → Settings → Build → **Variables and secrets** → adicionar `NEXT_PUBLIC_GA_ID`. Depois, faça um novo deploy (um push na `main` ou "Retry build").
  - O ID de medição não é segredo: ele aparece no HTML de qualquer site com GA. Por isso, como alternativa, ele também pode ir num `web/.env.production` versionado (veja `web/.env.example`).
- **Local:** `NEXT_PUBLIC_GA_ID=G-... npm run build && npm start`, ou um `web/.env.local` (ignorado pelo git).

## Eventos

| Evento | Quando | Parâmetros |
|---|---|---|
| `page_view` | Uma vez por página/rota (manual). | `page_location`, `page_title` |
| `en_consulta_iniciada` | Primeira tecla num campo de nota (média, por área ou calculadora). No máximo uma vez por página. | `formulario` (`media` · `areas` · `calculadora`), `curso` |
| `en_curso_selecionado` | Clique num curso: atalhos da home (exceto o que já está no mapa) ou resultado da busca. | `curso` (slug, ex.: `direito`), `origem` (`atalho` · `busca`) |
| `en_consulta_realizada` | "Comparar nota"/"Salvar" com nota válida; na calculadora, quando as cinco notas ficam válidas e paradas por 1,5 s depois de a pessoa digitar. | `formulario`, `curso` |
| `en_resultados_visualizados` ★ | Depois que a comparação aparece na tela: mapa colorido (home), resumo do curso, detalhe da opção ou lista da calculadora. Uma vez por curso e por consulta; mudar filtro não conta. | `pagina` (`inicio` · `curso` · `opcao` · `calculadora`), `curso`, `tipo_nota` (`media` · `areas`), `origem_nota` (`digitada` = nesta página · `salva` = já estava salva), `resultado` (calculadora: `com_opcoes` · `sem_opcoes`) |
| `en_erro_consulta` | Erro real: nota inválida ao enviar, notas por área incompletas, nota fora de 0–1000 na calculadora (uma vez por página) ou falha ao carregar dados. | `tipo_erro` (`nota_invalida` · `notas_area_incompletas` · `falha_carregar_mapa` · `falha_carregar_calculadora`), `formulario`, `curso` |

| `enem_biblioteca_visualizada` | Biblioteca `/provas/` carregada (uma vez por página). | — |
| `enem_filtro_aplicado` | Clique num filtro da biblioteca; a busca conta só na primeira tecla da página. | `filtro` (`ano` · `dia` · `area` · `cor` · `modalidade` · `acessivel` · `busca` · `limpar`), `valor` (ex.: `ano_2025`, `cor_azul`, `todos`) |
| `enem_prova_aberta` | O PDF de uma prova abriu no leitor (uma vez por prova e página). | `prova` (id, ex.: `enem-2025-primeiro-dia-caderno-1-azul`), `modo` (`livro` · `leitura`) |
| `enem_pagina_virada` | Marcos de leitura, cada um uma vez por prova: primeira virada, metade e fim. Nunca a cada página. | `prova`, `marco` (`primeira` · `metade` · `fim`) |
| `enem_gabarito_aberto` | Gabarito aberto no leitor, como PDF ou na consulta por número. | `prova`, `modo` (`leitor` · `pdf` · `consulta`) |
| `enem_pdf_baixado` | Clique em baixar PDF (prova ou gabarito). | `prova`, `arquivo` (`prova` · `gabarito`), `origem` (`biblioteca` · `pagina` · `leitor`) |
| `enem_modo_leitura_alterado` | Troca entre modo livro e modo leitura. | `prova`, `modo` |

★ evento principal (conversão).

Nos eventos da biblioteca não vai o texto digitado na busca nem o número de questão consultado no gabarito.

A modalidade de cota **não** é enviada de propósito: ela pode revelar renda, escola ou raça/cor da pessoa.

## Configuração no GA4 (uma vez)

1. **Propriedade e fluxo:** Admin → Data streams → Web → `https://ondepasso.com.br`. O ID `G-…` é o `NEXT_PUBLIC_GA_ID`.
2. **Medição otimizada:** no fluxo, Enhanced measurement → engrenagem:
   - Page views → Show advanced settings → **desligue "Page changes based on browser history events"** (o site já envia `page_view`; isso evita contagem dupla se algum dia houver navegação por histórico).
   - **Desligue "Form interactions"**: os eventos `en_*` já medem o formulário, melhor.
   - Rolagens, cliques de saída e downloads podem ficar ligados.
3. **Dimensões personalizadas** (necessárias para ver os parâmetros nos relatórios): Admin → Data display → Custom definitions → Create custom dimension, escopo **Event**, uma para cada: `curso`, `origem`, `formulario`, `pagina`, `tipo_nota`, `origem_nota`, `resultado`, `tipo_erro`. Use o nome do parâmetro como nome da dimensão.
4. **Privacidade:**
   - Admin → Data collection → **Google signals desligado**.
   - Admin → Data retention → **Event data retention: 14 months** (é o que diz a página de privacidade; o padrão é 2 meses, o que também limita as explorações).
   - Admin → Account settings → **Data sharing settings**: desmarque tudo o que não for necessário.
   - Não vincule Google Ads nem outros produtos de publicidade.
5. **Evento principal (key event):** depois que `en_resultados_visualizados` aparecer em Admin → Data display → **Events** (pode levar até 24 h; em DebugView aparece na hora), clique na estrela **"Mark as key event"**. Ou crie antes: Admin → Data display → **Key events** → New key event → nome exato `en_resultados_visualizados`.
   - Recomendado: menu ⋮ do key event → **Change counting method → Once per session**. Assim, quem abre três cursos conta como uma conversão na sessão.

## Links com UTM

Use sempre minúsculas e os mesmos nomes. O navegador interno do TikTok e do Instagram costuma não enviar o site de origem: **sem UTM, a visita vira "Direct"**.

| Onde | Link |
|---|---|
| Bio do TikTok | `https://ondepasso.com.br/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` |
| Vídeo do TikTok (comentário fixado / legenda) | `https://ondepasso.com.br/?utm_source=tiktok&utm_medium=social&utm_campaign=video&utm_content=tiktok01` |
| Bio do Instagram | `https://ondepasso.com.br/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| Stories do Instagram | `https://ondepasso.com.br/?utm_source=instagram&utm_medium=social&utm_campaign=stories&utm_content=<nome-do-story>` |
| WhatsApp / grupos | `https://ondepasso.com.br/?utm_source=whatsapp&utm_medium=social&utm_campaign=<grupo-ou-acao>` |
| Anúncio pago (se um dia houver) | `…&utm_medium=paid_social` (TikTok/Instagram) ou `…&utm_medium=cpc` (Google) |

- `utm_medium=social` com fontes `tiktok`, `instagram` ou `whatsapp` cai no canal padrão **Organic Social** do GA4.
- Google Search e acesso direto não precisam de UTM: o GA4 identifica (`google / organic` e `(direct) / (none)`).
- Links para páginas internas também funcionam, ex.: `https://ondepasso.com.br/curso/medicina/?utm_source=tiktok&utm_medium=social&utm_campaign=video&utm_content=medicina`.

## Ver o tráfego do TikTok

- **Tempo real:** Reports → Realtime → card "First user source / medium" (ou "Session source").
- **Relatório:** Reports → Acquisition → **Traffic acquisition**. Troque a dimensão principal para **Session source / medium** e procure `tiktok / social`. Para separar bio de vídeo, adicione a dimensão secundária **Session campaign** (ou **Session manual ad content** para o `utm_content`).
- **Conversão por origem:** no mesmo relatório, a coluna **Key events** (escolha `en_resultados_visualizados`) e **Session key event rate**.
- **Comparar:** botão "Add comparison" → `Session source` exatamente `tiktok`, outra com `instagram` e outra com `google`.

## Funil (Explore → Funnel exploration)

1. Explore → **Funnel exploration** (ou um em branco → técnica Funnel exploration).
2. Steps (lápis):
   1. **Visitantes:** `session_start` (ou `page_view`).
   2. **Início da consulta:** `en_consulta_iniciada`.
   3. **Seleção do curso:** `en_curso_selecionado`.
   4. **Envio da consulta:** `en_consulta_realizada`.
   5. **Resultados:** `en_resultados_visualizados`.
3. Use **"is indirectly followed by"** entre as etapas e ative **Make open funnel**. A home já abre com Medicina no mapa, então muita gente digita a nota antes de trocar de curso (ou nem troca). Para ver só quem consulta, crie uma segunda versão sem a etapa 3.
4. **Breakdown:** `Session source / medium` (ou `Session default channel group`) para comparar TikTok, Instagram, Google e direto lado a lado. Limite em 5 a 10 linhas.
5. Para segmentar: Segments → Session segment → condição `Session source` contém `tiktok` → aplique e compare com "Todos os usuários".
6. Com as dimensões personalizadas criadas, dá para filtrar a etapa 5 por `pagina` (home × curso × calculadora) ou `curso`.

## Testar

**Automático (sem GA real):**

```bash
cd web
npm run build                       # usa o ID de .env.production
(cd out && python3 -m http.server 4321) &
GA_ID=G-8ZT4155ZEW node tests/analytics.e2e.mjs   # precisa do pacote playwright instalado
```

O script troca o `gtag.js` por um stub e confere o `dataLayer`: nada antes do consentimento, Consent Mode, page_view único, os cinco eventos com os parâmetros certos, deduplicação, erros, UTMs (inclusive aceitando em outra página), recusa, revogação, limpeza de cookies e de parâmetros desconhecidos, e que nenhuma nota aparece.

**Com o GA real (DebugView):**

1. Abra `https://ondepasso.com.br/?ga_debug=1&utm_source=teste&utm_medium=qa&utm_campaign=debug`. O `ga_debug=1` liga o `debug_mode` só nesta aba e não vai para o GA.
2. Clique em **Permitir**.
3. GA4 → Admin → **DebugView**: o aparelho aparece em segundos. Faça o caminho: digite uma nota, troque de curso, envie, abra a calculadora e force um erro (ex.: `abc`).
4. Confira cada evento e os parâmetros. Em Realtime, a origem deve aparecer como `teste / qa`.
5. Recuse pelo rodapé e confira (DevTools → Application → Cookies) que `_ga` sumiu e que nada mais é enviado (DevTools → Network, filtro `collect`).

## Referências

- [GA4: campos de configuração do gtag](https://developers.google.com/analytics/devguides/collection/ga4/reference/config) (`campaign_*`, `page_location`, `page_referrer`, `allow_google_signals`, `send_page_view`)
- [GA4: método de contagem de key events](https://support.google.com/analytics/answer/13366706)
- [ANPD: Guia orientativo sobre cookies e proteção de dados pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/processo-guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf)
