<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Módulo Online (Futebol de Botão) — como funciona

O modo Online foi liberado (sem telas de "Em breve"). Há dois modos:

- **Amistoso Online** (`screen="online"` -> `OnlineMatchV3`): cria/entra numa
  `mesas_futebol` e joga em tempo real via `MesaRealtime`.
- **Campeonato Online** (`screen="online-championship"` -> `OnlineChampionship`):
  sala round-robin com até 8 jogadores; cada confronto vira uma mesa.

### Camada de dados (Supabase)
- Tabelas: `mesas_futebol` (colunas `modalidade`, `campeonato_id`) e
  `botao_campeonatos_online`. Schema em
  `supabase/migrations/futebol_campeonato_online.sql` (após `futebol.sql`).
- RPCs de campeonato: `criar/entrar/sair/iniciar_campeonato_online`,
  `vincular_mesa_campeonato`, `registrar_resultado_campeonato`.
- Frontend: `src/lib/multiplayer/campeonato.api.ts` e `mesa.api.ts`.
- `MesaRealtime` ganhou `trocarTurno()` e `finalizarPartida()`.

### Componentes
- `components/botao/components/MesaOnlineMatch.tsx`: wrapper reutilizável da
  partida online (placar/turno/cronômetro/início/fim). Emite `onFinalizada`
  com `{ vencedorId, golsJ1, golsJ2, empate }`.
- `OnlineMatchV3` e `OnlineChampionship` usam `MesaOnlineMatch`. Ao finalizar,
  o perfil é recarregado para refletir soberania/ranking (RPCs autoritativas).

### Observação de tipos
As chamadas `.rpc("...")` geram erros `TS2345 ... 'never'` porque
`Database["Functions"]` está tipado como `[_ in never]: never`. Esse padrão já
existia em `mesa.api.ts`/`useBotaoOnline.ts` e não impede o build (Vite/esbuild
ignora tipos). Para silenciar definitivamente, tipar as RPCs em
`src/integrations/supabase/types.ts`.
