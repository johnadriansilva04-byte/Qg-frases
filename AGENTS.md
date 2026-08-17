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
`Database["Functions"]` estava tipado como `[_ in never]: never`. Esse padrão já
existia em `mesa.api.ts`/`useBotaoOnline.ts` e não impede o build (Vite/esbuild
ignora tipos). Para silenciar definitivamente, tipar as RPCs em
`src/integrations/supabase/types.ts` — **FEITO (commit c188adc)**: `Functions`
agora declara todas as RPCs usadas (criar/entrar/sair/iniciar campeonato,
vincular/abrir mesa campeonato, registrar_resultado, criar/entrar mesa,
registrar_jogada/gol/heartbeat, abandonar, tempo_restante, iniciar_partida,
blocos, limpar_salas). Assinaturas alinhadas ao SQL em
`supabase/migrations/futebol.sql`.

## TypeScript — correções estruturais (commit c188adc, 2026-08-17)

- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess` e
  `exactOptionalPropertyTypes` ligados. Consequências comuns:
  - `arr[i]` é `T | undefined` → sempre fazer fallback (`x || default`).
  - Props opcionais `onBack?: () => void` exigem `(() => void) | undefined`,
    não `(() => void)?` implícito.
- `botao.functions.ts` (TanStack Start `createServerFn`): handlers validados
  devem desestruturar de `ctx.data`, NÃO do `ctx` top-level:
  `.handler(async ({ data: { nome, ... } }) => ...)`. Sombrear `data` com
  `const { data } = await supabase...` dentro do handler é seguro.
- `MatchView.tsx`: `onJogadaAdversaria`/`onFimDeTurno`/`onGolAdversario` são
  **registradores de callback** `(handler: (payload) => void) => void`, não
  notificadores diretos. O pai `MesaOnlineMatch` registra o handler e depois
  invoca via `fimDeTurnoHandlerRef.current(payload)` quando o realtime entrega
  o payload.
- `BotaoGame.tsx`: `screen !== "auth"` é redundante após o early-return
  `if (screen === "auth") return ...` — TS sinaliza "no overlap". Remover a
  guarda. Para narrowing de `t: Tournament | null` em guards com optional
  chaining (`if (perfil?.user_id && t)`), extrair `const uid = perfil?.user_id`
  antes para o TS aplicar control-flow narrowing.
- `tsc --noEmit`: **0 erros** | `vite build`: OK.

## Deploy Vercel — observação importante

O script `build` é só `vite build` (não roda `tsc`). Ainda assim, o Vercel
aparentemente executa checagem de tipos e/ou falha quando `tsc` tem erros.
Após o commit `c188adc` (tsc 0 erros) enviado para `origin/main`, o Vercel
**não criou novo deployment** em ~6 min, embora pushes idênticos anteriores
(`02896bf` etc.) tenham disparado deploys em segundos. Repositório não tem
webhooks GitHub (Vercel usa GitHub App). Sintoma = integração Git do Vercel
parou de responder — exige verificação no dashboard Vercel (limite do plano
Hobby, reconexão do repo, ou branch de produção desconfigurada). Não é
problema de código: `tsc` e `vite build` passam localmente.

## Campeonato Online — RPC `abrir_mesa_campeonato` (400)

**Sintoma:** ao clicar "Jogar" num confronto do Campeonato Online, a RPC
`abrir_mesa_campeonato` retorna HTTP 400 ("nenhum confronto pendente encontrado
para voce nesta rodada") para AMBOS os jogadores, repetidamente.

**Diagnóstico (reproduzido com usuários de teste):** o confronto no JSONB estava
válido (`status='pendente'`, `rodada=rodada_atual`, `j1_id`/`j2_id` = auth.uid()
dos participantes). A versão original da função casava via cast
`(v_item->>'j1_id')::UUID = v_uid` (UUID = UUID) + indexação manual
`v_confrontos[v_i + 1]` em FOR loop. Já `entrar_campeonato_online` (que
funciona) casava via `el->>'user_id' = v_uid::TEXT` (texto = texto).

**Correção** (`supabase/migrations/20260817000000_fix_abrir_mesa_campeonato.sql`
+ espelho em `futebol_campeonato_online.sql`): reescrita set-based com
`jsonb_array_elements WITH ORDINALITY`, comparação por TEXTO
(`t.item->>'j1_id' = v_uid::TEXT`), `COALESCE(jsonb_array_length, 0)` contra
NULL, e mensagens de erro com uid/total para diagnóstico. Adicionada RPC
`debug_confronto_campeonato` que retorna o estado de cada confronto sob a ótica
do usuário (pode ser removida após estabilizar).

**Aplicação obrigatória:** como o workspace não tem `service_role` nem
`supabase` CLI, a migração NÃO é aplicada automaticamente. O usuário deve colar
o conteúdo de
`supabase/migrations/20260817000000_fix_abrir_mesa_campeonato.sql` no **SQL
Editor do Supabase** e rodar. Sem isso, o Campeonato Online continua quebrado
(não há workaround no frontend — a criação da mesa depende desta RPC).
