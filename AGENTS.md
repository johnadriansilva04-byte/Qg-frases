
## Coerência global do usuário + história testada (2026-08-21, 16ª passada)

Verificação de "história principal + RPG" (§do prompt mestre) + resposta à
questão arquitetural "por que botao_usuarios E cidadela_perfis":

- **HISTÓRIA PRINCIPAL FUNCIONA** — fiação verdadeira no BotaoGame:
  `concluirColetiva` → `processarGatilhoEntrevista` (PURO, idempotente por
  partidaId via `historia.entrevistasProcessadas`) → avança
  `historia.capitulo` (0→6) → entrega conversa do NPC (Helena caps 1-3,
  John Adrian caps 4+, id `conv-npc-{npc}`) → post críptico na rede
  (`anexarPost`) → SOV `historia:cap{n}:{partidaId}` idempotente →
  `persistCareer`. `registrarPosicaoFinal` só abre no cap final (6) e é
  uma vez só (`historia.posicaoFinal` guard). **Gap real**: a suite de
  "36 testes da história" SÓ existia citada no AGENTS — nunca foi commitada.
  Agora `testes/historia-engine.test.mts` cobre 53 invariantes (gatilho,
  idempotência, troca de mensageiro, desfecho, perfil-varia-tom, dica vaga).
  Engine PURO sem alias `@/` (import relativo) → jiti executável.
- **POR QUE DUAS TABELAS**: `botao_usuarios` = identidade/domínio **futebol**
  (nome do time, cores, tática, W/D/L, `pontos_soberania` cache, JSONB
  `progresso_caminpanha` = carreira/bolsa/torneio) criado no cadastro/login
  do Futebol. `cidadela_perfis` = perfil/domínio **cidadela** (profissão,
  reputação, nível, `estado` JSONB = onboarding/profissão, `nome`/`bio`
  públicos) criado via RPC `obter_perfil_cidadela` no primeiro acesso à
  Cidadela. **Chave de ligação: UMA — `user_id = auth.uid()`** (mesma FK
  `REFERENCES auth.users`, UNIQUE nas duas). Um usuário, dois perfis de
  domínio: NÃO é duplicação de identidade — é separação por domínio com o
  MESMO usuário dinossauro-de-vs. Não há campos repetidos de verdade:
  dinheiro/SOV NUNCA em `cidadela_perfis`; pontuação de futebol NUNCA em
  `cidadela_perfis.estado`; `cidadela_perfis.nome/.bio` são o rótulo público
  opcional do RPG (separação válida por domínio — o "Perfil Público"
  mistura-se com `botao_usuarios` para partidas/SOV).
- **IDENTIDADE CANÔNICA**: `auth.users` (auth.uid()) → um perfil por domínio,
  TODOS ligados por `user_id`. Prova: `cidadela_perfil_publico(user_id)`
  reúne campos de AMBAS numa leitura (nome/bio/nível de `cidadela_perfis` +
  partidas/vitórias de `botao_usuarios`). Nenhum módulo inventa seu próprio
  "usuário" — todos resolvem `perfil.user_id` (futebol) ou `userId` (RPC).
- **CELUΛR SEPARADO POR TIPO — JÁ EXISTIA, SEM DUPLICAR FONTE**:
  mensagens privadas = `CareerState.conversas` (`ConversaCelular[]` —
  uma conversa por contato/NPC via `anexarConversa` id por npcId) → aba
  "contatos"; posts/notícias públicas = `CareerState.feedCidadela`
  (`PostFeed[]` com `selo` noticia/torcedor/rival/oficial/rumor —
  `anexarPost`) → aba "rede"; missões = RPC `cidadela_missoes_diarias` →
  aba "missoes"; notícias também em `headlines[]` (manchetes da carreira).
  Um evento (derrota) gera UMA consequência + representações (post do
  jornalista na rede/reação do rival na conversa) TODAS apontando para o
  mesmo `partidaId`. Não são 4 entidades — são leituras do mesmo
  `career.historia/entrevistas/...`. Persistência F5: `normalizarCareer`
  sana `conversas`/`headlines`/`feedCidadela`; missoes vêm do servidor RPC.
- **SINCRONIZAÇÃO**: SOV ledger → `obterSaldoSov` é a ÚNICA leitura em todos
  os módulos (celular `saldoSov` prop = saldoSovRemoto ?? coach.sov,
  re-busca 1.8s; SovBank/SovMarket/PerfilApp/BolsaResumoCard mesmo RPC).
  `pontos_soberania` é cache denormalizado (só escrito em storage.ts com
  `saldoSov ?? local`). Carreira/bolsa/torneio/classificação → UM JSONB
  serializado.
- **Verificação**: tsc 0 erros; 53 (história) + 38 + 29 + 20 + 19 + 9 + 30
  + 6 + onboarding + marketplace OK. Não arquiteturei nada novo — mapa e
  testes do que existia.

## Arqueologia git + verdade do banco em produção (2026-08-21, 15ª passada)

Investigação com `git fetch --unshallow` (330 commits) + probes REST na
produção (chave publishable extraída do bundle pracinha.online):

- **`cidadela_rpg.sql`**: criado na Fase 1 (`2e20bb4`) e **deletado no HEAD**
  (`1044aa5` "Unificar tabelas SQL"). A unificação movia colunas do perfil
  (profissao/estado/reputacao/bio) para `botao_usuarios.estado_cidadela`.
  **Produção prova que a unificação NUNCA foi deployada**: REST mostra
  `column botao_usuarios.estado_cidadela does not exist` (42703), enquanto
  `cidadela_perfis` EXISTE e os RPCs `obter_perfil_cidadela`/
  `atualizar_estado_cidadela` FUNCIONAM (P0001 = auth, não 404). Veredito:
  a fonte única do perfil da Cidadela É `cidadela_perfis`; o commit HEAD
  era uma meia-migração (frontend duplicava, backend não). Resolução:
  arquivo restaurado do histórico (fresh deploys precisam dele —
  `tempo_cidadao.sql`/`cidadela_chat_missoes.sql`/`feira.sql` dependem da
  tabela) e bloco-fantasma removido do `futebol.sql` (com guarda no teste
  estrutural).
- **Origens das regressões de persistência** (pickaxe -S): queue
  `writeQueues` nasceu em `d4f6b24` mas `aplicarResultadoRemoto`
  (nascido em `686cbc1`) e o padrão `writeProgress({career: nextCareer})`
  (solidificado em `d4f6b24`/`4d8608c`) ficavam FORA dela — leitura velha
  regravada por cima (rollback F5). Corrigido na 14ª passada.
- **patchSob duplicado**: introduzido no HEAD (`1044aa5`) — delta da partida
  ia ao ledger no `finishTournamentMatch` E em `aplicarResultadoRemoto`.
  Removido na 14ª passada.
- **Rotas/F5**: pickaxe de `navigate`/`redirect` em `src/routes/*.tsx` = 0
  ocorrências em TODO o histórico. Não existe redirect para /cidadela; os
  jogos são telas internas (Screen) da rota /cidadela e a tela ativa restaura
  via sessionStorage. Problema inexistente — confirmado.
- **§13 nome pedido de novo**: `CoachSetup` nunca recebeu a identidade do
  login; agora `nomeInicial={perfil?.nome}` preenche o campo (editável).
  Fluxo permanece: login → coach (prefill) → CareerIntro (Treinador/
  Proprietário) → ofertas.
- **Tour mapa do usuário** (rota → tela → escrita): / → hub BRIO; /cidadela →
  BotaoGame (screens internos: menu/hub/tournament-match/economia/...);
  /campus → ProfissaoHub/CampusHub; /biblioteca → cartório/livro; /brio →
  Notícia/comentarista. Escritas: perfil→botao_usuarios; Cidadela-perfil→
  cidadela_perfis via RPCs; carreira/bolsa/torneio→JSONB
  `botao_usuarios.progresso_caminpanha` (fila serializada); dinheiro→
  `user_wallets`/`bank_ledger` via sov_bank_registrar; onboarding→
  `cidadela_perfis.estado.onboarding` via RPC; missões→`cidadela_missoes`
  via RPC; feira→`cidadela_inventory/market_listings` via RPCs feira_*;
  grupo→`cidadela_chat_messages`.
- **Verificação**: tsc 0 erros; build OK; estruturais + suites jiti OK.

## Persistência total — corrida no JSONB + double-count no ledger (2026-08-21, 14ª passada)

Auditoria integral (prompt "Bolsa não persiste após F5"). Nada de tabela/hook/
serviço novo — a arquitetura existente foi fechada em volta das fontes únicas.

- **CAUSA RAIZ (rollback F5 da Bolsa e da carreira)**: `aplicarResultadoRemoto`,
  `inserirManchetesRemotas`, `aplicarEscolhaRemoto` e `iniciarCampanhaRemota`
  faziam SELECT **fora** da fila de escrita (`writeQueues`) e depois regravam
  a carreira INTEIRA (`writeProgress({career: nextCareer})`). A leitura solta
  podia ser anterior a escritas recentes (compra na Bolsa, dividendos,
  conversas) → a última escrita sobrescrevia com snapshot VELHO → a sessão
  mostrava o estado novo e o F5 revelava o antigo.
- **Fix**: `storage.mutateProgressInSupabase(userId, mutator)` — leitura e
  mutação DENTRO da fila (enqueueProgressWrite compartilhado com o merge).
  `aplicarResultadoRemoto` agora só sincroniza contadores (partidas/gols) +
  `coach.sov` autoritativo do ledger — NÃO reconstrói moral/bônus (o snapshot
  local do persistCareer é o dono). `inserirManchetesRemotas` anexa na carreira
  fresca da fila. `aplicarEscolhaRemoto`/`iniciarCampanhaRemota` REMOVIDAS
  (re-aplicavam poder/moral/campanhasJogadas — double-apply após F5).
- **Double-count no ledger eliminado**: o `patchSob` do finishTournamentMatch
  somava TUDO (delta da partida + dividendos + desafio + bônus de título) e
  registrava no ledger, enquanto cada componente TAMBÉM tinha escritor próprio
  (aplicarResultadoRemoto, bloco de dividendos, desafio, aplicarFimCampanhaRemoto)
  → saldo do banco divergia ~2× da UI. Agora: delta da partida =
  `aplicarResultadoRemoto` (chave `partida:{uid}:{fixture}`, módulo
  parametrizado — MesaOnlineMatch passa `"online"`); dividendos =
  `dividendo:{t}:r{n}`; desafio = `desafio:{uid}:{desafioId}` (chave NOVA);
  decisão RPG = `decisao:{uid}:{choiceId}` (chave NOVA); fim de temporada =
  `fim-campanha:{uid}:t{n}:{div}` (e não re-incrementa títulos quando
  careerAtual já os somou — bug do contador dobrado).
- **Manchetes**: BotaoGame não chama mais inserirManchetesRemotas (o snapshot
  já carrega as headlines; a chamada extra duplicava/rolava back). A função
  segue para o fluxo ONLINE (MesaOnlineMatch), agora mutate-safe.
- **Onboarding/estado de profissão**: campo unificado `CidadelaPerfil.estado`
  (o tipo dizia `estado_cidadela`, o código lia `estado` — um dos dois sempre
  undefined em runtime). `salvarOnboarding` fazia UPDATE direto em
  `botao_usuarios.estado_cidadela` (coluna INEXISTENTE → PostgREST 400 engolido
  → tour nunca persistia no servidor e repetia); agora usa a RPC
  `atualizar_estado_cidadela` (merge no JSONB do perfil), mesma da migração
  anônimo→conta. `normalizarPerfil` aceita `estado`/`estado_cidadela` (defesa).
- **salvarResultado (legado OnlineMatchV2, morto)**: não sobrescreve mais o
  JSONB inteiro — mescla só `friendlies` via fila (trophies/titles desse fluxo
  usam formato string[] incompatível com a carreira).
- **Rotas/F5**: NÃO existe redirect fixo p/ /cidadela — jogos são estado interno
  da rota /cidadela e a tela ativa restaura via sessionStorage
  (`botao:resume:v1` inclui "economia"; `cidadela:jogo-ativo:v1` por aba).
  Nada a corrigir — o problema descrito não existe no código atual.
- **Gap reportado (não inventado)**: `supabase/migrations/cidadela_rpg.sql`
  consta no README (passo 4) mas o arquivo NÃO está no repo — a tabela
  `cidadela_perfis` e as RPCs `obter/escolher/atualizar_estado/obter_world_state`
  só existem aplicadas em produção. Sem o arquivo, deploy novo quebra.
- **Testes**: `test-bolsa-persistencia.mts` NOVO (29 invariantes jiti: compra→
  JSONB→normalizarCareer pós-F5 = cotas/saldo/patrimônio idênticos; venda
  parcial/total; dividendos idempotentes; saneamento de JSONB corrompido) +
  `testes/persistencia-unica.test.mjs` NOVO (25 checagens estruturais das
  invariantes acima). `onclick-guard` atualizado (OnboardingTour→TourContextual).
  Suites: 38+9+57+52+19+42+14+20 jiti OK, 25+19+6+22+11 estruturais OK,
  `tsc --noEmit` 0 erros (HEAD tinha 5 pré-existentes — corrigidos),
  `npm run build` OK.

## Consistência SOV — banco engolindo erro → "saldo 0" no cache (2026-08-21, 13ª passada)

Vistoria cirúrgica da fonte de verdade SOV (ledger + cache). TODAS as
recompensas gravam em `bank_ledger`/`user_wallets` via `sov_bank_registrar`;

o bug era de confiabilidade da confirmação:

- **CAUSA RAIZ (SQL)**: `sov_bank_registrar` tinha `EXCEPTION WHEN OTHERS`
  que devolvia `{transaction_id NULL, balance 0, duplicated FALSE}` QUALQUER
  erro (saldo insuficiente, teto de emissão, auth violado) — a UI lia só
  `balance` e cacheava **0** (pontos_soberania/coach.sov zerados mesmo sem
  escrita no ledger). Migração `sov_bank.sql` corrigida: sem EXCEPTION, o
  erro sobe como 400 legível. Para produção: re-aplicar no SQL Editor.
- **Defesa no frontend (redundante após migration)**: `sovApi.registrarTransacaoSov`
  detecta `transaction_id NULL` → log completo + retorna null → fallback
  local (nunca saldo 0). Guard permanece como defesa em profundidade.
- **Aposta online sync**: careerRemote usa o saldo do ledger para gravar o
  cache (antes computava local e gravava mesmo com ledger falho).
- **Compra de clube**: se o banco recusa o débito, o grant era entregue
  mesmo assim; agora aborta com toast de erro (§14 do prompt mestre).
- **Teste estrutural**: `node testes/sov-consistencia.test.mjs` 6/6.

## AUDITORIA TOTAL — React #130 + carteira 400 + tour contextual (2026-08-21, 12ª passada)

- **React #130 CAUSA RAIZ (fixada)**: `SubornoStory.Chip` recebia um ELEMENTO
  React (`icon={<TrendingUp/>}`) e renderizava como componente (`<Icon/>`) →
  "Element type is invalid: got object". Carreira com `suborno.nodeAtual`
  ativo → `prioridadeCelular` renderiza SubornoStory → crash ao entrar no
  Futebol. Agora Chip renderiza o elemento direto (`{icon}`), tipo
  `ReactNode`. Provar/validar: `node run-ssr.cjs test-ssr-flow.mts` +
  `node test-ssr-flow.bundle.mjs` (harness rolldown com alias "@" → src).
- **400 do Supabase (probes em produção pracinha.online)**: PostgREST 400 =
  uuid inválido no payload OU RAISE EXCEPTION no corpo da função (ambos
  verificados via curl com sb_publishable extraída do bundle). RPCs SOV
  existem com assinaturas batendo; `tempo_cidadao_heartbeat` existe e RAISE
  "usuario nao autenticado" quando a sessão expira mas userId (perfil
  cacheado) ainda existe — era o loop de 400. Agora `useTempoCidadao` checa
  `supabase.auth.getSession()` antes de bater. `sovApi.logErroRpc` loga
  code/message/details/hint+payload (nunca engolir o 400).
- **Leitura de saldo SOV consolidada**: `pracinhaCore.obterSaldoSov`
  (direto user_wallets + create_or_update_wallet a cada leitura) REMOVIDA;
  todos leem `sovApi.obterSaldoSov` (RPC obter_saldo_soberania).
  SovMarket não grava mais 0 falsificado quando a leitura falha.
- **Tour contextual substitui portão full-screen**: `OnboardingGate` =
  pass-through; `TourContextual.tsx` (bolhas ancoradas em `data-tour`
  reais, overlay pointer-events-none) monta DEPOIS da escolha do módulo em
  /cidadela (botao: perfil/carreira/trofeus/celular; trilha:
  trilha-trofeus/celular). Conclusão persiste via `useOnboarding`
  (onboarding engine) — botão "?" re-executa. `OnboardingTour.tsx` +
  `ChatAuthCard.tsx` REMOVIDOS (só existiam por causa do portão).
  Âncoras: MenuCard ganhou `dataTour` prop; CelularFixo button
  `data-tour="celular"`; TrilhaGame "Troféus" `data-tour="trilha-trofeus"`.
- **Ads**: `adManager` não injeta mais `data-cfasync` na tag do AdSense
  (era o warning "AdSense head tag doesn't support data-cfasync").
- **Sistema de recompensa é O sistema**: `registrarTransacaoSov` →
  `sov_bank_registrar` (ledger) — todos os 15 call sites em BotaoGame +
  careerRemote + storage + useCelularCarreira + campus. Docs de inventário
  no AGENTS §"Sistema de IA" — recompensas nunca duplicadas por UI.
- **Log de debug removido**: "[BotaoGame] onLoadCareer chamado" saiu de
  produção.
- **Verificação**: tsc 0 erros, build OK, 38 render checks SSR (suites
  test-ssr-flow/futebol/celular/botaogame, 0 falhas), 283+ testes jiti OK.
## Regras de fim de temporada + marco de liderança + celular/Bolsa (2026-08-21, 11.5ª passada)

- **Regra das 3 temporadas (§9 recuperação de dívida)**: `CareerState.temporadasInadimplente`
  (0-3, clamp no `normalizarCareer`) + `avaliarFimTemporada(sov, divisao, prev)` —
  pagou → contador zera e motivo "renova"; falhou 1ª/2ª → CONTINUA com motivo
  narrativo "(n)/3 temporadas ... restantes"; 3ª → falência. Chamadas em
  hidratação (F5 seguro) e em `finishTournamentMatch`; `startNextSeason`
  persiste o contador do veredito. `SeasonEndScreen` mostra "Tentativa de
  recuperação X de 3". `MAX_TEMPORADAS_INADIMPLENTE = 3` exportado.
- **Marco de 1º lugar (§10)**: `chegouAoPrimeiroLugar(pos, temp, marco)` PURO +
  `career.marcoLiderTemporada` persiste a celebração — posição 1 real dispara
  UMA vez por temporada: toast 🏆 + conversa do Dirigente no celular
  (fila `enfileirarConversas`, id `marco-lider-t{temp}`). F5 não repete.
- **LoadingScreen unificado (fix de UX)**: overlay único cobre duas fases —
  auth inicial (`carregando`, snapshots intro) + hidratação da campanha
  (`loading`, snapshots onboarding-college); `onCompleto` em React state
  (identidade estável — texto e duracao no mesmo render do estado `loading`).
  Nunca dois overlays concorrentes.
- **Onboarding anônimo→conta**: `carregarOnboarding(uid)` migra o espelho
  `ID_ANONIMO` para o userId (localStorage + RPC `atualizar_estado_cidadela`)
  quando o remoto é vazio — tour feito antes do login não se perde.
- **Bolsa visível**: `components/financial/BolsaResumoCard.tsx` somente-leitura
  (índice/patrimônio investido/posições + seta de tendência vs preçosAnteriores)
  montado (a) na aba "banco" do celular (`CelularConversas.bolsa` prop;
  CelularFixo repassa; `useCelularCarreira` alimenta /cidadela+/campus) e
  (b) nos `extras` do `EmpresarioHub` (rota /cidadela). Operações ainda SÓ
  na tela Economia da carreira — o Banco nunca escreve.
- **Conexão do dirigente (§6)**: `consequenciasEntrevista` agora emite, junto
  com a reação do Bragança/torcedor, a voz do Dir. Aldemir — provocação
  (importância alta → aviso da diretoria) ou postura de orgulho/humildade
  (registro de blindagem). Funde na conversa única via `anexarConversa`.
- **Testes**: `test-regras-fim-temporada.mts` NOVO (20 invariantes jiti das
  chances de dívida/marco/dedução de manutenção), `test-entregas.mts`
  atualizado (9/9 —
  provocação espera dirigente+Bragança). Suites: temporada 57, conversas 38,
  f5 19, torcida 42+14, ia 52, onboarding 22, marketplace 11, onclick-guard 19.
  `tsc --noEmit` 0 erros, `npm run build` OK.

## Onboarding re-aplicado + login fora do futebol + auditoria celular/env (2026-08-21, 11ª passada)

- **Re-aplicado o onboarding** (onboardingEngine + OnboardingGate + OnboardingTour
  + ChatAuthCard + CareerIntro/Marketplace) sem tocar nas variáveis do Supabase
  — os reverts 361f808/4c58cc1 foram desfeitos (git revert dos reverts +
  cherry-pick ddf0079); conflitos resolvidos preservando a fiação da 10ª passada.
- **Login NÃO é tela separada no Futebol**: screen "auth"/AuthScreen removida
  do BotaoGame; o módulo "Meu Clube / Conta" (ProfileSetup) no hub principal
  (junto de Amistoso, Amistoso Online, Campeonato Online, Carreira no Campus,
  Sala de troféus) cuida de login/cadastro. Gates online apontam para
  "profile"; logout volta ao "menu". AuthScreen segue existindo SÓ dentro do
  celular (CelularConversas) e no OnboardingTour (ChatAuthCard).
- **Auditoria do Celular**: `useCelularCarreira` (hook único de /cidadela e
  /campus) agora espelha TODAS as integrações das escolhas RPG do BotaoGame —
  SOV no ledger (`efeitos?.sov`), pedido no Cartório (`efeitos?.cartorio`
  → linkCartorio) e desfecho da História (`onRegistrarPosicao` com a MESMA
  chave `historia:desfecho:{uid}` — clicar nos dois lugares não duplica).
  Rotas recebem `perfil` como 2º argumento do hook. Onde ele aparece (tudo
  enrolado): BotaoGame (Shell/durante partida), /cidadela (dentro do
  OnboardingGate), /campus (dentro do OnboardingGate), OnboardingTour (exclusivo).
  Apps → o que carrega: Contatos (career.conversas), Rede (feedCidadela),
  Missões (pracinhaCore RPC), Grupo (cidadela_chat_messages+membros RPC),
  Marketplace (feira_* RPC), Banco (sovBankApi), Arquivo (historia.pergaminhos),
  Perfil (cidadela_perfil_publico RPC). Salva: responder/escolher/excluir
  (saveCareerToSupabase), bio (cidadela_atualizar_perfil), ofertas
  (feira_* no ledger), mídia de conversa, Tempo de Cidadão (heartbeat RPC),
  Grupo leitura (localStorage `cidadela:grupo:visto`).
- **Variáveis de ambiente** (.env.example atualizado): Supabase
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_PUBLISHABLE_KEY`
  /`SUPABASE_SERVICE_ROLE_KEY`; Ads `VITE_ADSENSE_CLIENT`/`VITE_ADSTERRA_INVOKE_URL`
  /`VITE_MONETAG_SRC`/`VITE_MONETAG_ZONE` (defaults em src/lib/adManager.ts).
  Leu bem com `readEnv(name)`; chaves legadas n8n/Cloudflare são legadas de
  infra do repo (não usadas em src).
- **Verificação**: `tsc --noEmit` 0 erros, `npm run build` OK; testes: 38+9
  (conversas/entregas) + 42+14 (torcida) + 57 (temporada) + 52 (IA) + 19 (F5)
  + 22 (onboarding) + 11 (marketplace) + 19 (onclick-guard) = 283 OK.

## Torcida global + IA estratégica + fim de temporada (2026-08-21, 10ª passada)

Implementação definitiva do Modo Carreira sobre a 9ª passada (66bec00):

- **`career/torcidaEngine.ts` (NOVO, PURO)**: 1.000.000 de torcedores globais,
  soma EXATA e invariante (zero-sum) em TODA operação. `distribuirTorcidaInicial`
  (peso = power², maior resto), `aplicarResultadoTorcida` (vitória 0,6-2,2% +
  bônus sequência; empate migra 0,1% p/ quem VINHA de sequência — comparar
  ANTES de zerar seqs), `aplicarTituloTorcida` (campeão suga 0,3% de todos),
  `garantirTorcida` (clubes novos entram com fatia ≤5% e o mapa é
  RENORMALIZADO a 1M — também cura estados degradados pós-sanitização),
  `forcaEfetiva` = qualidade + bônus torcida (≤+6) + forma (±3), clamp 28-99.
- **`career/torcidaIntegracao.ts` (NOVO)**: ponte carreira↔engine (cópia
  profunda por clube — o engine muta; NUNCA passar estado React direto).
  `garantirTorcidaUniverso` idempotente, `aplicarRodadaTorcida` (todos os
  jogos da rodada nas 3 divisões), `aplicarTitulosDaTemporada`,
  `forcasDaTemporada`, `formaDoJogador` (derivada da seq real).
- **Simulação usa força efetiva**: `tournament.simulateMatch` aceita
  `powerOverrides`; `seasonEngine.simularRodadaDivisoes` consome o mapa.
  Torcida é UMA variável — nunca decide sozinha (testado: time 40 com 100%
  da torcida não passa de 49).
- **`engine/estrategia.ts` (NOVO, PURO)**: cérebro da CPU. `decidirIntencao`
  PURO (escore/tempo → atacar/contra_atacar/reter/defender/bloquear) +
  `analisarPadroes` (janela de 16 tiros do jogador — lado/força/zona; só
  reage com amostra ≥6) + `perfilDoClube` (força→precisão/leitura) +
  `balancearPerfil` (jogador invicto → CPU mais disciplinada, teto 0,97;
  má fase → alívio com piso 0,25). LLM opcional (`gerarIntencaoLlm` via
  AIService.generateText) SEMPRE validado por `validarIntencaoLlm` com
  fallback determinístico. `executarIntencao` traduz intenção → impulso
  físico (defesa do goleiro preservada).
- **MatchView**: prop `aiContext` (BotaoGame passa força/torcida/forma);
  tiros do jogador registrados em `onPointerUp` (handlePlayerShoot) —
  memória POR PARTIDA, reseta a cada jogo.
- **Fim de temporada DEFINITIVO**: `SeasonEndScreen.tsx` (NOVO) com dados
  REAIS via `seasonEngine.resumoTemporada` (determinístico — re-derivável
  pós-F5). Renderiza DEPOIS da MatchEndScreen (`screen !== "match-end"`).
  `careerRemote.aplicarFimCampanhaRemoto` race-safe (lê dentro da fila
  serializada). Hidratação DERIVA o veredito de `ligasConcluidas` — F5 no
  fim da temporada não trava mais a carreira (dead-end eliminado).
- **Saldo SOV no celular**: barra de status (Coins) no CelularConversas via
  prop `saldoSov`; BotaoGame e `useCelularCarreira` buscam `obterSaldoSov`
  (user_wallets autoritativo) com re-busca 1,8s após mudança do cache local.
- **Testes**: test-torcida.mts (42), test-torcida-integracao.mts (14),
  test-temporada.mts (57), test-ia.mts (52), test-f5.mts (19) — jiti.
  Legados: test-conversas (38) + test-entregas (9). tsc 0 erros, build OK.

## Celular: UMA conversa por contato + F5 sem reset (2026-08-21, 9ª passada)

Auditoria completa sobre o commit 361f808 (revert do onboarding). Causas-raiz
corrigidas no SISTEMA ORIGINAL (sem celulares paralelos):

- **`career/conversasEngine.ts` (NOVO)**: `anexarConversa(career, conv)` —
  identidade estável por `npcId` → `canal` → `nome` (fallback p/ legado).
  Mensagens novas entram na conversa existente (dedupe por id de mensagem),
  conversa sobe ao topo, dilema pendente (eventoRpg !respondido) nunca é
  sobrescrito (vira entrada separada). Caps: 30 conversas / 100 msgs.
  `normalizarConversas(lista)` funde duplicatas legadas na hidratação
  (rodado por `careerStorage.normalizarCareer` — sana o JSONB do banco).
- **Todos os produtores migrados**: rpgEngine (eventoParaConversa id estável
  `conv-npc-{npc}`, msg `rpg-m-{eventoId}`), garantirContatosRpg (idempotente
  POR CONTATO — antes um único npcId pulava TODOS os contatos), convite da
  Trilha entra na conversa do Pracinha (msg `ritual-m-...-r{rodada}`),
  historiaEngine (capítulos = mensagens na conversa de Helena/John Adrian),
  entrevistaEngine (reações em `conv-npc-npc-braganca`/torcedor, msg por
  partidaId), médico/redes pós-jogo (`conv-canal-medico`/`conv-canal-redes`),
  decisões viram mensagem na conversa do remetente (`remetenteDecisao` em
  choicesEngine, canal `decisao:{eventoId}` — ChoiceModal usa o mesmo mapa).
- **Fila do BotaoGame** (`enfileirarConversas`) drena via anexarConversa
  (uma msg por vez, 2.6s, toast+som — sem lote).
- **F5**: resume `botao:resume:v1` (sessionStorage, por usuário, 2h) agora
  guarda TAMBÉM telas seguras (hub/classificacao/calendario/economia/
  trophies/profile/career-menu) + `patrocinioPagoPartida`; `telaRestauradaRef`
  impede `hidratarCampanha` de devolver ao menu. `concluirColetiva` idempotente
  em 2 camadas: guarda da sessão + `career.entrevistas` (F5 não repaga).
  Rota /cidadela: jogo ativo (Estádio/Trilha) persiste em sessionStorage
  `cidadela:jogo-ativo:v1` (aba nova entra limpa).
- **Celular fora do Modo Carreira**: hook único `src/hooks/useCelularCarreira.ts`
  (carrega career, handlers responder/escolher/excluir com persistência) —
  usado por /cidadela e /campus (antes /campus tinha `<CelularFixo/>` pelado).
- **Adsterra**: `AdsterraBanner` REANEXA o invoke script a cada montagem
  (ele executa 1x por carga e preenche o container do instante — remount
  deixava banner vazio; era o "carrega em alguns lugares e não em outros").
- **CSS**: `.phone-screen` com `height: min(74vh, 42rem)` — lista e chat
  rolam internamente; o aparelho não estica a página.
- **Limitações honestas**: fila em memória — F5 durante o drain perde as
  mensagens de flavor ainda não entregues (estado crítico persiste); vite dev
  atrás do proxy do work-host não hidrata (ambiental, confirmado no commit
  limpo) — auditar UI via Vercel. Testes: `JITI_TSCONFIG_PATHS=true
  ./node_modules/.bin/jiti test-conversas.mts` (38) + `test-entregas.mts` (9).
  `tsc --noEmit` 0 erros; `npm run build` OK.

## Onboarding obrigatório + Entrada Triunfal da Carreira + Marketplace (2026-08-20, 9ª passada re-aplicada)

- **Onboarding como máquina de estados persistente** (§7): `lib/onboarding/onboardingEngine.ts` (PURO, jiti-testável) com `OnboardingStage` (`nao-iniciado`→`identificacao`→`introducao`→`ambientes`→`sov`→`destino`→`primeiro-jogo`→`concluido`), `avancarStage`, `marcarDestino`, `responderPracinha` (IA ativa — corrige palavrão, rotas de destino por texto, fallback contextual sempre covia-no-norte); `lib/onboarding/onboardingApi.ts` (RPC `atualizar_estado_cidadela` para autenticado + localStorage `cidadela:onboarding:{anon|uid}`), `useOnboarding` (mutar() central). Gate `components/cidadela/OnboardingGate.tsx` envolve /cidadela, /campus e /gerador — novo usuário vê o tour obrigatório; usuário com `onboarding.concluido` entra direto (§33). O tour NUNCA exibe "Pular" (§31). `testes/onboarding-eng.test.mts` 22/22 OK.
- **Tour do Pracinha** (`components/cidadela/OnboardingTour.tsx`): celular premium full-screen com scroll (overflow-y-auto), AuthScreen embutida na fase de identificação, destino escolhido navega para a rota. Palavrão tem resposta de correção (§4).
- **Entrada Triunfal da Carreira** (`career/CareerIntro.tsx` + screen "career-intro" no BotaoGame): duas trilhas reais — **Treinador** (contrato com clube existente) ou **Proprietário** (compra clube no Marketplace). Persistida em `CareerState.modoEntrada`.
- **Marketplace (§13)**: `career/marketplaceClubes.ts` — `precoClube(clube) = power*5 × mult divisão` (determinístico, sem Math.random), `estrelasClube` 1-5 por power, `podeComprar`. Compra de clube: débito idempotente no SOV Bank (`transfer`, sourceEvent `compra_clube`, idempotencyKey `clube:compra:{id}:{uid}`), clube adquirido atualiza identidade do perfil via `atualizarPerfilClube`. "Feira" renomeado → "Marketplace" em CelularConversas/SovMarket/pracinhaCore. `testes/marketplace-clubes.test.mts` 11/11 OK.
- **Bug One Click — correção estrutural confirmada** (§21-28): guardas já existentes + reforço. `ControlledMonetagButton` usa `executionLockRef` + cooldown 3s (voltadeiya ao idle); `adManager.dispararMonetagUmaVez` = autorização de popup único cancelada por timer; `BotaoGame` falha `visibilitychange/pageshow` → `cancelarAutorizacao()` — nunca reexecuta após retorno da página. SOV Bank idempotente (`clube:compra`, `coletiva:{partidaId}`, `historia:cap{n}:{partidaId}`, `missao:{id}`). Estrutura verificada por `testes/onclick-guard.test.mjs` 19/19 OK.
- **Verificação**: `tsc --noEmit` 0 erros; `npm run build` OK; testes jiti end-to-end signaling OK.
- **Problema latent**: `agora` parâmetro não usado em `avancarStage` — remove ambientalmente e o jiti aprovou; checar quando crescer.

## Grupo Cidadela — fictício, 100% interno (2026-08-20, 8ª passada)

- **Correção de interpretação**: o "Grupo Cidadela" NÃO é WhatsApp/Evolution/
  webhook — é um **app fictício dentro do celular do jogo**. Nenhuma integração
  externa existe ou é necessária; a referência visual é só inspiração.
- **Membros reais do próprio app (§2/§5)**: RPC `cidadela_listar_membros()`
  (seção 7 de `tempo_cidadao.sql`) lista TODOS os cidadãos registrados (a RPC
  legada `cidadela_listar_jogadores` filtrava 30min e escondia quem saiu) com
  presença real computada (heartbeat ≤3min → ● online, senão ○), online
  primeiro. `grupoCidadao.listarMembrosGrupo` usa a nova com fallback na legada.
- **Mesmo user_id (§4)**: zero cadastro/identidade/autenticação paralela —
  o grupo lê `cidadela_jogadores_online` (mantida pelo heartbeat do Tempo de
  Cidadão) e o perfil lê `cidadela_perfil_publico`. Clique no nome → PerfilApp
  público (implementado na 7ª passada).
- **Grupo vivo (§6)**: `grupoCidadao.textoEventoGrupo` (PURO, determinístico
  via hash — retry não muda a fala) gera falas de NPCs (Valéria, Dirigente,
  Torcedor, Cícero Ramos, Helena Páginas) sobre eventos REAIS: resultado de
  partida da carreira, coletiva concluída (com o tom da declaração), sinal do
  acervo. Postadas em `cidadela_chat_messages` tipo 'sistema' (sender fictício,
  sender_id NULL) por `postarNoGrupoUmaVez(chave, evento)` no BotaoGame —
  guard `grupoPostadoRef` idempotente por partidaId.
- **Notificação (§7)**: `useNotificacaoGrupo` — poll leve (90s, só aba
  visível, só com o celular fechado), posição de leitura em localStorage
  (`cidadela:grupo:visto`, marcada também ao abrir o grupo), nunca notifica
  a própria mensagem nem o histórico. `💬 Nova mensagem no Grupo Cidadela`
  clicável + `tocarSom("mensagem")` → abre o celular já no GRUPO (prop
  `abaInicial` do CelularConversas). Fechar reseta a aba-alvo.
- **Verificação**: engine jiti 8/8; estruturais OK; `tsc --noEmit` 0 erros;
  `npm run build` OK.

## Tempo de Cidadão + Presença + Perfil + Sons (2026-08-20, 7ª passada)

- **`supabase/migrations/tempo_cidadao.sql`** (10ª migração, ordem no
  `migrations/README.md`): colunas `nome`/`bio` em `cidadela_perfis` (corrige
  bug latente — `cidadela_atualizar_status` lia `nome` inexistente); tabela
  `cidadela_tempo` (tempo_total_segundos, horas_recompensadas,
  primeira_entrada); RPCs `tempo_cidadao_heartbeat` (≤120s/chamada travado no
  servidor; 1h=+10 SOV via `sov_bank_registrar` chave `tempo:{user}:{hora}`;
  hora não paga se o teto barrar — retenta depois), `cidadela_perfil_publico`
  (só dados públicos; online = heartbeat ≤3min) e `cidadela_atualizar_perfil`
  (SÓ nome/bio — SOV/tempo/decisões nunca editáveis).
- **`lib/cidadela/tempoCidadao.ts`**: `useTempoCidadao(userId, onRecompensa)` —
  heartbeat 1x/min só com aba visível, líder entre abas via lock em
  localStorage (TTL 90s), `formatarTempoCidadao` ("10h 24min"). Montado no
  `CelularFixo` (cobre BotaoGame e /cidadela); recompensa → `tocarSom(
  "recompensa")` + badge "💰 +10 SOV · Tempo de Cidadão".
- **PerfilApp** (`components/cidadela/PerfilApp.tsx`): 9º app do celular —
  nome + ●ONLINE real, Tempo de Cidadão, entrada, partidas/missões (RPC),
  decisões/entrevistas (statsCarreira do BotaoGame), SOV (só no próprio
  perfil, via obterSaldoSov), bio editável inline. Grupo → clique no cidadão
  abre perfil público (`cidadela_perfil_publico`).
- **Sons centralizados** (`lib/notificacao.ts`): `tocarSom(categoria)` com 6
  categorias (mensagem/missao/recompensa/entrevista/noticia/pergaminho),
  WebAudio sem assets. `tocarNotificacao()` virou alias de "mensagem". A fila
  do celular mapeia conversa.tipo→categoria (Helena/John = "pergaminho").
- **Restauração pós-refresh (§20-22)**: `botao:resume:v1` em sessionStorage
  guarda matchEnd+destino por usuário (2h); refresh na tela de fim de partida
  → volta à mesma tela (entrevista reabre fechada, abertura idempotente).
  Removido ao sair da tela ou trocar de usuário.
- **Auditoria One Click**: entrevista (`!entrevistaAberta && !coletivaJaPaga`
  + `patrocinioPagoPartida` + chave `coletiva:{partidaId}` no SOV Bank),
  patrocínio (ControlledMonetagButton executionLockRef + cooldown 3s, volta
  ao idle), nova aba (adClickGuard consome autorização única; pageshow/
  visibilitychange invalidam o restante — sem reexecução). Grupo/WhatsApp:
  interpretação corrigida na 8ª passada (grupo fictício interno, nada externo).
- **Verificação**: 56 testes estruturais OK; `tsc --noEmit` 0 erros;
  `npm run build` OK.

## Finalização SOV BANK + História Principal John Adrian (2026-08-20, 6ª passada)

- **§2 correção de semântica**: 200.000 SOV = estoque econômico TOTAL da
  remessa (nunca por usuário); 50 SOV = bônus de cadastro. UI do SovBankApp
  deixa explícito; `sov_bank_stats` ganhou `transacoes_total` e
  `alertas_reconciliacao` (admin agregado na aba Economia).
- **Feira implementada** (`supabase/migrations/feira.sql`): `cidadela_itens`
  (pergaminhos), `cidadela_inventory`, `cidadela_market_listings`,
  `cidadela_item_grants` + RPCs `feira_publicar_oferta` / `feira_cancelar_oferta` /
  `feira_comprar` / `feira_conceder_item`. Compra = débito do comprador +
  crédito do vendedor via `sov_bank_registrar` (chaves `feira:compra:{oferta}:{uid}`
  / `feira:venda:{oferta}`), lock FOR UPDATE na oferta, preço sempre do banco.
  Schemas alinhados aos tipos JÁ existentes em `integrations/supabase/types.ts`
  (`raridade`, `comprador_id`). Stubs do pracinhaCore substituídos por RPCs reais.
- **Legado §6**: `salvarResultado` (lib/botao/api.ts) agora registra no ledger
  via `registrarTransacaoSov` (sourceEvent `salvar_resultado`) — se o morto
  OnlineMatchV2 for reativado, não cria SOV fora do banco.
- **História principal (John Adrian)** em `career/historia/`:
  - `types.ts`: `HistoriaState` (capítulo, pergaminhos, perfil, ledger,
    entrevistasProcessadas, posicaoFinal) + `ClassificacaoFonte` (7 classes,
    §19) + `DecisaoHistoria` (Narrative Ledger §29-30).
  - `referencias.ts`: banco de referências reais (USHMM/eugenia, Nuremberg,
    FEB/Arquivo Nacional, Jane Jacobs, Tesla/Smithsonian, Meyer=UNVERIFIED_CLAIM,
    tese de John Adrian=HYPOTHESIS). Nunca hipótese como fato (§33).
  - `pergaminhos.ts`: 8 fragmentos (perg-01..08), fragmento→referência→pergunta.
  - `historiaEngine.ts` (PURO, jiti): `processarGatilhoEntrevista` — gatilho
    ÚNICO = entrevista concluída (§20/§39), idempotente por partidaId, 1
    capítulo por entrevista; Helena (npc-bibliotecaria) entrega caps 1-3, John
    Adrian (NOVO `npc-john-adrian` em personagens.ts/NpcId) do cap 4; perfil de
    decisão acumulado dos tons (§21) varia o texto da revelação; post críptico
    p/ a Rede (§26); `registrarPosicaoFinal` = desfecho não-dogmático com 3
    posições (§28); `dicaInvestigacao` vaga de propósito (§27).
  - `ArquivoApp.tsx`: 8º app do celular ("Arquivo") — fragmentos com badge de
    classificação (fato/hipótese/ficção), referência e pergunta; desfecho com
    3 posições; estado final registrado.
  - Integração: `BotaoGame.concluirColetiva` chama o gatilho (após
    consequenciasEntrevista), entrega conversas na fila, registra SOV
    "Recompensa de investigação" (chave `historia:cap{n}:{partidaId}`, §31);
    `handleRegistrarPosicao` idempotente (`historia:desfecho:{uid}`).
    `careerStorage.normalizarHistoria` saneia JSONB antigo. Quem pula a
    coletiva não avança (§40) — carreira continua 100% jogável (§23).
- **Migrações**: `supabase/migrations/README.md` documenta ordem de aplicação
  manual + verificação (`SELECT * FROM sov_bank_config`).
- **Verificação**: 36 testes jiti da história + 31 estruturais da Feira OK;
  `tsc --noEmit` 0 erros; `npm run build` OK.

## SOV BANK — livro-caixa central da Cidadela (2026-08-20, 5ª passada)

Centralização e rastreabilidade da economia SOV (prompt mestre SOV BANK §1–§28).
Já existiam `user_wallets`/`bank_ledger`/`record_transaction`
(`sov_financial_system.sql`) — o SOV BANK NÃO recria, só reforça:

- **SQL `supabase/migrations/sov_bank.sql`** (aplicação manual no SQL Editor):
  - `sov_bank_config` (única fonte dos limites da 1ª remessa:
    `max_users_initial=100`, `max_sovereign_initial=200000`, `signup_bonus=50`).
  - `bank_ledger` ganha `idempotency_key`, `source_event`, `currency` ('SOV'),
    `balance_before` + índice único parcial `(user_id, idempotency_key)`.
  - RPC `sov_bank_registrar` = porta de entrada central: valida auth.uid,
    idempotência (mesmo evento → retorna existente, `duplicated=true`),
    teto de emissão (soma de créditos > limite → exception), usa
    `record_transaction` e enriquece a linha (origem/moeda/balance_before).
  - RPCs `sov_bank_extrato` (extrato rastreável), `sov_bank_reconciliar`
    (saldo vs SUM(amount); divergência → `anti_cheat_log`
    `reconciliation_mismatch`, NUNCA corrige), `sov_bank_stats` (estoque
    monetário agregado JSONB), `sov_bank_bonus_cadastro` (50 SOV idempotente
    `signup:{user}`; acima do limite de usuários não emite, não quebra o app),
    `sov_bank_noticias` (boletins derivados de dados reais do ledger).
  - **Bug corrigido**: `cidadela_resgatar_missao` creditava a carteira com
    UPDATE direto (SOV sem registro); agora passa por `sov_bank_registrar`
    com chave `missao:{missao_id}`.
- **Frontend**: `src/lib/financial/sovBankConfig.ts` (espelho dos limites p/ UI),
  `src/lib/financial/sovBankApi.ts` (extrato/stats/notícias/reconciliar/bônus).
  `registrarTransacaoSov` (sovApi) virou wrapper da RPC central com
  `opcoes?: {sourceEvent?, idempotencyKey?}`; fallback p/ RPC legada SÓ em
  erro PGRST202/42883 (função inexistente) — nunca em duplicidade/teto.
  `SovModule` estendeu com `'mission'|'system'`.
- **UI**: `components/financial/SovBankApp.tsx` — saldo, badge de reconciliação,
  últimas movimentações, abas Extrato/Notícias/Economia (dados reais).
  Virou 7º app-card "Banco" (ícone Landmark) no menu do `CelularConversas`
  (aba `"banco"`) — SEM segundo celular.
- **Chaves idempotentes em call sites**: coletiva `coletiva:{partidaId}`,
  dividendos `dividendo:{temporada}:r{rodada}`; bônus de cadastro chamado em
  `criarPerfilSeNaoExistir` (alinha cache inicial 50 ao ledger).
- **Gaps conhecidos (reportados, não corrigidos)**: `salvarResultado`
  (lib/botao/api.ts) muta `pontos_soberania` fora do ledger — só é chamado
  pelo morto `OnlineMatchV2`; `SovMarket` (Feira) lê saldo mas
  compra/venda são stubs (tabelas `cidadela_inventory`/
  `cidadela_market_listings` não existem em nenhuma migração);
  módulos mortos `careerManager/bettingSystem/recoverySystem/antiCheat`
  (lib/financial) não são importados por ninguém.
- **Verificação**: testes runtime Node (28 invariantes: config, SQL, chaves,
  wire-in do celular) OK; `tsc --noEmit` 0 erros; `npm run build` OK.

## Celular da Cidadela como overlay com menu de apps (2026-08-20, 4ª passada)

Reestruturação completa do celular (§1–§19 do prompt mestre). O botão Celular
no header da Cidadela e as cards de notificações (`PainelReputacao`/
`PainelMundo`) foram removidos — a Cidadela fica limpa e eventos chegam ao
celular. O CelularFixo virou overlay de tela cheia (`fixed inset-0`) com
container max-w-md, cabeçalho e botão Fechar. `CelularConversas` ganhou menu
inicial com 6 app-cards (Contatos / Rede / Missões / Grupo / Feira / Alertas)
em 2 colunas; abrir um app exibe header com voltar-para-menu. `AbaCelular`
estendeu com `"menu"` e `"contatos"` (alias para a lista de conversas);
badge de não-lidas no card Contatos (`naoLidasContatos`). Estado único de
aba; navegação interna por state sem remontar CelularFixo. Rota /cidadela
limpa — só puxa CelularFixo (botFixo sempre disponível, sem CelularConversas
inline). tsc 0 erros; build OK.

## Reestruturação do Modo Carreira — Prompt Mestre (2026-08-20, 3ª passada)

Implementação dos pontos §1–§34 do prompt mestre (personagens-IA, coletiva,
celular único, interface focada, economia/bolsa). Ordem: mapa completo →
tipos/engines → UI → integração no BotaoGame → testes jiti.

- **Jornalista/Bibliotecária/Dirigente são NPCs com systemPrompt** (§1-§2):
  `npc-jornalista` (Cícero Ramos), `npc-bibliotecaria` (Helena Páginas),
  `npc-dirigente` (Dir. Aldemir) em `career/rpg/personagens.ts`; `NpcId`
  estendido em `rpg/types.ts`. Compartilham o AIService (§32 — sem spaghetti de IA).
- **Entrevista Coletiva = IA-jornalista** (§6-§12): `career/entrevistaEngine.ts`
  com contexto escopado (§31: só dados da partida + declarações passadas
  públicas) via `contextoJornalista`/`gerarPerguntaJornalista` (persona IA
  > fallback procedural). `interpretarDeclaracao` classifica provocacao/
  humildade/orgulho/neutro + importância (§11). `registrarEntrevista` guarda
  na memória narrativa (`EventoNarrativo` em `career.memoriaNarrativa`, §5),
  idempotente por `partidaId`. `consequenciasEntrevista` (§12): provocação →
  reação do rival (rel-coes do `memoriaRpg`), headline e post no feed.
- **NADA de segunda entrevista** (§8): `EntrevistaPatrocinio` REMOVIDO; a
  coletiva descartada de `finishTournamentMatch` (Promise.all [coletiva,
  relMed, redes]) virou só `[relMed, redes]`. Única entrevista:
  `components/EntrevistaColetiva.tsx` (intro → q1 → q2 -> COLETAR).
- **onClick SÓ na coleta final** (§9): `concluirColetiva(declaracoes)` é o
  único disparo (recompensa SOV + registrarEntrevista + consequencias +
  persistCareer + fila). Idempotência: `patrocinioPagoPartida === partidaId`
  + guarda de partidaId no registrarEntrevista. ControlledMonetagButton só
  existe no rodapé da EntrevistaColetiva ("Apoie a imprensa") — nunca gateia
  o fluxo da entrevista.
- **Fila de mensagens do celular** (§13-§14): `filaConversasRef` +
  `filaProcessandoRef` no BotaoGame; `enfileirarConversas(novas)` entrega uma
  por vez (2.6s), com toast `📱 Nova mensagem: {nome}` + som `tocarNotificacao()`
  (`src/lib/notificacao.ts`, WebAudio). Relatório médico/redes sociais e
  reações da entrevista SÓ chegam por essa fila.
- **UM celular** (§15): telas `celular`, `celular-conversas` e `suborno`
  REMOVIDAS do Screen. `CelularFixo` ganhou props `prioridade` (ReactNode —
  renderiza SubornoStory/NarrativeModal/ChoiceModal quando há decisão pendente,
  calculados no BotaoGame via `prioridadeCelular`) e `naoLidas` (badge).
  CareerHub sem card/celular interno. `aplicarEscolha` volta ao `hub`.
- **Interface focada** (§16-§18): CareerHub com botões compactos (menu-card
  com icon) Calendário/Bolsa/Tabela → cada um abre em tela própria (`calendario`,
  `economia`, `classificacao` = Screen). Classificação resumida top-5 +
  ZoneLegend. CoachSetup subtítulo reduzido para 1 linha curta.
- **Bolsa de Valores da Cidadela** (§22-§26): `career/bolsaEngine.ts` —
  ATIVOS = clube/ciencia/biblioteca/trilha nomes/fix/setores/yield/cap.
  `evoluirBolsa(bolsa, imp)`: drift determinístico por rodada (`ruidoRodada`
  hash) para setores não-clube; clube reage ao resultado/moral; eventos do
  mundo (crise/cartorio/ritual/provocação/ciência) impactam setores.
  atualiza `patrimonioCidadela`. `pagarDividendos` a cada 3 rodadas,
  idempotente por rodada via `ultimaRodadaBolsa`. `comprarAtivo`/`venderAtivo`
  atualizam carteira com custo médio. Integrado em `finishTournamentMatch` do
  bloco career (antes do persistCareer). Compras/vendas/dividendos passam
  pelo ledger SOV com module `'market'`. `EconomiaScreen.tsx` é a tela do
  módulo (patrimônio da Cidadela + carteira + fila de transações).
- **Pré-existentes corrigidos** sem regressar: `CelularFixo` import ruim
  (`./lib/cidadela/profissoes` → `@/...`), `CelularConversas.onLogin` tipo
  (`| undefined`), `rpgEngine` msgTimestamp indefinido em `aplicarEscolhaRpg`,
  RPCs `cidadela_atualizar_status`/`cidadela_listar_jogadores` agora tipadas
  em `integrations/supabase/types.ts`.
- **Verificação**: `tsc --noEmit` 0 erros, `npm run build` OK. Engines com
  testes jiti runtime (coletiva provocação→rival reage/memória salva;
  idempotência; bolsa determinística/compra/venda/dividendos idempotentes).

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
