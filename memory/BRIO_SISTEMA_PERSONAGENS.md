# BRIO - SISTEMA DE PERSONAGENS EXISTENTE

**FASE 4: Identificação do Sistema de Personagens**
**Data:** 2026-08-19
**Objetivo:** Identificar pontos de extensão do sistema de personagens para BRIO

---

## 1. ARQUITETURA DO SISTEMA RPG

**Localização:** `/src/components/botao/career/rpg/`

**Arquivos:**
- `personagens.ts` - Definição de NPCs com systemPrompt e respostas procedurais
- `types.ts` - Tipos do sistema (NpcId, PersonagemNpc, MemoriaRpg, EventoRpg)
- `rpgEngine.ts` - Motor de eventos RPG
- `socialEngine.ts` - Sistema de relacionamentos
- `eventos.ts` - Eventos RPG disponíveis

**#BRIO-PERSONAGENS-ARQUITETURA:** Sistema de personagens já existe com systemPrompt para LLM e respostas procedurais. Posso adicionar `npc-bibliotecaria` sem criar novo sistema.

---

## 2. TIPO NpcId

**Localização:** `/src/components/botao/career/rpg/types.ts` (linhas 9-15)

**NpcIds Existentes:**
```typescript
export type NpcId =
  | "npc-valeria"      // Namorada
  | "npc-dario"        // Empresário
  | "npc-braganca"     // Treinador rival
  | "npc-corretor"     // Desconhecido misterioso
  | "npc-donacida"     // Mãe
  | "npc-torcedor";    // Torcedor fiel
```

**#BRIO-PERSONAGENS-NPCID:** Posso adicionar `"npc-bibliotecaria"` ao tipo NpcId.

---

## 3. TIPO PersonagemNpc

**Localização:** `/src/components/botao/career/rpg/types.ts` (linhas 17-26)

**Estrutura:**
```typescript
export interface PersonagemNpc {
  id: NpcId;
  nome: string;
  avatar: string;
  cargo: string;
  /** System prompt usado quando a LLM local está disponível. */
  systemPrompt: string;
  /** Relacionamento inicial (-100..100). */
  relacaoInicial: number;
}
```

**#BRIO-PERSONAGENS-STRUCT:** Estrutura já suporta systemPrompt customizado. Posso criar PersonagemNpc para Bibliotecária.

---

## 4. PERSONAGENS EXISTENTES

**Localização:** `/src/components/botao/career/rpg/personagens.ts` (linhas 9-78)

**PERSONAGENS:**
```typescript
export const PERSONAGENS: Record<NpcId, PersonagemNpc> = {
  "npc-valeria": {
    id: "npc-valeria",
    nome: "Valéria",
    avatar: "💛",
    cargo: "Namorada",
    relacaoInicial: 55,
    systemPrompt:
      "Você é Valéria, namorada do treinador. Apoia a carreira dele, mas sente " +
      "falta de atenção e cobra presença. Fala com carinho e ironia leve. Nunca " +
      "sabe de resultados antes dele contar. Responda em 1-2 frases, informal.",
  },
  "npc-dario": {
    id: "npc-dario",
    nome: "Dário Fontoura",
    avatar: "🕴️",
    cargo: "Empresário",
    relacaoInicial: 20,
    systemPrompt:
      "Você é Dário Fontoura, empresário de futebol ambicioso e calculista. " +
      "Elogia quando convém, pressiona quando há dinheiro em jogo e sempre " +
      "sugere 'atalhos'. Nunca revela tudo o que sabe. Responda em 1-2 frases, " +
      "tom de negócios.",
  },
  "npc-braganca": {
    id: "npc-braganca",
    nome: "Téc. Bragança",
    avatar: "😏",
    cargo: "Treinador rival",
    relacaoInicial: -35,
    systemPrompt:
      "Você é o técnico Bragança, rival histórico do jogador. Provocador, " +
      "irônico, adora minimizar as vitórias alheias e espalhar rumores. Por " +
      "trás da arrogância, respeita quem resiste. Responda em 1-2 frases, deboche.",
  },
  "npc-corretor": {
    id: "npc-corretor",
    nome: "O Corretor",
    avatar: "🕶️",
    cargo: "Desconhecido",
    relacaoInicial: -10,
    systemPrompt:
      "Você é 'O Corretor', figura misteriosa do submundo da Cidadela. Fala " +
      "pouco, por metáforas, e sempre oferece caminhos perigosos com calma " +
      "inquietante. Nunca ameaça diretamente — insinua. Responda em 1-2 frases " +
      "curtas, frias.",
  },
  "npc-donacida": {
    id: "npc-donacida",
    nome: "Dona Cida",
    avatar: "👵",
    cargo: "Mãe",
    relacaoInicial: 85,
    systemPrompt:
      "Você é Dona Cida, mãe do treinador. Amorosa, simples, orgulhosa, mas " +
      "preocupada com o filho se envolvendo em coisa errada. Pergunta se ele " +
      "comeu direito. Responda em 1-2 frases, jeito de mãe.",
  },
  "npc-torcedor": {
    id: "npc-torcedor",
    nome: "Zé do Arquibanco",
    avatar: "📣",
    cargo: "Torcedor fiel",
    relacaoInicial: 30,
    systemPrompt:
      "Você é Zé do Arquibanco, torcedor fanático do clube do jogador. Vive o " +
      "time, elogia vitórias com exagero e desaba em crises. Fala gíria de " +
      "arquibancada. Responda em 1-2 frases, passional.",
  },
};
```

**#BRIO-PERSONAGENS-EXISTENTES:** Cada NPC tem systemPrompt específico para LLM local. Posso seguir o mesmo padrão para Bibliotecária.

---

## 5. RESPOSTAS PROCEDURAIS

**Localização:** `/src/components/botao/career/rpg/personagens.ts` (linhas 103-256)

**Estrutura:**
```typescript
type Banco = Partial<Record<ReturnType<typeof faixaRelacao>, string[]>>;

const RESPOSTAS: Record<NpcId, Banco> = {
  "npc-valeria": {
    inimigo: ["A gente precisa conversar sério..."],
    hostil: ["Você só lembra de mim quando perde, né?"],
    desconhecido: ["Oi, sumido. O time tá te consumindo..."],
    conhecido: ["Tô torcendo por você, sabia?"],
    aliado: ["Você tá brilhando, amor..."],
    amigo: ["Orgulho de você, meu amor..."],
    leal: ["Conta comigo pra tudo..."],
  },
  // ... outros NPCs ...
};
```

**Faixas de Relacionamento:**
- `inimigo` (-100 a -60)
- `hostil` (-60 a -25)
- `desconhecido` (-25 a 15)
- `conhecido` (15 a 45)
- `aliado` (45 a 70)
- `amigo` (70 a 90)
- `leal` (90 a 100)

**#BRIO-PERSONAGENS-PROCEDURAL:** Cada NPC tem banco de respostas por faixa de relacionamento. Posso criar banco para Bibliotecária.

---

## 6. FUNÇÕES AUXILIARES

**Localização:** `/src/components/botao/career/rpg/personagens.ts`

**Funções:**
```typescript
export function personagem(id: NpcId): PersonagemNpc {
  return PERSONAGENS[id];
}

export function relacaoInicial(id: NpcId): number {
  return PERSONAGENS[id].relacaoInicial;
}

export function rotuloRelacao(score: number): string {
  // Retorna rótulo elegante da faixa (ex.: "Amigo de verdade")
}

export function respostaProcedural(id: NpcId, score: number): string {
  // Retorna resposta procedural conforme relacionamento
}
```

**#BRIO-PERSONAGENS-FUNCOES:** Funções auxiliares já existem. Posso usar para Bibliotecária.

---

## 7. MEMÓRIA RPG

**Localização:** `/src/components/botao/career/rpg/types.ts` (linhas 54-68)

**Estrutura:**
```typescript
export interface MemoriaRpg {
  /** Relacionamento por NPC (-100..100). */
  relacoes: Partial<Record<NpcId, number>>;
  /** Segredos/dívidas pendentes que podem retornar como evento. */
  segredos: SegredoNarrativo[];
  /** IDs de eventos RPG já disparados (não repetir o mesmo arco). */
  eventosVistos: string[];
  /** Última rodada em que um evento RPG disparou (espaçamento). */
  ultimaRodadaEvento: number;
  /** Contagem de derrotas seguidas (gatilho de crise/demissão). */
  derrotasSeguidas: number;
  /** Se o treinador já foi demitido alguma vez nesta carreira. */
  jaFoiDemitido: boolean;
}
```

**#BRIO-PERSONAGENS-MEMORIA:** MemóriaRpg já armazena relacionamentos por NpcId. Posso armazenar relacionamento com Bibliotecária.

---

## 8. EVENTOS RPG

**Localização:** `/src/components/botao/career/rpg/types.ts` (linhas 110-119)

**Estrutura:**
```typescript
export interface EventoRpg {
  id: string;
  /** Quem envia no celular (NPC remetente). */
  remetente: NpcId;
  titulo: string;
  texto: string;
  escolhas: EscolhaRpg[];
  /** Tom visual: suspense/terror muda o estilo do modal. */
  tom: "drama" | "suspense" | "terror";
}
```

**#BRIO-PERSONAGENS-EVENTOS:** Eventos RPG já usam NpcId como remetente. Posso criar eventos com Bibliotecária como remetente.

---

## 9. INTEGRAÇÃO COM CELULAR

**Localização:** `/src/components/botao/career/types.ts` (linhas 101-128)

**ConversaCelular:**
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
  mensagens: Array<{...}>;
  naoLida: boolean;
  /** NPC do RPG que responde em tempo real nesta conversa. */
  npcId?: import("./rpg/types").NpcId | undefined;
  /** Evento RPG com escolhas (dilema) anexado à conversa. */
  eventoRpg?: {...} | undefined;
};
```

**#BRIO-PERSONAGENS-CELULAR:** ConversaCelular já suporta npcId. Posso adicionar Bibliotecária como contato no celular.

---

## 10. PONTOS DE EXTENSÃO PARA BRIO

### 10.1 Adicionar NpcId

**Arquivo:** `/src/components/botao/career/rpg/types.ts`

**#BRIO-PERSONAGENS-EXTENSAO-NPCID:** Adicionar `"npc-bibliotecaria"`:
```typescript
export type NpcId =
  | "npc-valeria"
  | "npc-dario"
  | "npc-braganca"
  | "npc-corretor"
  | "npc-donacida"
  | "npc-torcedor"
  | "npc-bibliotecaria";  // #BRIO: Bibliotecária da Cidadela dos Clássicos
```

### 10.2 Adicionar Personagem

**Arquivo:** `/src/components/botao/career/rpg/personagens.ts`

**#BRIO-PERSONAGENS-EXTENSAO-PERSONAGEM:** Adicionar Bibliotecária ao PERSONAGENS:
```typescript
export const PERSONAGENS: Record<NpcId, PersonagemNpc> = {
  // ... personagens existentes ...
  
  "npc-bibliotecaria": {
    id: "npc-bibliotecaria",
    nome: "Bibliotecária",
    avatar: "📚",
    cargo: "Guardiã do Conhecimento",
    relacaoInicial: 50,
    systemPrompt:
      "Você é a Bibliotecária da Cidadela dos Clássicos. Sábia, acolhedora e misteriosa. " +
      "Guardiã do conhecimento desde eras passadas. Fala com elegância e sabedoria. " +
      "Ajude o jogador a encontrar livros, resumir conteúdos e descobrir pistas. " +
      "Responda em 1-2 frases, tom de bibliotecária antiga.",
  },
};
```

### 10.3 Adicionar Respostas Procedurais

**Arquivo:** `/src/components/botao/career/rpg/personagens.ts`

**#BRIO-PERSONAGENS-EXTENSAO-RESPOSTAS:** Adicionar banco de respostas:
```typescript
const RESPOSTAS: Record<NpcId, Banco> = {
  // ... respostas existentes ...
  
  "npc-bibliotecaria": {
    inimigo: [
      "Você profanou o conhecimento. Saia da Biblioteca.",
      "Não merece acessar os pergaminhos sagrados.",
    ],
    hostil: [
      "Seus métodos são questionáveis, treinador.",
      "A Biblioteca não tolera desrespeito ao saber.",
    ],
    desconhecido: [
      "Bem-vindo à Biblioteca dos Clássicos. O que busca?",
      "Os livros esperam. Qual é sua dúvida?",
    ],
    conhecido: [
      "É bom ver você novamente, treinador. Há novos livros.",
      "O conhecimento flui melhor quando há constância.",
    ],
    aliado: [
      "Você tem respeitado o saber. A Biblioteca agradece.",
      "Os pergaminhos revelam seus segredos a quem é digno.",
    ],
    amigo: [
      "Ah, meu estimado visitante. Os livros sentem sua presença.",
      "Você é um guardião do conhecimento, assim como eu.",
    ],
    leal: [
      "Você é um verdadeiro erudito. A Biblioteca é sua casa.",
      "Juntos, preservaremos a sabedoria para as gerações futuras.",
    ],
  },
};
```

### 10.4 Adicionar Eventos RPG

**Arquivo:** `/src/components/botao/career/rpg/eventos.ts`

**#BRIO-PERSONAGENS-EXTENSAO-EVENTOS:** Adicionar eventos com Bibliotecária:
```typescript
export const EVENTOS_RPG: EventoRpg[] = [
  // ... eventos existentes ...
  
  {
    id: "livro-perdido",
    remetente: "npc-bibliotecaria",
    titulo: "O Pergaminho Perdido",
    texto: "Treinador, encontrei um pergaminho antigo que menciona seu nome. Parece conter uma pista sobre a origem da Cidadela. Deseja investigar?",
    escolhas: [
      {
        texto: "Investigar agora",
        desfecho: "Você abre o pergaminho. Revela um mapa antigo da Cidadela com marcações misteriosas.",
        efeitos: { soberania: 5, relacao: { npc: "npc-bibliotecaria", delta: 10 } },
      },
      {
        texto: "Deixar para depois",
        desfecho: "A Bibliotecária guarda o pergaminho. 'Quando estiver pronto, ele estará aqui.'",
        efeitos: { relacao: { npc: "npc-bibliotecaria", delta: -5 } },
      },
    ],
    tom: "drama",
  },
];
```

### 10.5 Adicionar Tipo de Conversa

**Arquivo:** `/src/components/botao/career/types.ts`

**#BRIO-PERSONAGENS-EXTENSAO-CONVERSA:** Adicionar tipo "bibliotecaria":
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

---

## 11. INTEGRAÇÃO COM LLM

**#BRIO-PERSONAGENS-LLM:** Usar `generatePersona` do AIService com systemPrompt da Bibliotecária:

```typescript
import { AIService } from "@/components/botao/ai/AIService";
import { personagem } from "@/components/botao/career/rpg/personagens";

const bibliotecaria = personagem("npc-bibliotecaria");
const resposta = await AIService.generatePersona(
  bibliotecaria.systemPrompt,
  "Qual livro você recomenda para aprender estratégia?"
);
```

---

## 12. INTEGRAÇÃO COM CELULAR

**#BRIO-PERSONAGENS-CELULAR:** Adicionar Bibliotecária como contato:

```typescript
const novaConversa: ConversaCelular = {
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

---

## 13. RESUMO DA EXTENSÃO PERSONAGENS

**O QUE PRECISA SER ALTERADO:**
🔄 Adicionar `"npc-bibliotecaria"` ao tipo `NpcId`
🔄 Adicionar Bibliotecária ao objeto `PERSONAGENS`
🔄 Adicionar banco de respostas procedurais para Bibliotecária
🔄 Adicionar eventos RPG com Bibliotecária como remetente
🔄 Adicionar tipo `"bibliotecaria"` ao `ConversaCelular`

**O QUE NÃO PRECISA SER ALTERADO:**
❌ Estrutura do sistema de personagens (já é extensível)
❌ Sistema de relacionamentos (já funciona)
❌ Integração com LLM (já funciona via systemPrompt)
❌ Integração com celular (já suporta npcId)
❌ Sistema de memória RPG (já armazena relacionamentos)

**#BRIO-PERSONAGENS-IDENTIFICADO** ✅
