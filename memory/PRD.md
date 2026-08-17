# Phrase Muse / Pracinha — PRD

## Problema original
> Projeto Lovable com jogo de Futebol de Botão em `/cidadela`. O usuário queria (a) transformar o modo Torneio em uma experiência de gamificação completa (Modo Treinador/Carreira) com storytelling, notícias entre rodadas, pontos de soberania escassos e escolhas interativas que afetam o resultado; (b) corrigir o bug em que, a partir da 2ª rodada, o CPU não jogava e o chute do usuário era interrompido ao soltar; (c) sem alterar a lógica de jogo (`physics.ts`, `ai.ts`).

## Arquitetura
- Vite + React 19 + TypeScript + Tailwind 4 (Lovable stack)
- Supabase (auth + realtime para multiplayer online — fora do escopo desta etapa)
- Runtime: Vite dev na porta 3000 via wrapper `/app/frontend/package.json` chamado pelo supervisor

## Personas
- Jogador solo que quer viver a carreira de treinador (storytelling + torneio local)
- Jogador competitivo que joga online contra outros usuários (multiplayer — mantido)

## O que foi implementado (17 ago 2026)
### Modo Treinador (novo)
- `src/components/botao/career/types.ts` — Coach, Choice, ChoiceEvent, Headline, CareerState, tabela de POINTS
- `src/components/botao/career/careerStorage.ts` — persistência em localStorage `botao:career:v1`
- `src/components/botao/career/newsGenerator.ts` — templates de manchetes (estilo PS2, ~30 templates: geral, seu-time, polêmica, coletiva)
- `src/components/botao/career/choicesEngine.ts` — 5 eventos de escolha entre partidas (craque com dor, coletiva, joia da base, torcida, treino intensivo)
- `src/components/botao/career/CoachSetup.tsx` — fluxo storytelling de 6 etapas (3 narrativas + nome/apelido/cidade + estilo tático + bio)
- `src/components/botao/career/NewsFeed.tsx` — jornal do torneio
- `src/components/botao/career/SovereigntyPanel.tsx` — painel de soberania com níveis Aprendiz→Promessa→Consolidado→Estrategista→Ídolo→Lenda
- `src/components/botao/career/ChoiceModal.tsx` — modal de escolha entre partidas
- `BotaoGame.tsx` — novas telas `coach-setup` e `choice`, hub renderiza SovereigntyPanel + NewsFeed; pontuação escassa (V+3/E+1/D-3, campeão+20, vice+15, 3º+10, 4º+5, título Amador+100/Prof+250/Lenda+500)

### Correção de bug (crítico)
- `MatchView.tsx` L95-103: novo useEffect que reseta `hasShotThisTurnRef.current = false` sempre que `turn` volta para `userSide` em modo offline (era resetado só em online — causa raiz do "chute interrompido")
- `MatchView.tsx` L462-479: `turnTimer` refatorado — removida a dependência circular do próprio state (que causava loop de auto-recriação), removido state `turnTimer`
- Como `MatchView` é compartilhado offline↔online, a correção vale para ambos os modos

### Escala de Soberania (conforme pedido do usuário)
- Vitória +3 · Empate +1 · Derrota -3
- Campeão +20 · Vice +15 · 3º +10 · 4º +5
- Classificou mata-mata +5
- Título Amador +100 · Profissional +250 · Lenda +500
- Bônus por escolhas: "goleada" +5/-3 · "respeito" +2 · treino puxado ±poder

### Impacto das escolhas no jogo
- `bonusProximaPartida` (número) alimenta uma força extra/menor no seu time só na próxima partida
- `moralTime` (0-100) muda com cada resultado e cada escolha
- Manchetes reagem às escolhas ("Zebra!", "Polêmica", "Coletiva")

## Backlog priorizado
- **P0** — Aplicar `bonusProximaPartida` efetivamente no `team.power` da MatchView antes de zerar (atualmente é persistido mas o efeito no jogo ainda depende da MatchView ler; recomenda-se `boostedPower = userTeam.power + career.bonusProximaPartida`)
- **P0** — Consolidar Supabase client em singleton (warning "Multiple GoTrueClient instances")
- **P1** — Splitar MatchView.tsx (819 linhas) em `useMatchLoop`, `useMatchInput`, `useTurnTimer`, `PitchCanvas`
- **P1** — Replicar o Modo Treinador para o **multiplayer online** (torneio online com soberania, notícias, escolhas — hoje só o offline tem)
- **P1** — Tela de perfil do treinador no menu do Botão (mostrar histórico de campanhas, títulos, hall of fame)
- **P2** — Tabela de líderes de soberania puxando do Supabase (`botao_usuarios.pontos_soberania`)
- **P2** — Placeholder de anúncio vazio no topo de todas as páginas — esconder quando sem anúncio
- **P2** — Manchetes com IA (Gemini/Claude) opcional, além dos templates
- **P2** — Cutscenes narradas / narrador de partida (baseado no que aconteceu no canvas)

## Status atual
- Frontend rodando em https://bdfc4fbf-cbdf-4466-961f-4370f6b55bc0.preview.emergentagent.com/cidadela
- Testing agent (iteration_1.json): 100% dos cenários solicitados passaram
- Bug de rodada 2+ ELIMINADO (verificado com 3 chutes sequenciais + resposta da CPU entre eles)
