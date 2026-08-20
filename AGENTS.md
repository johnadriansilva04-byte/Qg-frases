## Auditoria integral do Modo Carreira (2026-08-20, 2ª passada)

- **Ritual da Trilha é notificação do celular, não card**: `CareerHub` NÃO tem
  mais card da Trilha nem `PainelMundo` (o elemento azul "Crise Financeira na
  Cidadela" — world state global — ficou exclusivo da rota /cidadela). O
  convite chega via `convidarRitualTrilha(career)` (trilhaIntegracao.ts) como
  `ConversaCelular` do NPC **Pracinha** (`npc-pracinha`, novo personagem em
  rpg/personagens.ts + 4º contato-base em `garantirContatosRpg`), com
  `ConversaCelular.linkExterno` {rotulo,to} renderizado no CelularConversas.
  Idempotência por rodada: id determinístico `ritual-trilha-{temporada}-r{rodada}`.
  Gatilhos: hidratação da campanha + fim de cada partida da liga.
- **Navegação**: o Futebol de Botão NUNCA abre a Carreira automaticamente —
  `hidratarCampanha` sempre restaura o estado e volta ao `menu` (antes: ia ao
  `hub` quando a campanha estava ativa). CareerMenu → "Continuar Campanha" → hub.
- **Persistência real**: `careerStorage.normalizarCareer(bruta)` saneia o JSONB
  (conversas/headlines/ultimasEscolhas/feedCidadela arrays, divisao válida,
  clamps de moral/soberania) — aplicado em `loadCareerFromSupabase`. Sem isso,
  carreiras antigas quebravam o celular e o CareerMenu (divisao null).
  Mensagens IA pós-jogo agora passam por `persistCareer` (antes: setCareer sem
  persist → sumiam no refresh e corrompiam o snapshot). `garantirContatosRpg`
  roda também na hidratação (contatos existiam só no cadastro do técnico, por
  isso o celular de carreiras antigas abria vazio).
- **Classificação Completa é tela própria**: screen `classificacao` +
  `career/ClassificacaoScreen.tsx` (menu esquerdo: Classificação, Artilheiros,
  Menos gols sofridos, Maiores goleadas, Copa do Brasil; painel direito com
  tabs de divisão; dados reais via sortTable/groupFixtures). `ZoneLegend` passou
  a morar nela. `ChampionshipModule.tsx` e `StatsModule.tsx` foram REMOVIDOS.
- **Bug de reexecução pós-anúncio**: fluxo único — ControlledMonetagButton
  (confirm modal) → Monetag (portão one-shot) → abre entrevista ONCE por
  partida. `MatchEndData.partidaId` único por partida; BotaoGame guarda
  `patrocinioPagoPartida` (estado) e `concluirPatrocinio` é idempotente
  (recompensa paga 1x). `adClickGuard` agora chama `cancelarAutorizacao()` no
  retorno (visibilitychange=visible + pageshow) — a volta do anúncio nunca
  reexecuta a ação anterior. MatchEndScreen sem o passo "Liberar Entrevista".
- **Contrato front↔back real**: RPC `registrar_transacao_soberania` retorna
  `TABLE(balance)` — `registrarTransacaoSov` (sovApi) estava esperando number
  plano e caía sempre em fallback; agora aceita array `[{balance}]`. Nenhuma
  tabela/coluna/RPC nova foi necessária (schema já cobre o fluxo).
- **Rótulos**: "Sovereign"/"sovereign" em UI virou "Soberania" (Portuguese UI) —
  MatchEndScreen, CareerMenu, SovereigntyPanel, SeasonHub, SeasonTransition,
  TitleCeremony, ProfileSetup, LeaderboardTreinadores, OnlineMatchV3, SeoContent,
  CidadelaIntro, /cidadela. Campos do DB (`pontos_soberania`, `user_wallets`)
  já estavam corretos. Nomes internos do Banco Central (`SovereignBank` em
  src/lib/financial) permanecem (proper noun do módulo legado, fora de UI).
- **Verificação**: engines testados runtime com jiti (convite idempotente por
  rodada, 4 contatos-base, normalização com dados ruins). `tsc --noEmit` 0 erros,
  `npm run build` OK.

## Modo Carreira integrado ao Campus — nomenclatura e audição (2026-08-20)

- **Nomenclatura**: "Estádio do Campus" (header/menu principal do BotaoGame),
  "Carreira no Campus" (MenuCard principal, CareerMenu, CoachSetup) e
  "Campeonato do Campus" (subtítulo/módulo/loading). Rótulos visíveis usam
  "Soberania" (pt-br); v. nota de 2026-08-20 (2ª passada).
- **CareerHub**: NÃO integra mais `PainelMundo` (removido junto com o card do
  Ritual — v. nota mais recente). Classificação resumida (top 5) abre a tela
  dedicada `ClassificacaoScreen`. Copa do Brasil tab visível em todas as
  divisões (era gated em série-a — bug legado do módulo antigo).
- **Auditoria RPG/celular (jiti)**: engines puros testados runtime —
  `garantirContatosRpg` (4 contatos iniciais: Valéria, Dona Cida, Zé, Pracinha),
  `processarEventosRpg` (gatilhos + espaçamento de 3 rodadas),
  `aplicarEscolhaRpg`, narrativa dinâmica (fecha em <=3 avanços), suborno,
  patrocinador (`cumpriuDesafio(desafio, golsPro, golsContra)`), choicesEngine
  (`sortearEvento(idsUsados: string[])`). Cadeia no BotaoGame:
  `atualizarSequenciaRpg` → `anexarPost` (Rede) → `processarEventosRpg` →
  `convidarRitualTrilha` → `preparaEscolha` → `aplicarDesafioPatrocinador` a
  cada partida; `handleEnviarMensagem` → `responderContatoNpc`;
  `handleEscolhaRpg` → SOV ledger + cartório link.
- **Aviso ambiental**: `vite dev` no proxy do work-host quebra a hidratação
  do entry `@tanstack/react-start` (SSR via curl funciona) — auditar UI por
  curl/jiti ou no dashboard Vercel. `tsc --noEmit` 0 erros, `npm run build` OK.
- **Fix extrínseco**: `src/routes/campus.tsx` tinha erro de tipo pré-existente
  (`section.disabled` não tipado) — declarado tipo com `disabled?: boolean`.

## Soberania unificada com Banco Central SOV + Cartório — 2026-08-19

- **Fonte de verdade da soberania**: `user_wallets.balance` (SOV) via `bank_ledger`.
  `botao_usuarios.pontos_soberania` virou cache/backup. API unificada em
  `src/lib/financial/sovApi.ts`: `obterSaldoSov`, `registrarTransacaoSov`,
  `historicoTransacoesSov`, `garantirCarteira` (chamada no primeiro login em
  `useBotaoAuth`). Source modules: 'career', 'rpg', 'online', 'market'.
- **Todos os pontos de mutação de soberania** registram no ledger:
  storage.ts (liga, online, vídeo/reward), careerRemote.ts (resultado, bônus de
  posição de fim de temporada, apostas online), BotaoGame (desafio de
  patrocinador amistoso/carreira, Copa do Brasil, narrativa dinâmica, suborno,
  choice events com impactoFinanceiro/penaltyPontos, Ritual da Trilha — este
  último usa `perfilRef` pois roda dentro de useEffect com deps vazias).
  Escolhas RPG (`handleEscolhaRpg`) usam source 'rpg' com metadata
  {eventoId, escolhaIdx, npcId}.
- **NUNCA reintroduzir** delta local de soberania no bloco de carreira de
  `finishTournamentMatch` — `aplicarResultadoRemoto` já devolve o saldo
  autoritativo do ledger; somar localmente causava double-count.
- **Cartório** (`src/components/botao/cartorio/` + `career/rpg/cartorioApi.ts`):
  3 eventos RPG (`contrato-pendente`, `peticao-necessaria`, `multa-judicial`)
  com efeito `cartorio` na `EscolhaRpg` criam pedido em `cartorio_pedidos`
  (RPC `criar_pedido_cartorio`) e anexam `linkCartorio` na conversa do celular
  (renderizado como Link em `CelularConversas`). Biblioteca abre o formulário
  via query params `?acao=contrato|peticao|multa&pedidoId=...`
  (`validateSearch` em `routes/biblioteca.tsx`). IA Bibliotecária
  (`SYSTEM_PROMPT_BIBLIOTECARIA` em `cartorioTypes.ts`) gera o documento salvo
  em `cartorio_documentos` (RPC `salvar_documento_cartorio`) e o pedido é
  concluído (`concluir_pedido_cartorio`).
- **SQL**: `supabase/migrations/sov_integracao_cartorio.sql` — RPCs
  `registrar_transacao_soberania`, `obter_saldo_soberania`,
  `historico_transacoes` + tabelas/RPCs do cartório. Depende de
  `sov_financial_system.sql` (create_or_update_wallet/record_transaction).
  Aplicação manual via SQL Editor.
- **Ads**: `adManager.ts` aceita `VITE_ADSTERRA_INVOKE_URL` (override do invoke
  URL), `getAdsterraSrc()`, `loadMonetagOnDemand()`, diagnóstico exposto em
  `window.adManager`. `AdsterraBanner` no branch passivo agora realmente injeta
  o script (antes só reservava espaço — bug que impedia os banners de
  aparecer). Monetag on-click SÓ em botões com aviso (`ControlledMonetagButton`):
  dentro do celular (tela principal), na classificação e na nova tela de fim
  de jogo.
- **Tela de fim de jogo** (`components/MatchEndScreen.tsx`, `MatchEndData`):
  placar, resultado, gols, Δsoberania/Δmoral, posição na tabela, "extra"
  (campeão), botão Continuar + bloco "Patrocínio" (Adsterra + Monetag).
  `BotaoGame` mantém `matchEnd`/`matchEndDestino` e a renderiza após
  amistoso/liga/copa (liga captura `patchSob/patchMoral/posTabela` no bloco de
  carreira).
- **Teste runtime**: módulos RPG testáveis com
  `JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti <teste.mts>` (jiti resolve
  o alias `@/` do tsconfig). `selecionarEvento` NÃO é exportado do rpgEngine —
  testar via `processarEventosRpg`/`aplicarEscolhaRpg`. Stub mínimo de career
  precisa de `headlines: []` e `memoriaRpg: null`.

## Reconstrução da Carreira Infinita (Futebol de Botão) — 2026-08-18

- Base canônica de times em `src/components/botao/data/teams.ts`: 60 clubes ficcionais, IDs únicos/persistentes, 20 por divisão (A=88..71, B=71..48, C=48..28). Reuse esses IDs — evita conflitos e sobrescrição na base.
- `career/seasonEngine.ts` gera 3 ligas por temporada usando o pool completo. A liga ativa do usuário usa os 19 NPCs divisão + usuário. Nunca derivar campeão com colchete sem nullable.
- Copa do Brasil usa pool de 15 NPCs das três divisões + usuário; não há bloqueio por Série A na rodada-gatilho.
- `career/careerRemote.ts` agora usa persistência híbrida: snapshot em `progresso_caminpanha` + histórico relacional pelas RPCs `registrar_temporada_carreira`, `registrar_partida_carreira`, `finalizar_temporada_carreira`, `registrar_evento_carreira`. TODAS falham silenciosamente para carreiras antigas.
- `supabase/migrations/futebol.sql` adiciona `forca`/`divisao` em `botao_times`, 60 seeds e tabelas `botao_temporadas_carreira`, `botao_partidas_carreira`, `botao_tabelas_carreira`, `botao_eventos_carreira`. Aplique manualmente via SQL Editor (sem CLI/service-role).
- `AIContext` agora aceita `divisao`, `temporada`, `competicaoNome`, `moralTime`, `soberania`, `posicaoTabela`, `rodadasRestantes`, `decisaoPendente`. `AIService`/`templateEngine` preenchem esses placeholders (`{divisao}`, `{temporada}`, `{posicao}`, `{moral}`, `{soberania}`, `{restantes}`, `{pendencia}`).
- `atualizar_perfil_clube` deve ter 7 parâmetros (sem `p_escudo`) — remover `p_escudo` do frontend/types evita falha de produção.

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

## Setup Supabase sem mock — 2026-08-18
- `src/integrations/supabase/client.ts` é env-driven (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_PUBLISHABLE_KEY`; SSR aceita sem
  `VITE_`) e **não usa mock**. Se faltar config, `isSupabaseConfigured()` é
  false, `getSupabaseConfigError()` explica e qualquer uso do proxy `supabase`
  lança erro limpo.
- `useBotaoAuth` depende do evento `INITIAL_SESSION` de `onAuthStateChange`
  (não chamar `getUser()` antes, pois isso causava loading infinito).
- `entrar()` deve retornar o perfil (`Promise<Perfil | null>`). Tela login
  precisa chamar `onPronto(perfil)`; `onPronto(undefined)` é reservado para
  logout/exclusão de conta.
- `/cidadela` lê `localStorage` só no cliente (`hydrated` gate) para evitar
  erro SSR/hidratação. `vite dev` atrás do proxy do work-host pode falhar no
  entry `@tanstack/react-start` (ambiental); validar com curl ou build.
- Validação atual: `tsc --noEmit` 0 erros; `npm run build` OK (preset Nitro
  `vercel`; ESLint global ainda tem dívidas Prettier em arquivos antigos não
  tocados).


## Sistema de IA Centralizada (AIService) — 2026-08-18

Arquitetura da "Comentarista Sarcástica" (voz do jogo), on-device + fallback
procedural. Custo ZERO de API.

### Módulos (`src/components/botao/ai/`)
- `AIService.ts`: fachada singleton `AIService.generateText(ctx, promptType)`.
  Detecta hardware; se `potente` e a lib `webllm` estiver disponível, usa IA
  local (SmolLM2-360M/Qwen2.5-0.5B). Senão, cai em `gerarTemplate` (procedural).
  `AIService.init()` pré-aquece o veredito de hardware. Estrutura modular/
  expansível para outros modos.
- `hardwareDetect.ts`: `detectarHardware()`/`vereditoHardware()` testam
  `navigator.deviceMemory`, `hardwareConcurrency` e WebGPU (`gpu` no adapter).
  Veredito: `"potente"` (≥4 cores, ≥4GB, WebGPU) | `"fraco"`.
- `templateEngine.ts`: `gerarTemplate(promptType, ctx)` — busca frases em
  `botao_frases_ia` (Supabase, cacheado) e preenche placeholders `{T},{coach},
  {W},{L},{gH},{gA},{diff}`. Fallback local se a tabela estiver vazia/offline.
- `aiContent.ts`: `coletivaPosJogo`, `relatorioMedico`, `redesSociaisRodada`,
  `bundlePosJogo` — reaproveitam o AIService (item 8 do spec: coletiva, médico,
  redes sociais). Disparados no `finishTournamentMatch` (fire-and-forget) e
  anexados como `ConversaCelular` (tipo `"medico"`/`"evento"`).
- `types.ts`: `PromptType` (`comentarista|coletiva|medico|redes_sociais|noticia`),
  `AIContext` (todos os campos `| undefined` por `exactOptionalPropertyTypes`),
  `SYSTEM_PROMPT_COMENTARISTA`.

### SQL (`supabase/migrations/futebol.sql`)
- Tabela `botao_frases_ia` (prompt_type, categoria, template_text, ativo, ordem)
  com unique index `(prompt_type, categoria, ordem)` para seed idempotente
  (`ON CONFLICT (...) DO NOTHING`). RLS read-all (anon+authenticated). Seed com
  ~20 frases sarcásticas. **Aplicação obrigatória pelo usuário no SQL Editor.**

### Pacote opcional `webllm`
- NÃO é dependência obrigatória. Importado dinamicamente com especificador em
  variável + `/* @vite-ignore */` (`const modName="webllm"; import(modName)`),
  para o bundler (rolldown/vite) não tentar resolver estaticamente e quebrar o
  build. Declaração de ambiente em `src/types/webllm.d.ts` silencia o tsc.
  Se ausente em runtime → catch → fallback procedural. **Zero Crash Guarantee.**

### Tipos Supabase (`src/integrations/supabase/types.ts`)
- Adicionada tabela `botao_frases_ia` (Row/Insert/Update) ao `Database.Tables`.

## Splash/Loading + Portal de Notícias — 2026-08-18
- `LoadingScreen.tsx`: overlay 100% CSS/JS, zero imagens. Barra 0→100%
  (easeOutCubic), `%` animado, textos introdutórios/dicas REAIS rotativos
  (soberania, celular, W.O., portal). Props `passos`/`intros`/`duracao`/
  `onCompleto`. Integrado no `BotaoGame` via estado `loading` + `runWithLoading`
  (início de carreira, entrada em campo). Renderizado no Shell.
- `NewsPortal.tsx`: carrossel continuous-loop (avança a cada 3.5s), mescla
  `headlines` reais da carreira + notícias IA geradas via `AIService` (noticia).
  Substituiu o bloco estático "Últimas Notícias" no Hub.

## Hotfixes UI/UX — 2026-08-18
- `CareerMenu`: opção "Nova Carreira" (Plus icon) além de "Carregar".
  Prop `onNewCareer` → `handleNewCareer` no BotaoGame. Props alinhadas
  (`onSaveCampaign` — antes `onSaveCareer` causava mismatch).
- `Screen` type: adicionados `"career-menu"` e `"celular-conversas"`.
- Bug do celular: removida mensagem automática padrão que travava a tela;
  `CelularConversas` robusto (guards, conversa virtual de patrocinador,
  inicia limpo — só notificações de eventos reais).

## Economia & Regras — 2026-08-18
- `POINTS`: V=+3, E=+1, D=0. `bonusCampeao(dificuldade)` → 100-200 Soberania.
  `careerRemote.computeSovereigntyDelta` D=0; `aplicarFimCampanhaRemoto`
  bonusPos 100-200.
- Promoção/rebaixamento por divisão: Série C (2 sobem), Série B (2 sobem/2
  caem), Série A (rebaixa últimos, vagas Copa/Libertadores).
- Calendário unificado (`CalendarView`): mescla Brasileirão + Copa do Brasil
  numa linha do tempo (`COPA_RODADAS_GATILHO`).
- Tabela: colunas P J V E D GP GC SG.
- AdSense no intervalo (`MatchView`): estado `halftime` + overlay `AdSlot` no
  meio das jogadas (container formato TV, classes `halftime-tv-*`).
- Sanções: `Choice` com `wo`/`desfalqueBotao`/`perdaPontos`/`impactoFinanceiro`;
  `CareerState` com `woProximaPartida`/`desfalqueBotaoProxima`/
  `perdaPontosProxima` (reset em nova carreira/fim de partida).

## TypeScript — verificação (2026-08-18)
- `tsc --noEmit`: 0 erros fora do módulo `trilha` (que tem 10 erros
  pré-existentes: tabelas/RPCs `mesas_trilha` não tipadas no Supabase —
  independentes desta tarefa). `vite build`: OK.


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

## Modo Carreira — refatoração UI/UX + correções (2026-08-18)

### Fundação
- `CareerState` em `types.ts` ganhou `Divisao = "serie-a" | "serie-b" | "serie-c"` e
  campo `divisao: Divisao | null`. Imports mortos de `seasonApi`/`seasonTypes`
  removidos de `BotaoGame.tsx`. `tsc --noEmit` 0 erros.

### Camada de competições (`career/competitionApi.ts` — NOVO)
- `resolveTeam(teamId, userTeam)`: devolve `userTeam` só quando `teamId === userTeam.id`,
  senão `teamByIdSync(teamId)`. **Corrige o bug "FB vs FB"** — antes o `getTeam` do
  `ChampionshipModule` retornava sempre `userTeam` para qualquer id.
- `calcularStats(tour, userTeam)`: estatísticas REAIS derivadas da tabela e partidas
  disputadas (artilheiro = maior `gp`, goleiro = menor `gc`, maior goleada = maior
  diff em `groupFixtures` jogados). Usa `for...of` (não `forEach`) para o TS acompanhar
  o narrowing do acumulador mutável.
- `gerarCopaBrasil(userTeam, difficulty)`: mata-mata de 16 times. 2ª fase definida,
  fases seguintes como confrontos TBD (placeholders) que se resolvem ao avançar.
  Rounds ganham rótulos em `COPA_BRASIL_STAGES` para o calendário.
- `dataDaRodada(indice)`: data simbólica (hoje + indice×7 dias) p/ o calendário.
- `DIVISAO_LABEL`/`DIVISAO_SHORT`: mapas `Record<Divisao, string>`.

### Navegação de campeonatos (`ChampionshipModule.tsx`)
- Submenu funcional: **Copa do Brasil** | **Brasileirão**.
- Ao selecionar Brasileirão, abre sub-toggle Série A/B/C (default = divisão do
  usuário, marcada com badge "você"). Estatísticas centralizadas no `StatsModule`.

### Estatísticas centralizadas (`StatsModule.tsx` — estilo PS2)
- Painel único (`stats-panel`) com 3 módulos/cards distintos: Artilharia,
  Defesa menos vazada, Maior goleada. Acento de cor por divisão
  (`DIVISAO_ACCENT` — emerald/sky/fuchsia). Props: `{ title, stats, divisao }`.

### Calendário (`CalendarView.tsx`)
- Filtro de competição (Brasileirão | Copa do Brasil). Mostra rodadas da liga
  + rounds da Copa do Brasil com datas. Props: `{ tour, userTeam, currentDivisao, copaBrasil }`.

### Decisões do jogo → celular/chat em 1ª pessoa
- `playNext` agora roteia decisões pendentes para a tela `celular` (não mais
  narração bloqueante "⚠ Decisão pendente"). Tela `celular` (NOVA em `Screen`) é
  inbox unificado: prioriza `eventoPendente` (chat), senão mostra `suborno`.
- `ChoiceModal.tsx` reescrito como chat de celular (phone-frame, bolhas, avatar
  do remetente). `SENDER` mapeia cada `ChoiceEvent.id` a um remetente/cargo.
- `choicesEngine.ts`: descrições reescritas em **1ª pessoa** diretas ao treinador
  ("Treinador, aqui é o Dr. Maurício..."), nunca mais narração em 3ª pessoa.
- Tela antiga `choice` removida (superseded pela `celular`). Tela `suborno`
  mantida como fallback.

### UI/UX premium (`styles.css` — design system novo)
- Classes: `next-match-card`, `celular-card`, `comp-tab`/`div-tab`, `stats-panel`/
  `stat-card` (gold/green/flame), `zone-row` (libertadores/copa-brasil/rebaixamento),
  `phone-frame`/`phone-bubble`/`phone-reply`, `cal-rodada`/`cal-jogo`,
  `copa-phase-chip`, `menu-card` (accents gold/sky/emerald/fuchsia/amber),
  `sovereignty-panel`/`stat-tile`. Usa `color-mix(in oklab, ...)` e `oklch()`.
- `Hub` reescrito: 2 colunas (`lg:grid-cols-[1fr_1.1fr]`) sem blocos vazios;
  stats duplicadas removidas (centralizadas no `ChampionshipModule`).
- `MenuCard` ganhou prop `accent` e barras de cor laterais. `SovereigntyPanel`
  redesenhado como hero com tiles e barra de progresso.

### Verificação
- `tsc --noEmit` → 0 erros. `vite build` → OK.
- O `vite dev` sob o proxy do work-host exibe erro de hidratação do
  `@tanstack/react-start/.../client.tsx` — **ambiental, não relacionado ao código**
  (não ocorre no build de produção). Verificar no dashboard Vercel.

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

## Modo Carreira (single-player) — arquitetura (2026-08-18)

Reatoração completa do modo carreira com sistema narrativo dinâmico (suspense/
drama em 1ª pessoa via celular), economia de Soberania e temporada infinita.

### Núcleo
- `career/types.ts`: `CareerState` com `bonusProximaPartida`,
  `penaltiesProximaPartida`, `moralTime`, `narrativa`, `suborno`, `copaBrasil`,
  `temporada`, `divisao`, `rodadasDesdeEventoNarrativo`, `vereditoTemporada`.
  Props opcionais tipadas como `| undefined` (necessário por
  `exactOptionalPropertyTypes`).
- `career/competitionApi.ts`: `calcularStats()` (artilheiro/goleiro/
  maiorGoleada reais da tabela), `CopaBrasilState` com chaveamento de 16 times
  (4 fases: Oitavas/Quartas/Semifinal/Final), `COPA_RODADAS_GATILHO=[4,9,14,18]`,
  `avaliarFimTemporada`/`iniciarNovaTemporada` (custo de manutenção por divisão),
  `CUSTO_MANUTENCAO` (serie-a=120, serie-b=80, serie-c=50).
- `career/narrativeEngine.ts`: gera histórias com persona × gancho × reviravolta.
  `gerarNarrativa` → `cenaDaNarrativa` → `avancarNarrativa`. Arco de 2 cenas
  (raiz → desfecho). Final cenas têm `final: true` + `desfecho`.
- `career/NarrativeModal.tsx`: UI de chat no celular. Cenas finais exibem um
  botão "Concluir" sintético (`id:"concluir"`, sem `proximoId`, com `desfecho`)
  que dispara `avancarNarrativa` retornando `finalizado=true` + registra headline.
- `career/SeasonTransition.tsx`: veredito de fim de temporada (continua/falência).
- Persistência do torneio/carreira: todo patch de `progresso_caminpanha` deve
  passar por `mergeProgressInSupabase` (`storage.ts`), que serializa escritas por
  usuário e preserva chaves (`career`, `tournament`, gols). Não fazer update do
  JSONB inteiro — isso apagava a carreira/torneio em chamadas concorrentes.
- `BotaoGame.hidratarCampanha` carrega progresso + torneio + career do Supabase
  uma vez por usuário (auto-login e login manual). Se remoto vazio, preserva o
  save local e o envia ao Supabase. `persistTournament(null)` remove também o
  localStorage para não voltar um torneio antigo.

### Fluxo do BotaoGame
- `preparaEscolha`: prioridade suborno > narrativa > choice event.
- `playNext`: suborno/narrativa/evento → tela `celular`; copa → `copa-match`;
  senão liga → `tournament-match`.
- `aplicarNarrativa`: avança cena, aplica efeitos (bonusPoder/moral/soberania),
  registra headline se finalizado, zera `cenaAtual`.
- `finishCopaMatch`: `advanceCopaBrasil` + define `rodadaGatilhoConsumida`.
- `finishTournamentMatch`: fim da liga → `avaliarFimTemporada` → `setVeredito`.
- `userTeam.power`: 75 + bonusProximaPartida - penaltiesProximaPartida (40-99).

### Bug crítico corrigido (não reintroduzir)
- `GANCHOS_BASTIDORES`/`GANCHOS_TRAICAO`/`GANCHOS_MIDIA` DEVEM ter 5 entradas
  cada (índice acessado via `ganchoIdx % 5`). Quando tinham só 4, `idx=4` →
  `mensagemRaiz` undefined → `fillTemplate(tpl=undefined)` quebrava o jogo.
- `CopaBrasilState.rodadaGatilhoConsumida`: obrigatório para evitar que a
  próxima fase da copa dispare na MESMA rodada-gatilho (sem avançar a liga).

### Testes de runtime (Node 22 `--experimental-strip-types`)
- `narrativeEngine.ts` é testável isoladamente (sem imports com alias `@/`).
- `competitionApi.ts` NÃO é executável em Node puro (importa `@/lib/times.functions`
  via `data/teams.ts`) — validar por `tsc` + revisão manual.

## Módulo de Login/Conta (PS2-style) — 2026-08-18

Reatoração do login num módulo estável na tela principal, com personalização de
time/botões/tática no estilo PS2. Tudo persistido no Supabase (`futebol.sql`).

### SQL (`supabase/migrations/futebol.sql`)
- Colunas aditivas em `botao_usuarios` (idempotentes, `ADD COLUMN IF NOT EXISTS`):
  - `tatica TEXT NOT NULL DEFAULT '1-2-2'` com CHECK em
    `('1-2-2','1-3-1','1-1-3','1-2-1-1','2-2-1')`.
  - `botoes_nomes JSONB NOT NULL DEFAULT [...]` com constraint
    `check_botoes_nomes` (array de 5).
- RPC `atualizar_perfil_clube(p_uid, p_nome, p_time, p_abreviacao, p_cores,
  p_tatica, p_botoes)`: SECURITY DEFINER, valida `auth.uid() = p_uid`. Atualiza
  nome/time/sigla/cores/tática/botões com COALESCE (só altera o que vier não-null).
- Policy DELETE: `"Dono pode excluir propria conta"` (`auth.uid() = user_id`).
  GRANT DELETE já existia para authenticated.
- **Aplicação obrigatória:** como não há `supabase` CLI/service_role no
  workspace, o usuário deve colar o SQL atualizado no SQL Editor do Supabase.

### Frontend
- `career/formacoes.ts`: 5 formações (1-2-2, 1-3-1, 1-1-3, 1-2-1-1, 2-2-1), cada
  uma com 5 posições [x,y] + nomes padrão. `formacaoById()`,
  `normalizarBotoesNomes()`.
- `career/ProfileSetup.tsx`: módulo de conta (login/cadastro/edição). PS2-style:
  nome do time, sigla, cores (3 únicas), número, **tática**, **nomear os 5
  botões**, preview de campo (SVG). Login automático via `useBotaoAuth`.
  Deslogar / excluir conta / salvar personalização.
- `online/auth.ts`: `Perfil` estendido com `tatica?` e `botoes_nomes?` (nullable
  para casar com o DB). `cachePerfil` persiste tatica/botoes no localStorage.
  `STORAGE_KEYS.TATICA`/`BOTOES`.
- `lib/botao/api.ts`: `atualizarPerfilClube()` (RPC) + `excluirContaUsuario()`.
- `BotaoGame.tsx`: screen `"profile"`, card "Meu Clube / Conta" no menu,
  `formation` useMemo deriva posições de `perfil.tatica` e passa ao `MatchView`.
  `aoLogar(undefined)` → volta à tela `auth` (logout/exclusão).
- `engine/physics.ts`: `initialDiscs(formation?)` e `resetPositions(discs, formation?)`
  aceitam formação personalizada. Default = `FORMATION` 1-2-2.
- `components/MatchView.tsx`: prop `formation?` propagada a initialDiscs/resetPositions.
- `integrations/supabase/types.ts`: `botao_usuarios` Row/Insert/Update com
  tatica/botoes_nomes; RPC `atualizar_perfil_clube` tipada.

### Fluxo de auto-login
- `useBotaoAuth` escuta `onAuthStateChange`. Se há sessão ativa, busca/cria o
  perfil e popula `perfil`. O `ProfileSetup` abre em modo "editar" quando
  `perfil` existe; em modo "login" quando não. Logout/excluir → `onPronto(undefined)`
  → `aoLogar` → screen `"auth"`.

## TypeScript — observações (2026-08-18)
- `tsc --noEmit`: **0 erros** | `vite build`: OK | `npm run lint`: 1872 erros
  de prettier pré-existentes em TODO o repo (não bloqueiam build). `--fix`
  resolve a maioria mas não foi aplicado globalmente.
- Prefer-const: ESLint recomenda `const` mesmo quando o array é mutado via
  `.push()` (binding não é reatribuído).

## Persistência de fotos (escudo do clube) — commit e9cf53b (2026-08-18)
- **SQL** (`supabase/migrations/futebol.sql`):
  - Coluna `escudo_url TEXT` em `botao_usuarios`.
  - Bucket Storage `escudos` (público) + policies RLS por `auth.uid()`
    (`escudos_upload_dono`/`escudos_read_public`/`escudos_update_dono`/
    `escudos_delete_dono` em `storage.objects`).
  - RPC `atualizar_perfil_clube` ganhou parâmetro `p_escudo TEXT DEFAULT NULL`.
- **Frontend**:
  - `src/lib/botao/api.ts`: `uploadEscudo(userId, file)` faz `upsert` no Storage
    (`escudos/{uid}/escudo.{ext}`) e devolve a URL pública. `PerfilClubeInput`
    tem campo `escudo?`; `atualizarPerfilClube` envia `p_escudo`.
  - `src/components/botao/online/auth.ts`: `Perfil.escudo_url`, `STORAGE_KEYS.ESCUDO`,
    `cachePerfil` persiste o escudo.
  - `src/components/botao/career/ProfileSetup.tsx`: `<input type="file">` no
    avatar do resumo, preview `<img>`, hover com overlay de upload, valida
    `image/*` e ≤2MB; `trocarEscudo()` faz upload + salva via RPC.
  - `OnlineMatchV3`/`OnlineChampionship`: `meuTime` exibido no card.
- **REMOVIDO (2026-08-18)**: a feature de escudo/foto quebrava o RPC
  `atualizar_perfil_clube` em produção (o parâmetro `p_escudo` não existia no
  banco deployado, fazendo toda chamada de salvar perfil falhar). Revertido
  para a assinatura original de 7 parâmetros (sem `p_escudo`): perfil salva
  apenas nome do time, abreviação, cores, tática e nomes dos botões. Blocos SQL
  de `escudo_url`, bucket storage e policies foram removidos de `futebol.sql`.

## SQL consolidado — commit e9cf53b (2026-08-18)
- Toda a schema de futebol vive em **`supabase/migrations/futebol.sql`** (único
  arquivo). `futebol_campeonato_online.sql` e
  `20260817000000_fix_abrir_mesa_campeonato.sql` foram mesclados e removidos.
- `biblioteca.sql` e `trilha.sql` são módulos separados (livro de frases / jogo
  de trilha) e **não** devem ser tocados ao consolidar SQL de futebol.

## Amistoso online (MesaOnlineMatch) — commit e9cf53b
- Série melhor-de-3: estados `serieJ1`/`serieJ2`; vencedor ao alcançar 2 vitórias.
- 28 jogadas totais (14 por jogador) via `TOTAL_JOGADAS`/`turnsLeft`.
- Chat: `MesaRealtime.enviarChat()` + listener broadcast `chat` (`onChat`).
  Overlay `ChatOverlay.tsx` com respostas prontas + campo de digitação.
- Placar exibe nomes dos treinadores sincronizados do Supabase (`meuNome`/
  `nomeOponente` via `perfilOponente`) — escalação em primeira pessoa.

## Decisões pendentes (celular) vs narrativa
- Decisões pendentes **não** devem aparecer como histórico/narrativa em 3ª
  pessoa. São acessadas no fluxo do botão "celular" como mensagens em 1ª pessoa
  (comunicação direta do clube, estilo chat/notificação corporativa).

## Refatoração UI/UX + sistema de patrocinador (2026-08-18)
- **Desafio de patrocinador** (`career/patrocinadorEngine.ts`): a cada partida
  o patrocinador propõe uma meta (vitória por margem, não levar gols, etc.).
  Cumprir = +soberania (`aplicarDesafioPatrocinador` em `finishTournamentMatch`/
  `finishFriendly`). `CareerState.desafioPatrocinador` persiste no JSONB.
- **Celular do Treinador** (`screen="celular"`): sempre acessível no hub. O
  desafio do patrocinador aparece como bubble de chat em 1ª pessoa (estilo
  WhatsApp corporativo), com nome do patrocinador, mensagem e recompensa.
  `mensagensPendentes` inclui o desafio ativo.
- **Aposta de soberania (online)**: `OnlineMatchV3` permite apostar soberania na
  partida. `aplicarApostaSoberania()` (careerRemote) aplica: venceu = +aposta,
  perdeu = -aposta, empate = 0 (devolve). Nunca arrisca mais que o saldo.
- **Nomes dos botões no campo**: `Team.botoesNomes` (5 nomes) propagado de
  `perfil.botoes_nomes` → `userTeam`/`meuTime` → `MatchView.drawDiscs`, que
  desenha o nome do jogador (até 10 chars) no disco do lado do usuário
  (home ou away conforme `userSide`). Goleiro não recebe rótulo.
- **Bug "FB vs FB" (stats duplicadas)**: `teamByIdSync` agora consulta
  `cachedTeamsSync` (populado por `getAllTeams()`/`loadTeamsFromDB()` na
  montagem) antes do fallback local `TEAMS`. Assim times do torneio (IDs do
  banco) resolvem corretamente em vez de cair todos em `TEAMS[0]`.
- **Navegação de campeonatos** (`ChampionshipModule`): submenu
  "Copa do Brasil | Brasileirão" + sub-seleção Série A/B/C (a "você" marca a
  divisão do usuário). Stats (`StatsModule`) rotuladas pela divisão selecionada.
- `exactOptionalPropertyTypes`: props opcionais precisam de `| undefined`
  explícito (ex.: `botoesNomes?: string[] | undefined`).


## Cidadela dos Clássicos — RPG unificado por profissões (2026-08-20)

- **SQL**: `supabase/migrations/cidadela_rpg.sql` — `cidadela_perfis`,
  `cidadela_world_state` + RPCs `obter_perfil_cidadela`, `escolher_profissao`,
  `atualizar_estado_cidadela`, `obter_world_state`. Aplicação manual no SQL Editor.
- **5 profissões** (`lib/cidadela/profissoes.ts`): tecnico/estudante/empresario/
  bibliotecario/pesquisador com gating por reputação (100). A rota `/cidadela`
  força escolha de identidade quando perfil existe sem profissão.
- **Engine de decisões compartilhada** (`components/campus/`): `EstudanteState`
  genérico reutilizado por todas as profissões (`atividadesEngine.aplicarOpcao`
  registra SOV via source `'campus'`, reputação e traços emergentes).
  `ProfissaoHub` é hub genérico (Empresário/Pesquisador); Estudante usa
  `CampusHub` com tour (EstudanteTour).
- **Pesquisador**: pipeline em cadeia coleta→análise→publicação via
  `prerequisitos` de Atividade. **Empresário**: pauta própria
  (NEGOCIOS_INICIAIS) em `comercial/empresarioEngine.ts`.
- **Integração diária** (`campus/integracaoEngine.ts`): atividades rotativas
  (hash do dia ISO) conectam Estudante às outras profissões; IDs com sufixo de
  data permitem repetição diária.
- **World state** (`lib/cidadela/eventosGlobais.ts`): evento global da semana
  determinístico com efeito por profissão; `PainelMundo` lê RPC e cai em
  fallback local. `PainelReputacao` mostra reputação/nível no hub.
- **Testes runtime**: engines puros testáveis com
  `JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti <teste.mts>`. Engines de
  decisão NÃO podem importar módulos com alias `@/` (use caminhos relativos).
- **Ads**: `/brio` usa `AdSlot` Banner Rodapé (Adsense permitido por default
  no adManager). `/cidadela` permanece Monetag (sem banner adsense).
