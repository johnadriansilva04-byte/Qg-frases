# PRD — Phrase Muse / pracinha.online

## Problem Statement (original, PT-BR)
Aplicação existente (Vite + React 19 + TanStack Start + Supabase, projeto "Lovable"). Contém: gerador de frases, biblioteca, notícias, corretor, ads pessoais, cidadela de jogos com dois games (Trilha e Futebol de Botão com modos offline/torneio e online multiplayer).

Nesta sessão o usuário pediu:
1. Transformar o torneio do Futebol de Botão em um **modo carreira** completo, interativo, com storytelling, pontos de soberania escassos, notícias entre rodadas (estilo PS2), moral do time, escolhas do treinador que impactam resultados, e níveis de treinador.
2. **Corrigir o bug**: a partir da 2ª rodada do torneio o CPU não jogava e o chute do usuário era interrompido no soltar.
3. Replicar tudo também no modo online.
4. **Não** tocar em `physics.ts` nem `engine/ai.ts` (lógica pura do jogo).
5. Persistência via **Supabase** (não localStorage).

## Implemented (Jan 17, 2026)
- Fluxo Coach Setup (6 etapas storytelling): `career/CoachSetup.tsx`.
- SovereigntyPanel, NewsFeed, ChoiceModal com data-testids.
- Bug do 2º chute corrigido em `components/MatchView.tsx` (reset de `hasShotThisTurnRef` no turno do usuário offline; loop do `turnTimer` removido). Se aplica também ao modo online (mesmo componente).
- SQL de migração adicionado em `/app/supabase/migrations/futebol.sql`:
  - ALTER TABLE `botao_usuarios` com colunas coach_*, moral_time, bonus_proxima_partida, evento_pendente_id, ultimas_escolhas, dificuldade_atual, titulos_treinador, campanhas_jogadas.
  - Nova tabela `botao_manchetes` com RLS por dono.
  - RPCs `iniciar_campanha`, `aplicar_resultado_carreira`, `aplicar_fim_de_campanha`, `aplicar_escolha_treinador`.
- `career/careerRemote.ts`: sync com Supabase (load/save + RPCs).
- `BotaoGame.tsx`: persist híbrido (local + remoto quando logado); useEffect que hidrata carreira ao logar.

## Testing
- iteration_1.json: 100% aprovado, 5/5 cenários (Coach Setup, Hub, bug do 2º chute, persistência).

## Backlog / Não implementado ainda
- **P0 (usuário deve executar)**: Aplicar a migração SQL nova no Supabase de produção (rodar o `futebol.sql` atualizado ou `supabase db push`).
- **P1**: Chamar `aplicar_resultado_carreira` também quando a partida for online.
- **P2**: Leaderboard global de treinadores por soberania.
- **P2**: Manchetes geradas por IA (Emergent LLM Key).
- **P2**: Cutscenes fim de campanha.
- **P3**: PDF/print da carreira compartilhável.

## Tech Stack
- **Frontend**: Vite 8, React 19, TypeScript, TanStack Start Router, Tailwind 4, shadcn/ui.
- **Backend**: Supabase (Postgres + Auth + Realtime + RLS + RPC + pg_cron).
- **Rodando via**: supervisor `frontend` → `yarn start` em `/app/frontend/package.json` → `npx vite dev --port 3000 --host 0.0.0.0`.
