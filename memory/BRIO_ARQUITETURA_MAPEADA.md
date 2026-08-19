# BRIO - MAPEAMENTO DA ARQUITETURA EXISTENTE

**FASE 2: Mapeamento da Arquitetura Atual**
**Data:** 2026-08-19
**Objetivo:** Identificar infraestrutura existente para extensão BRIO

---

## 1. SISTEMA DE ROTAS (TanStack Router)

**Localização:** `/src/routes/`

**Rotas Existentes:**
- `/cidadela` - Cidadela de Jogos (já funciona como location/hub)
- `/biblioteca` - Biblioteca de livros (estática, lista livros do Supabase)
- `/gerador` - Gerador de frases (independente)
- `/corretor` - Corretor de texto (independente)
- `/trilha` - Trilha game
- `/botao` - Futebol de Botão (acessado via Cidadela)

**#BRIO-ROTA:** A Cidadela já é uma location. Biblioteca existe mas é estática. Gerador/Corretor são ferramentas isoladas.

---

## 2. SISTEMA LLM (AIService)

**Localização:** `/src/components/botao/ai/AIService.ts`

**Arquitetura:**
- Singleton centralizado `AIService`
- Estratégia: WebLLM on-device (se hardware potente) → templates procedurais (fallback)
- API pública: `generateText(context, promptType)` e `generatePersona(systemPrompt, userPrompt)`

**PromptTypes Existentes:**
- `comentarista` - Comentário sarcástico de partida
- `coletiva` - Pergunta de imprensa
- `medico` - Relatório médico
- `redes_sociais` - Tweet de torcedor
- `noticia` - Manchete de bastidores
- `pracinha` - Voz do robô guia

**#BRIO-LLM:** Sistema LLM já é modular e extensível. Posso adicionar novos PromptTypes (bibliotecaria, forja, resumo, etc.) sem criar nova infraestrutura.

---

## 3. SISTEMA DE PERSONAGENS (RPG)

**Localização:** `/src/components/botao/career/rpg/`

**Arquivos:**
- `personagens.ts` - NPCs com systemPrompt e respostas procedurais
- `types.ts` - NpcId, PersonagemNpc, MemoriaRpg, EventoRpg
- `rpgEngine.ts` - Motor de eventos RPG
- `socialEngine.ts` - Sistema de relacionamentos

**NPCs Existentes:**
- `npc-valeria` - Namorada
- `npc-dario` - Empresário
- `npc-braganca` - Treinador rival
- `npc-corretor` - Desconhecido misterioso
- `npc-donacida` - Mãe
- `npc-torcedor` - Torcedor fiel

**#BRIO-PERSONAGENS:** Sistema de personagens já existe com systemPrompt para LLM e respostas procedurais. Posso adicionar `npc-bibliotecaria` sem criar novo sistema.

---

## 4. SISTEMA DE CELULAR/CONTATOS

**Localização:** `/src/components/botao/career/CelularConversas.tsx`

**Funcionalidades:**
- Lista de conversas (ConversaCelular[])
- Suporte a tipos: patrocinador, namorada, suborno, narrativa, evento, presidente, empresario, medico
- Integração com NPCs do RPG (npcId)
- Eventos RPG com escolhas (dilemas)
- Feed da Rede da Cidadela

**#BRIO-CELULAR:** Sistema de celular já existe e suporta contatos de personagens. Posso adicionar Bibliotecária como contato.

---

## 5. SISTEMA DE MISSÕES/ESCOLHAS

**Localização:** `/src/components/botao/career/`

**Arquivos:**
- `choicesEngine.ts` - Eventos de escolha entre partidas (CHOICE_EVENTS[])
- `narrativeEngine.ts` - Histórias dinâmicas (amoroso, bastidores, traicao, midia)
- `patrocinadorEngine.ts` - Desafios de patrocinador

**Tipos de Escolhas:**
- Afectam: bonusPoder, moralTime, soberania, pressaoTorcida, relacoes
- Podem criar segredos/dívidas narrativas
- Ramificação com desfechos diferentes

**#BRIO-MISSOES:** Sistema de missões/escolhas já existe. Posso criar missões que utilizam Biblioteca/Forja como mecanismo.

---

## 6. SISTEMA DE ESTADO/PERSISTÊNCIA

**Localização:** `/src/components/botao/career/types.ts`

**CareerState Inclui:**
- `coach` - Perfil do treinador
- `conversas` - Conversas do celular
- `memoriaRpg` - Relacionamentos, segredos, eventos vistos
- `feedCidadela` - Posts da Rede da Cidadela
- `narrativa` - Estado de histórias dinâmicas
- `suborno` - Estado de suborno

**Persistência:** localStorage via `CAREER_KEY`

**#BRIO-ESTADO:** Sistema de estado já existe e é extensível. Posso adicionar campos para progresso BRIO.

---

## 7. CIDADELA DOS CLÁSSICOS (Location Existente)

**Localização:** `/src/routes/cidadela.tsx`

**Funcionalidades:**
- Hub de jogos (Trilha, Futebol de Botão, Dama, Xadrez, etc.)
- Intro narrativa (CidadelaIntro, PracinhaIntro)
- Celular da Cidadela (CelularConversas)
- Modais de informação (Sobre, Como Jogar, Soberania)

**#BRIO-LOCATION:** Cidadela já é uma location. Posso adicionar "Biblioteca" e "Forja de Palavras" como sub-locations dentro dela.

---

## 8. BIBLIOTECA EXISTENTE

**Localização:** `/src/routes/biblioteca.tsx`

**Funcionalidades:**
- Lista livros do Supabase (livros.functions.ts)
- Exibe capa, título, autor, descrição, preço
- Link de afiliado para compra
- Estática, sem interação com LLM

**#BRIO-BIBLIOTECA:** Biblioteca existe mas é estática. Posso transformá-la em location interativa com Bibliotecária IA e resumos inteligentes.

---

## 9. GERADOR/CORRETOR EXISTENTES

**Localização:** `/src/routes/gerador.tsx`, `/src/routes/corretor.tsx`

**Funcionalidades:**
- Gerador: gera frases de diferentes categorias
- Corretor: corrige texto (provavelmente template)
- Rotas independentes, não integradas ao universo narrativo

**#BRIO-FORJA:** Gerador/Corretor existem mas são ferramentas isoladas. Posso integrá-los como "Forja de Palavras" dentro da Cidadela.

---

## 10. PRACINHA (Assistente/Guia)

**Localização:** `/src/components/PracinhaGuide.tsx`

**Funcionalidades:**
- Robô militar retrô, guia da Cidadela
- Aparece no canto inferior direito
- Assistente contextual

**#BRIO-PRACINHA:** Pracinha já é personagem/assistente. Não deve ser confundido com Bibliotecária. São personagens diferentes.

---

## 11. SUPABASE (Backend)

**Localização:** `/supabase/migrations/`

**Tabelas Relevantes:**
- `livros` - Tabela de livros (biblioteca.sql)
- `botao_usuarios` - Usuários do Futebol de Botão
- `botao_frases_ia` - Frases procedurais para IA

**#BRIO-SUPABASE:** Supabase já tem tabela de livros. Posso adicionar tabelas para livros da Biblioteca BRIO se necessário.

---

## 12. COMPONENTES UI REUTILIZÁVEIS

**Localização:** `/src/components/`

**Componentes Relevantes:**
- `InfoModal.tsx` - Modal de informação
- `ChoiceModal.tsx` - Modal de escolhas (career)
- `NarrativeModal.tsx` - Modal narrativo (career)
- `CelularConversas.tsx` - Interface de celular

**#BRIO-UI:** Componentes de modal e celular já existem. Posso reutilizá-los para interações BRIO.

---

## RESUMO DA ARQUITETURA

**O QUE JÁ EXISTE:**
✅ Sistema de rotas (TanStack Router)
✅ Sistema LLM centralizado (AIService)
✅ Sistema de personagens com systemPrompt (RPG)
✅ Sistema de celular/contatos (CelularConversas)
✅ Sistema de missões/escolhas (choicesEngine, narrativeEngine)
✅ Sistema de estado/persistência (CareerState)
✅ Location Cidadela dos Clássicos
✅ Biblioteca estática
✅ Gerador/Corretor isolados
✅ Pracinha como assistente/guia
✅ Supabase com tabela de livros
✅ Componentes UI reutilizáveis (modais, celular)

**O QUE PRECISA SER EXTENDIDO:**
🔄 Adicionar PromptTypes ao AIService (bibliotecaria, forja, resumo)
🔄 Adicionar NPC Bibliotecária ao sistema de personagens
🔄 Transformar Biblioteca em location interativa
🔄 Integrar Gerador/Corretor como "Forja de Palavras"
🔄 Adicionar Bibliotecária como contato no celular
🔄 Criar missões que utilizam Biblioteca/Forja
🔄 Adicionar campos BRIO ao CareerState (se necessário)

**O QUE NÃO PRECISA SER CRIADO:**
❌ Novo sistema de rotas (usar TanStack Router existente)
❌ Novo sistema LLM (usar AIService existente)
❌ Novo sistema de personagens (usar RPG existente)
❌ Novo sistema de celular (usar CelularConversas existente)
❌ Nova location do zero (extender Cidadela existente)
❌ Novos componentes UI (reutilizar modais/celular existentes)

---

## PRÓXIMA FASE

**FASE 3:** Identificação detalhada do sistema LLM existente
- Revisar AIService.ts completamente
- Identificar pontos de extensão para novos PromptTypes
- Planejar integração de Bibliotecária/Forja

**#BRIO-ARQUITETURA-MAPEADA** ✅
