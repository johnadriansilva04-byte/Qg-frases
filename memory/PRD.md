# PRD — Phrase Muse / pracinha.online

## Problem Statement (original, PT-BR)
Aplicação existente (Vite + React 19 + TanStack Start + Supabase, projeto "Lovable"). Contém: gerador de frases, biblioteca, notícias, corretor, ads pessoais, cidadela de jogos com dois games (Trilha e Futebol de Botão com modos offline/torneio e online multiplayer).

O usuário pediu, em sessões sucessivas:
1. Fix do bug da 2ª rodada do torneio (CPU parado + chute interrompido no soltar).
2. **Modo Carreira** completo com storytelling, soberania escassa, manchetes estilo PS2, escolhas do treinador que afetam resultado, níveis Aprendiz→Lenda.
3. Persistência via **Supabase** (não localStorage).
4. **Carreira Online**: aplicar mesma lógica de soberania e manchetes nas partidas do multiplayer.
5. **Ranking Global**: leaderboard na cidadela com top treinadores por soberania.
6. **Cutscene de Título**: cerimônia animada com troféu e confete quando o treinador for campeão.

## Implemented (Jan 17, 2026)

### Sessão 1 — Modo Carreira + fix bug
- Fluxo Coach Setup (6 etapas storytelling) em `career/CoachSetup.tsx`.
- SovereigntyPanel, NewsFeed, ChoiceModal.
- Bug do 2º chute corrigido em `MatchView.tsx` (reset de `hasShotThisTurnRef` no turno do usuário offline; loop do `turnTimer` removido). Mesmo componente é usado no online → fix se propaga.
- SQL de migração em `/app/supabase/migrations/futebol.sql` (colunas coach_*, botao_manchetes, 4 RPCs).
- `career/careerRemote.ts` — sync com Supabase.

### Sessão 2 — Online + Leaderboard + Cerimônia
- **Carreira Online**: `OnlineMatchV3.tsx` handleFinish agora chama `aplicarResultadoRemoto(gf, ga, null)` + insere manchete "Vitória online! …" via `inserirManchetesRemotas`. Aplicado no multiplayer 1v1.
- **Leaderboard Global**: `career/LeaderboardTreinadores.tsx` renderiza top 20 treinadores em `/cidadela`. Query resiliente que usa apenas colunas base + tenta enriquecer com colunas novas (fallback silencioso se a migração ainda não rodou). Medalhas 🥇🥈🥉 para top 3.
- **TitleCeremony**: `career/TitleCeremony.tsx` com `canvas-confetti` (dep instalada via yarn `--ignore-engines`). Trigger automático quando torneio termina com `t.champion === userTeamId`. Debug: `?debug_ceremony=1`.

## Testing
- `test_reports/iteration_1.json`: 100% (5/5) — Coach Setup, Hub, bug do 2º chute, persistência.
- `test_reports/iteration_2.json`: 100% (3/3) — Leaderboard, TitleCeremony, integração Carreira Online.

## ⚠ Ação necessária do usuário
- **Rodar `/app/supabase/migrations/futebol.sql`** no Supabase de produção (ou `supabase db push`). Enquanto isso não é feito: o modo carreira **funciona 100% offline** (localStorage), o leaderboard funciona com colunas base, mas sync remoto do coach + manchetes não persiste; e ranking mostra "0 títulos" para todos (coluna `titulos_treinador` ainda não existe).

## Backlog
- **P2**: Manchetes geradas por IA (Emergent LLM Key com Claude Haiku / Gemini Flash).
- **P2**: Perfil público do treinador acessível via `/treinador/:username`.
- **P3**: PDF/print da carreira do treinador (compartilhável).
- **P3**: Sistema de conquistas / medalhas por marcos (1º título, 100 gols, etc.).
- **Dev only**: Remover `?debug_ceremony=1` trigger antes de deploy em produção (ou mantê-lo protegido em ENV).

## Tech Stack
- **Frontend**: Vite 8, React 19, TypeScript, TanStack Start Router, Tailwind 4, shadcn/ui, canvas-confetti.
- **Backend**: Supabase (Postgres + Auth + Realtime + RLS + RPC + pg_cron).
- **Rodando via**: supervisor `frontend` → `yarn start` em `/app/frontend/package.json` → `npx vite dev --port 3000 --host 0.0.0.0`.
