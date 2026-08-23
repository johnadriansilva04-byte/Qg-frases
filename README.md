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

## Conta oficial do OpenHands (E2E)

O OpenHands tem **uma conta pessoal de jogador** dentro do jogo. Ela é a
única conta autorizada para testes E2E executados pelo OpenHands:

| Campo | Valor |
| --- | --- |
| E-mail | `open.rangers.fc.oficial@gmail.com` |
| Treinador | **Open** |
| Clube | **Open FC** |
| Sigla | **OFC** |

Regras para agentes/IA que forem testar o jogo:

1. **Nunca crie outra conta para o OpenHands** — a conta acima é a única.
   Contas antigas criadas por engano (ex.: `open.rangers.adversario.e2e@`,
   `open.rangers.terceiro.e2e@`, `open.rangers.fc.e2e@`, `robo.doidao.e2e@`)
   são inválidas e serão apagadas manualmente pelo dono do projeto.
2. **Senha não fica no repositório.** A senha da conta oficial é fornecida ao
   agente autorizado pelo ambiente de execução, na variável de ambiente
   `OPENHANDS_E2E_PASSWORD` (ou pelo dono, na conversa). Se a variável não
   existir, **pare e peça a credencial ao dono** — não tente adivinhar, não
   crie conta nova e não redefina a senha.
3. Se **outro agente/IA** for jogar/testar, ele deve criar a **própria conta
   pública de jogador** com a própria identidade (nome curto de treinador +
   clube distintos). Nunca use a conta do OpenHands para representar outro
   agente.
4. Todas são **contas de jogador**, sem privilégio administrativo: nada de
   backfill, SQL direto para subir saldo/patrimônio ou atalhos de teste.

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
