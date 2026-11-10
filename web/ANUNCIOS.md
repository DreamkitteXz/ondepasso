# Anúncios (Google AdSense)

Os anúncios ocupam o **bloco reservado** do site: o cartão "Gostou? Compartilhe com sua turma", que aparece na home (mapa), na lista do curso, no detalhe da opção e na página de cada universidade.

Eles só aparecem para quem permite "Anúncios" no aviso de cookies. Quem recusa, ou ainda não respondeu, continua vendo o convite para compartilhar o site.

## O que nunca muda

- **Patrocinador direto primeiro.** Se `lib/patrocinio.ts` tiver um patrocinador, ele ocupa o bloco e o AdSense não entra.
- **Lugares proibidos.** Nada de anúncio no meio das notas de corte, dentro do leitor de provas ou na Calculadora.
- **Nada do aluno vai para o Google.** O script do AdSense só é baixado depois da permissão. As URLs do site não levam nota, média nem cota.
- **Recusar não quebra nada.** Retirar a permissão apaga os cookies `__gads`, `__gpi` e `__eoi` do domínio.

## Como ligar

São duas etapas, as duas pelo arquivo `.env.production`, que é versionado. Os IDs do AdSense são públicos: aparecem no HTML de qualquer site com anúncios. Uma variável com o mesmo nome no painel da Cloudflare tem prioridade sobre o arquivo.

### 1. Pedir a aprovação do site

1. Crie a conta em https://adsense.google.com com o Google que vai receber os pagamentos e adicione o site `ondepasso.com.br`.
2. Copie o ID de editor (`ca-pub-` seguido de 16 dígitos) e coloque em `.env.production`:
   ```
   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000
   ```
3. Publique. O site passa a ter:
   - a meta tag `google-adsense-account`, que só serve para verificação e não carrega nada do Google;
   - o arquivo `/ads.txt`, gerado no build por `scripts/gerar-ads-txt.mjs`.

   Nenhum anúncio aparece ainda.
4. No AdSense, escolha a verificação pela **meta tag** (ou pelo ads.txt) e peça a análise. A aprovação costuma levar de alguns dias a algumas semanas.

### 2. Ligar os anúncios (depois de aprovado)

1. No AdSense, vá em **Anúncios › Por bloco de anúncios › Anúncios de display**. Crie um bloco "onde passo – bloco reservado", responsivo e quadrado.
2. Copie o `data-ad-slot` (só números) e acrescente em `.env.production`:
   ```
   NEXT_PUBLIC_ADSENSE_SLOT=1234567890
   ```
3. Publique. A partir daí:
   - o aviso de cookies pergunta sobre "Medição de visitas" e "Anúncios", com a opção de escolher cada um. Quem já tinha respondido é perguntado de novo, porque o consentimento passa para a versão 2;
   - o bloco reservado mostra o anúncio para quem permitiu. Quando o Google não tem anúncio para mostrar, o convite para compartilhar volta;
   - a página `/privacidade/` ganha a seção de anúncios e os cookies do AdSense.
4. **Não ligue os "Anúncios automáticos"** no painel do AdSense: eles colocariam anúncios em qualquer lugar, inclusive no meio dos números. O site só usa o bloco manual.

## Onde está no código

- `lib/anuncios.ts`: liga e desliga pelas variáveis, carrega o script e apaga os cookies.
- `lib/analytics.ts`: consentimento com duas finalidades (`medicao` e `publicidade`) e Consent Mode do gtag.
- `components/Analytics.tsx`: aviso de cookies.
- `components/Anuncio.tsx`: o bloco `<ins class="adsbygoogle">` e a volta para "Compartilhe" quando o bloco vem vazio.
- `components/Apoio.tsx`: ordem do bloco reservado (patrocínio, anúncio, compartilhar).
- `app/privacidade/page.tsx`: o texto acompanha o que está ligado.
