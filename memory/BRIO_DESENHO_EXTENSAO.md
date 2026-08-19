# BRIO - DESENHO DA EXTENSÃO

**FASE 9: Desenho da Extensão BRIO**
**Data:** 2026-08-19
**Objetivo:** Consolidar aprendizados e desenhar a arquitetura da extensão BRIO

---

## 1. VISÃO GERAL

**BRIO** é uma camada de jogo narrativa integrada ao universo da Cidadela dos Clássicos. Transforma funcionalidades existentes (biblioteca, gerador, corretor) em elementos de jogo (locations, personagens, missões, interações).

**Princípios:**
- Extensão, não reconstrução
- Reuso de sistemas existentes (LLM, personagens, mapa, celular, missões, estado)
- Narrativa imersiva com personagens e locations
- Integração total com o universo da Cidadela

---

## 2. ARQUITETURA BRIO

### 2.1 Camadas

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE UI                          │
│  - BibliotecaBRIO (componente)                           │
│  - ForjaPalavras (componente)                            │
│  - CelularConversas (reuso)                              │
│  - ChoiceModal (reuso)                                  │
│  - NarrativeModal (reuso)                                │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 CAMADA DE LOCATIONS                      │
│  - Cidadela dos Clássicos (extensão)                    │
│    └─ Biblioteca dos Clássicos (nova)                   │
│    └─ Forja de Palavras (nova)                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 CAMADA DE PERSONAGENS                     │
│  - Bibliotecária (novo NPC)                             │
│  - Mestre da Forja (novo NPC)                           │
│  - Pracinha (reuso)                                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  CAMADA DE LLM                           │
│  - AIService (extensão)                                 │
│    └─ PromptType: bibliotecaria, forja, resumo, etc.   │
│    └─ AIContext: campos específicos BRIO                │
│    └─ generatePersona: conversa com Bibliotecária       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                CAMADA DE MISSÕES                         │
│  - ChoiceEvents (extensão)                              │
│  - NarrativeEngine (extensão)                           │
│  - Eventos RPG (extensão)                               │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  CAMADA DE ESTADO                        │
│  - CareerState (extensão)                               │
│    └─ progressoBiblioteca                               │
│    └─ progressoForja                                    │
│    └─ missaoBibliotecaAtiva                             │
│    └─ missaoForjaAtiva                                  │
│  - MemoriaRpg (reuso)                                   │
│    └─ relacoes: npc-bibliotecaria                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 CAMADA DE CELULAR                        │
│  - CelularConversas (reuso)                             │
│    └─ Conversa: bibliotecaria                           │
│    └─ npcId: npc-bibliotecaria                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. COMPONENTES BRIO

### 3.1 BibliotecaBRIO

**Localização:** `/src/components/botao/career/BibliotecaBRIO.tsx`

**Funcionalidades:**
- Interface da Biblioteca dos Clássicos
- Lista de livros (reuso de livros.functions.ts)
- Resumos inteligentes (integração com AIService)
- Chat com Bibliotecária IA (integração com generatePersona)
- Pergaminhos descobertos (missões)
- Progresso de leitura

**Props:**
```typescript
interface BibliotecaBRIOProps {
  onBack: () => void;
  careerState: CareerState;
  onAtualizarState: (state: CareerState) => void;
}
```

**Estrutura:**
```tsx
function BibliotecaBRIO({ onBack, careerState, onAtualizarState }: BibliotecaBRIOProps) {
  // Estado local
  const [livroSelecionado, setLivroSelecionado] = useState<Livro | null>(null);
  const [chatAberto, setChatAberto] = useState(false);
  
  // Renderização
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1a2e_0%,#0f0f1a_55%)]">
      {/* Header com botão voltar */}
      <header className="p-4">
        <button onClick={onBack}>← Voltar para Cidadela</button>
        <h1>Biblioteca dos Clássicos</h1>
      </header>
      
      {/* Lista de livros */}
      <div className="grid gap-4 p-4">
        {livros.map(livro => (
          <LivroCard
            key={livro.id}
            livro={livro}
            aoSelecionar={() => setLivroSelecionado(livro)}
            aoResumir={() => gerarResumo(livro)}
          />
        ))}
      </div>
      
      {/* Chat com Bibliotecária */}
      {chatAberto && (
        <ChatBibliotecaria
          npcId="npc-bibliotecaria"
          aoFechar={() => setChatAberto(false)}
        />
      )}
      
      {/* Detalhes do livro */}
      {livroSelecionado && (
        <LivroDetalhes
          livro={livroSelecionado}
          aoFechar={() => setLivroSelecionado(null)}
        />
      )}
    </div>
  );
}
```

### 3.2 ForjaPalavras

**Localização:** `/src/components/botao/career/ForjaPalavras.tsx`

**Funcionalidades:**
- Interface da Forja de Palavras
- Gerador de textos (integração com AIService)
- Corretor de textos (integração com AIService)
- Frases filosóficas (integração com AIService)
- Progresso de criatividade

**Props:**
```typescript
interface ForjaPalavrasProps {
  onBack: () => void;
  careerState: CareerState;
  onAtualizarState: (state: CareerState) => void;
}
```

**Estrutura:**
```tsx
function ForjaPalavras({ onBack, careerState, onAtualizarState }: ForjaPalavrasProps) {
  // Estado local
  const [modo, setModo] = useState<"gerar" | "corrigir" | "filosofia">("gerar");
  const [textoOriginal, setTextoOriginal] = useState("");
  const [resultado, setResultado] = useState("");
  
  // Renderização
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#2a1a1e_0%,#1a0f1a_55%)]">
      {/* Header com botão voltar */}
      <header className="p-4">
        <button onClick={onBack}>← Voltar para Cidadela</button>
        <h1>Forja de Palavras</h1>
      </header>
      
      {/* Seletor de modo */}
      <div className="flex gap-2 p-4">
        <button onClick={() => setModo("gerar")}>Gerar</button>
        <button onClick={() => setModo("corrigir")}>Corrigir</button>
        <button onClick={() => setModo("filosofia")}>Filosofia</button>
      </div>
      
      {/* Área de input */}
      <textarea
        value={textoOriginal}
        onChange={(e) => setTextoOriginal(e.target.value)}
        placeholder={modo === "corrigir" ? "Cole seu texto aqui..." : "Descreva o que deseja criar..."}
      />
      
      {/* Botão de ação */}
      <button onClick={processarTexto}>Processar</button>
      
      {/* Resultado */}
      {resultado && <div className="p-4">{resultado}</div>}
    </div>
  );
}
```

---

## 4. INTEGRAÇÃO LLM

### 4.1 Novos PromptTypes

**Arquivo:** `/src/components/botao/ai/types.ts`

```typescript
export type PromptType =
  | "comentarista"
  | "coletiva"
  | "medico"
  | "redes_sociais"
  | "noticia"
  | "pracinha"
  | "bibliotecaria"    // #BRIO: Voz da Bibliotecária
  | "forja"            // #BRIO: Forja de Palavras
  | "resumo"           // #BRIO: Resumo inteligente
  | "pergunta"         // #BRIO: Pergunta sobre conteúdo
  | "explicacao"       // #BRIO: Explicação simplificada
  | "filosofia";       // #BRIO: Frase filosófica
```

### 4.2 Novos Campos AIContext

**Arquivo:** `/src/components/botao/ai/types.ts`

```typescript
export interface AIContext {
  // ... campos existentes ...
  
  // #BRIO: Campos específicos para Biblioteca/Forja
  livroTitulo?: string;
  livroAutor?: string;
  textoOriginal?: string;
  tipoGeracao?: string;
  missaoAtual?: string;
  localizacao?: string;
}
```

### 4.3 Novas Instruções buildUserPrompt

**Arquivo:** `/src/components/botao/ai/AIService.ts`

```typescript
const base: Record<PromptType, string> = {
  // ... instruções existentes ...
  
  bibliotecaria: "Fale como a Bibliotecária da Cidadela dos Clássicos. Sábia, acolhedora e misteriosa. Ajude o jogador a encontrar conhecimento, resumir livros e descobrir pistas.",
  forja: "Fale como o mestre da Forja de Palavras. Criativo, eloquente e inspirador. Ajude o jogador a gerar textos, corrigir frases e criar conteúdo filosófico.",
  resumo: "Resuma o conteúdo de forma clara e objetiva. Destaque os pontos principais e o contexto.",
  pergunta: "Responda à pergunta do jogador de forma informativa e contextualizada.",
  explicacao: "Explique o conceito de forma simples e acessível.",
  filosofia: "Crie uma frase filosófica profunda e inspiradora sobre o tema solicitado.",
};
```

---

## 5. INTEGRAÇÃO PERSONAGENS

### 5.1 Novo NPC: Bibliotecária

**Arquivo:** `/src/components/botao/career/rpg/types.ts`

```typescript
export type NpcId =
  | "npc-valeria"
  | "npc-dario"
  | "npc-braganca"
  | "npc-corretor"
  | "npc-donacida"
  | "npc-torcedor"
  | "npc-bibliotecaria";  // #BRIO
```

**Arquivo:** `/src/components/botao/career/rpg/personagens.ts`

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

---

## 6. INTEGRAÇÃO MAPA/LOCATIONS

### 6.1 Extensão da Cidadela

**Arquivo:** `/src/routes/cidadela.tsx`

```typescript
type Game = "trilha" | "botao" | "dado" | "forca" | "velha" | "snake" | "dama" | "xadrez" | "biblioteca" | "forja" | null;

const GAMES = [
  // ... jogos existentes ...
  
  {
    id: "biblioteca" as Game,
    label: "Biblioteca",
    description: "Livros, resumos e a Bibliotecária IA",
    icon: Book,
    status: "disponível",
  },
  {
    id: "forja" as Game,
    label: "Forja de Palavras",
    description: "Gerador de textos e correção com IA",
    icon: PenTool,
    status: "disponível",
  },
];
```

---

## 7. INTEGRAÇÃO CELULAR

### 7.1 Nova Conversa

**Arquivo:** `/src/components/botao/career/types.ts`

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
    | "bibliotecaria";  // #BRIO
  // ...
};
```

---

## 8. INTEGRAÇÃO ESTADO

### 8.1 Novos Campos CareerState

**Arquivo:** `/src/components/botao/career/types.ts`

```typescript
export type CareerState = {
  // ... campos existentes ...
  
  // #BRIO: Progresso BRIO
  progressoBiblioteca?: {
    livrosLidos: string[];
    pergaminhosDescobertos: string[];
    nivelConhecimento: number;
  } | undefined;
  
  progressoForja?: {
    textosGerados: number;
    frasesCriadas: string[];
    nivelCriatividade: number;
  } | undefined;
  
  missaoBibliotecaAtiva?: string | null;
  missaoForjaAtiva?: string | null;
};
```

---

## 9. FLUXO DO USUÁRIO

### 9.1 Primeiro Acesso

1. Jogador entra na Cidadela
2. Pracinha introduz a Biblioteca e Forja
3. Jogador clica em "Biblioteca"
4. Loading screen "Carregando Biblioteca..."
5. BibliotecaBRIO é exibida
6. Bibliotecária envia mensagem de boas-vindas no celular
7. Jogador pode explorar livros, pedir resumos, conversar com Bibliotecária

### 9.2 Missão de Prova

1. ChoiceEvent aparece: "O Pergaminho Perdido"
2. Jogador escolhe "Pesquisar na Biblioteca"
3. Jogador é direcionado à Biblioteca
4. Bibliotecária oferece ajuda
5. Jogador usa resumo inteligente para decifrar pergaminho
6. Missão completa: +5 soberania, relacionamento com Bibliotecária aumenta

### 9.3 Uso da Forja

1. Jogador entra na Forja de Palavras
2. Seleciona modo "Gerar"
3. Digita descrição do que deseja criar
4. AIService gera texto com PromptType "forja"
5. Jogador pode copiar, editar, salvar
6. Progresso de criatividade aumenta

---

## 10. RESUMO TÉCNICO

**Arquivos a Criar:**
- `/src/components/botao/career/BibliotecaBRIO.tsx`
- `/src/components/botao/career/ForjaPalavras.tsx`
- `/src/components/botao/career/ChatBibliotecaria.tsx`
- `/src/components/botao/career/LivroCard.tsx`
- `/src/components/botao/career/LivroDetalhes.tsx`

**Arquivos a Modificar:**
- `/src/components/botao/ai/types.ts` - Adicionar PromptTypes e AIContext
- `/src/components/botao/ai/AIService.ts` - Adicionar instruções buildUserPrompt
- `/src/components/botao/ai/templateEngine.ts` - Adicionar buckets e placeholders
- `/src/components/botao/career/rpg/types.ts` - Adicionar npc-bibliotecaria
- `/src/components/botao/career/rpg/personagens.ts` - Adicionar Bibliotecária
- `/src/components/botao/career/types.ts` - Adicionar campos BRIO
- `/src/components/botao/career/choicesEngine.ts` - Adicionar ChoiceEvents BRIO
- `/src/components/botao/career/narrativeEngine.ts` - Adicionar categoria conhecimento
- `/src/routes/cidadela.tsx` - Adicionar Biblioteca/Forja ao GAMES

**Migrations Supabase:**
- Adicionar frases à tabela `botao_frases_ia` para novos PromptTypes

**#BRIO-DESENHO-COMPLETO** ✅
