# Servidor do relatório pago

Worker do Cloudflare, separado do site, que faz três coisas: cria a cobrança Pix no Mercado Pago, entrega um
código de acesso quando o pagamento cai e confere o código (até 3 aparelhos). **Nunca recebe notas do Enem.**

O site só mostra a oferta e a compra quando o build tem `NEXT_PUBLIC_RELATORIO_API` e
`NEXT_PUBLIC_RELATORIO_CONTATO`. Sem elas, nada muda no site.

## Testar no computador (sem dinheiro, Mercado Pago simulado)

```
cd servidor
npm run dev                      # http://localhost:8787/api/relatorio — aprova o "Pix" sozinho em 6 s
```
Em outro terminal:
```
cd web
# PowerShell:
$env:NEXT_PUBLIC_RELATORIO_API="http://localhost:8787/api/relatorio"; $env:NEXT_PUBLIC_RELATORIO_CONTATO="voce@exemplo.com"; npm run dev
```
Abra http://localhost:3000/relatorio/. Os testes automáticos: `npm test` (em `servidor/` e em `web/`).

## Publicar de verdade

1. **Mercado Pago** (conta no seu CPF): em *Suas integrações*, crie uma aplicação, pegue o **Access Token de produção**
   e cadastre uma **chave Pix** na conta. Em *Webhooks*, aponte para
   `https://ondepasso.com.br/api/relatorio/webhook`, marque o evento **Pagamentos** e copie a **assinatura secreta**.
2. **KV**: `npx wrangler kv namespace create RELATORIO` e cole o id em `wrangler.jsonc`.
3. **Segredos** (nunca no repositório):
   `npx wrangler secret put MP_TOKEN` e `npx wrangler secret put MP_SEGREDO_WEBHOOK`.
4. Confira `PRECO` e `VALIDADE` em `wrangler.jsonc` (a validade é o último dia em que os códigos funcionam).
5. `npx wrangler deploy` (a rota `ondepasso.com.br/api/relatorio/*` já está no arquivo).
6. **Site**: em `web/.env.production`, acrescente
   `NEXT_PUBLIC_RELATORIO_API=/api/relatorio`, `NEXT_PUBLIC_RELATORIO_CONTATO=<seu e-mail de atendimento>` e,
   se mudar o preço, `NEXT_PUBLIC_RELATORIO_PRECO=15,90`. Publique o site.
7. Faça uma compra real de teste e devolva pelo painel do Mercado Pago: o código deve parar de funcionar.

## Atendimento

- **Reembolso**: devolva o pagamento no painel do Mercado Pago. O aviso chega aqui e o código é desativado sozinho.
- **Código perdido**: ache o pagamento no painel do Mercado Pago pelo e-mail ou comprovante; o código está no KV,
  na chave `pag:<número do pagamento>` (`npx wrangler kv key get --binding KV "pag:123"`).
- Os registros somem sozinhos 60 dias depois da validade.

## O que fica guardado (KV)

- `pag:<id>`: token aleatório, status e o código. `cod:<código>`: id do pagamento, ativo ou não, e os
  identificadores aleatórios dos aparelhos. O e-mail **não** é guardado (vai só para o Mercado Pago).

## Rotas

`GET info` · `POST comprar {email}` · `GET status?id&token` · `POST webhook` (Mercado Pago) · `POST ativar {codigo, aparelho}`
