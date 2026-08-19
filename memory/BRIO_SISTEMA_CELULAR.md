# BRIO - SISTEMA DE CELULAR/CONTATOS EXISTENTE

**FASE 6: Identificação do Sistema de Celular/Contatos**
**Data:** 2026-08-19
**Objetivo:** Identificar como o sistema de celular/contatos funciona para extensão BRIO

---

## 1. COMPONENTE CelularConversas

**Localização:** `/src/components/botao/career/CelularConversas.tsx`

**#BRIO-CELULAR-COMPONENTE:** CelularConversas é o componente principal do celular. Já suporta contatos de personagens e integração com NPCs do RPG.

---

## 2. TIPO ConversaCelular

**Localização:** `/src/components/botao/career/types.ts` (linhas 101-128)

**Estrutura:**
```typescript
export type ConversaCelular = {
  id: string;
  tipo:
    | "patrocinador"
    | "namorada"
    | "suborno"
    | "narrativa"
    | "evento"
    | "presidente"
    | "empresario"
    | "medico";
  nome: string;
  avatar: string;
  cargo: string;
  mensagens: Array<{
    id: string;
    texto: string;
    remetente: "eu" | "outro";
    timestamp: string;
  }>;
  naoLida: boolean;
  /** NPC do RPG que responde em tempo real nesta conversa. */
  npcId?: import("./rpg/types").NpcId | undefined;
  /** Evento RPG com escolhas (dilema) anexado à conversa. */
  eventoRpg?:
    | { eventoId: string; respondido: boolean; tom: "drama" | "suspense" | "terror" }
    | undefined;
};
```

**#BRIO-CELULAR-TIPO:** ConversaCelular já suporta npcId para integração com NPCs do RPG. Posso adicionar Bibliotecária como contato.

---

## 3. PROPS DO CelularConversas

**Localização:** `/src/components/botao/career/CelularConversas.tsx`

**Props:**
```typescript
interface CelularConversasProps {
  conversas: ConversaCelular[];
  userId: string | null;
  nomeJogador: string;
  onEnviarMensagem: (conversaId: string, texto: string) => void;
  onExcluirConversa: (conversaId: string) => void;
  onVoltar: () => void;
}
```

**#BRIO-CELULAR-PROPS:** CelularConversas recebe lista de conversas e callbacks. Posso passar conversas com Bibliotecária.

---

## 4. INTEGRAÇÃO COM NPCS DO RPG

**Localização:** `/src/components/botao/career/CelularConversas.tsx`

**#BRIO-CELULAR-NPC:** CelularConversas já usa npcId para integrar com NPCs do RPG. Quando o jogador envia mensagem, o NPC responde via LLM.

---

## 5. EVENTOS RPG NO CELULAR

**Localização:** `/src/components/botao/career/types.ts` (linhas 124-127)

**eventoRpg:**
```typescript
eventoRpg?:
  | { eventoId: string; respondido: boolean; tom: "drama" | "suspense" | "terror" }
  | undefined;
```

**#BRIO-CELULAR-EVENTOS:** CelularConversas já suporta eventos RPG anexados às conversas. Posso anexar eventos de Biblioteca/Forja.

---

## 6. ESTADO DAS CONVERSAS

**Localização:** `/src/components/botao/career/types.ts` (linhas 163)

**CareerState:**
```typescript
export type CareerState = {
  // ...
  conversas: ConversaCelular[];
  // ...
};
```

**#BRIO-CELULAR-ESTADO:** conversas é armazenado no CareerState. Posso adicionar conversas com Bibliotecária.

---

## 7. PONTOS DE EXTENSÃO PARA BRIO

### 7.1 Adicionar Tipo de Conversa

**Arquivo:** `/src/components/botao/career/types.ts`

**#BRIO-CELULAR-EXTENSAO-TIPO:** Adicionar "bibliotecaria":
```typescript
export type ConversaCelular = {
  tipo:
    | "patrocinador"
    | "namorada"
    | "suborno"
    | "narrativa"
    | "evento"
    | "presidente"
    | "empresario"
    | "medico"
    | "bibliotecaria";  // #BRIO: Conversa com Bibliotecária
  // ...
};
```

### 7.2 Criar Conversa com Bibliotecária

**#BRIO-CELULAR-EXTENSAO-CRIAR:** Criar conversa:
```typescript
const conversaBibliotecaria: ConversaCelular = {
  id: "conv-bibliotecaria",
  tipo: "bibliotecaria",
  nome: "Bibliotecária",
  avatar: "📚",
  cargo: "Guardiã do Conhecimento",
  npcId: "npc-bibliotecaria",
  mensagens: [
    {
      id: "msg-1",
      texto: "Bem-vindo à Biblioteca dos Clássicos. O que busca hoje?",
      remetente: "outro",
      timestamp: new Date().toISOString(),
    },
  ],
  naoLida: true,
};
```

### 7.3 Adicionar ao CareerState

**#BRIO-CELULAR-EXTENSAO-ESTADO:** Adicionar conversa ao CareerState:
```typescript
const novoState: CareerState = {
  // ...
  conversas: [
    ...state.conversas,
    conversaBibliotecaria,
  ],
  // ...
};
```

---

## 8. INTEGRAÇÃO COM LLM

**#BRIO-CELULAR-LLM:** Quando o jogador envia mensagem para Bibliotecária, CelularConversas usa npcId para chamar `generatePersona` do AIService.

---

## 9. RESUMO DA EXTENSÃO CELULAR/CONTATOS

**O QUE PRECISA SER ALTERADO:**
🔄 Adicionar "bibliotecaria" ao tipo ConversaCelular
🔄 Criar conversa com Bibliotecária
🔄 Adicionar conversa ao CareerState

**O QUE NÃO PRECISA SER ALTERADO:**
❌ Estrutura do CelularConversas (já suporta npcId)
❌ Integração com NPCs do RPG (já funciona)
❌ Sistema de eventos RPG (já funciona)
❌ Armazenamento no CareerState (já funciona)

**#BRIO-CELULAR-IDENTIFICADO** ✅
