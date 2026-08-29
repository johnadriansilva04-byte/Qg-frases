# Pracinha — Futebol de Botão + Cidadela

Jogo web de futebol de botão com modo carreira de treinador, economia SOV
(Banco Central com livro-caixa), RPG de personagens no celular, bolsa de
valores, mercado de clubes e a Cidadela (RPG por profissões).

- **Stack**: React + TypeScript + TanStack Start (Vite/Nitro) + Supabase
  (Auth, Postgres, RPCs).
- **Produção**: https://pracinha.online
- **Conhecimento operacional acumulado**: ver `AGENTS.md` (leia antes de
  mexer em economia/persistência).
- Documento legado do gerador de frases (origem do repo):
  `README-FRASES-LEGADO.md`.

## Conta E2E oficial do projeto

Existe **uma única conta E2E oficial** deste projeto. Ela foi criada pelo
OpenHands durante o desenvolvimento e deve ser usada por QUALQUER agente/IA
que baixar o projeto e precisar testar o jogo — **não crie outra conta**.

| Campo | Valor |
| --- | --- |
| E-mail | `openhands.rookie.e2e@gmail.com` |
| Senha | `Rookie#2026!E2E` |
| Treinador | **Rookie** |
| Clube | **Rookie FC** |
| Sigla | **RFC** |

São credenciais fictícias/de teste criadas exclusivamente para este jogo
(não servem para nenhum outro serviço).

Fluxo esperado de qualquer agente:

1. Baixa o projeto → lê este README → entra com a conta acima.
2. Continua a jornada E2E de onde ela estiver (nunca reinicia, nunca cria
   conta nova).
3. Joga como um jogador normal: sem SQL, sem backfill, sem criar SOV, sem
   atalhos administrativos. Nunca ultrapassar os 200.000 SOV do universo.

Outras contas antigas criadas por engano (`open.rangers.*`, `robo.doidao.*`,
`japasport@`, `john@`) **não** fazem parte do E2E — o dono do projeto as
apaga manualmente. Se outro agente/IA precisar de identidade própria no
jogo (não para o E2E), aí sim ele cria a própria conta pública de jogador
com identidade distinta (treinador ≠ clube, nomes curtos).

## Rodando localmente

```bash
npm install
npm run build        # gera .vercel/output (preset nitro/vercel)
npx vite preview     # ou sirva .vercel/output/static
```

Variáveis de ambiente necessárias: ver `.env.example`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_PUBLISHABLE_KEY`).
Sem elas o jogo roda offline, mas sem login/economia.

## Migrations (Supabase)

Aplicadas **manualmente** no SQL Editor, na ordem de
`supabase/migrations/README.md`. Não há CLI/service-role no workspace.

## Testes

```bash
./node_modules/.bin/tsc --noEmit                      # tipos
npm run build                                          # build de produção
JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti <teste.mts>   # engines puros
node testes/<estrutural>.test.mjs                      # guardas estruturais
```
