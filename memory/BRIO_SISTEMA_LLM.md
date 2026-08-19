# BRIO - SISTEMA LLM EXISTENTE

**FASE 3: Identificação do Sistema LLM Existente**
**Data:** 2026-08-19
**Objetivo:** Identificar pontos de extensão do AIService para BRIO

---

## 1. ARQUITETURA AIService

**Localização:** `/src/components/botao/ai/AIService.ts`

**Estrutura:**
- Singleton centralizado `AIService` (export default)
- API pública: `generateText(context, promptType)` e `generatePersona(systemPrompt, userPrompt)`
- Estratégia: WebLLM on-device (se hardware potente) → templates procedurais (fallback)

**#BRIO-LLM-ARQUITETURA:** AIService já é modular. Posso adicionar novos PromptTypes sem alterar a arquitetura base.

---

## 2. PromptTypes Existentes

**Localização:** `/src/components/botao/ai/types.ts`

**PromptTypes Atuais:**
```typescript
export type PromptType =
  | "comentarista"    // Comentário sarcástico de partida
  | "coletiva"        // Pergunta de imprensa
  | "medico"          // Relatório médico
  | "redes_sociais"   // Tweet de torcedor
  | "noticia"         // Manchete de bastidores
  | "pracinha";       // Voz do robô guia
```

**#BRIO-LLM-PROMPTTYPES:** Posso adicionar novos PromptTypes: `bibliotecaria`, `forja`, `resumo`, `pergunta`, `explicacao`, `filosofia`.

---

## 3. AIContext (Contexto do Jogo)

**Localização:** `/src/components/botao/ai/types.ts`

**Campos Existentes:**
```typescript
export interface AIContext {
  coach?: string;              // Nome do treinador
  timeNome?: string;           // Nome do time do usuário
  vencedor?: string;           // Nome do time vencedor
  perdedor?: string;           // Nome do time perdedor
  coachVencedor?: string;      // Treinador do vencedor
  coachPerdedor?: string;      // Treinador do perdedor
  golsPro?: number;            // Gols marcados
  golsContra?: number;         // Gols sofridos
  diff?: number;               // Diferença de gols
  rodada?: number;             // Rodada atual
  competicao?: "liga" | "copa" | "amistoso";
  competicaoNome?: string;     // Nome amigável da competição
  adversarioNome?: string;     // Adversário do contexto
  divisao?: "serie-a" | "serie-b" | "serie-c";
  temporada?: number;          // Temporada da carreira
  posicaoTabela?: number;      // Posição na tabela
  moralTime?: number;          // Moral do elenco (0-100)
  soberania?: number;          // Saldo de soberania
  rodadasRestantes?: number;   // Rodadas restantes
  decisaoPendente?: string;    // Decisão pendente no celular
  categoria?: string;          // Categoria específica
}
```

**#BRIO-LLM-CONTEXT:** AIContext já é extensível. Posso adicionar campos específicos para BRIO: `livroTitulo`, `livroAutor`, `textoOriginal`, `tipoGeracao`, `missaoAtual`.

---

## 4. buildUserPrompt (Montagem de Prompt)

**Localização:** `/src/components/botao/ai/AIService.ts` (linhas 92-124)

**Funcionalidade:**
- Monta prompt no padrão instruction do SmolLM2/Qwen
- Combina instrução base + variáveis do contexto
- Limita a 2 frases em português

**#BRIO-LLM-PROMPT:** buildUserPrompt já é genérico. Posso adicionar instruções específicas para BRIO no objeto `base`.

---

## 5. generatePersona (Conversa com NPC)

**Localização:** `/src/components/botao/ai/AIService.ts` (linhas 176-195)

**Funcionalidade:**
- Aceita systemPrompt customizado (personalidade do NPC)
- Usa apenas LLM local (sem fallback procedural)
- Retorna null se indisponível

**#BRIO-LLM-PERSONA:** generatePersona já suporta systemPrompt customizado. Posso usar para Bibliotecária com systemPrompt específico.

---

## 6. templateEngine (Fallback Procedural)

**Localização:** `/src/components/botao/ai/templateEngine.ts`

**Funcionalidade:**
- Busca frases do Supabase (tabela `botao_frases_ia`)
- Fallback local embutido
- Preenche placeholders do template com variáveis do contexto

**Estrutura do FALLBACK:**
```typescript
const FALLBACK: Record<PromptType, Record<string, string[]>> = {
  comentarista: { vitoria: [...], derrota: [...], ... },
  coletiva: { vitoria: [...], derrota: [...], ... },
  medico: { lesao: [...], preparo: [...], ... },
  redes_sociais: { vitoria: [...], derrota: [...], ... },
  noticia: { escandalo: [...], suborno: [...], ... },
  pracinha: { boas_vindas: [...], missoes: [...], ... },
};
```

**#BRIO-LLM-TEMPLATE:** templateEngine já é extensível. Posso adicionar buckets para novos PromptTypes (bibliotecaria, forja, resumo, etc.) no FALLBACK e na tabela Supabase.

---

## 7. fillTemplate (Preenchimento de Placeholders)

**Localização:** `/src/components/botao/ai/templateEngine.ts` (linhas 127-151)

**Placeholders Suportados:**
- `{coach}` - Nome do treinador
- `{T}` - Nome do time
- `{W}` - Vencedor
- `{L}` - Perdedor
- `{coachW}` - Treinador do vencedor
- `{coachL}` - Treinador do perdedor
- `{gH}` - Gols pró
- `{gA}` - Gols contra
- `{diff}` - Diferença de gols
- `{rodada}` - Rodada
- `{competicao}` - Competição
- `{adversario}` - Adversário
- `{divisao}` - Divisão
- `{temporada}` - Temporada
- `{posicao}` - Posição na tabela
- `{moral}` - Moral do elenco
- `{soberania}` - Soberania
- `{restantes}` - Rodadas restantes
- `{pendencia}` - Decisão pendente

**#BRIO-LLM-PLACEHOLDERS:** fillTemplate já é extensível. Posso adicionar placeholders específicos para BRIO: `{livro}`, `{autor}`, `{texto}`, `{tipo}`.

---

## 8. PONTOS DE EXTENSÃO PARA BRIO

### 8.1 Adicionar PromptTypes

**Arquivo:** `/src/components/botao/ai/types.ts`

**#BRIO-LLM-EXTENSAO-PROMPTTYPES:** Adicionar novos PromptTypes:
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

### 8.2 Adicionar Campos ao AIContext

**Arquivo:** `/src/components/botao/ai/types.ts`

**#BRIO-LLM-EXTENSAO-CONTEXT:** Adicionar campos específicos para BRIO:
```typescript
export interface AIContext {
  // ... campos existentes ...
  
  // #BRIO: Campos específicos para Biblioteca/Forja
  livroTitulo?: string;      // Título do livro sendo analisado
  livroAutor?: string;       // Autor do livro
  textoOriginal?: string;    // Texto original para resumo/correção
  tipoGeracao?: string;      // Tipo de geração (frase, carta, diálogo)
  missaoAtual?: string;      // Missão atual do jogador
  localizacao?: string;      // Localização atual (Biblioteca, Forja, etc.)
}
```

### 8.3 Adicionar Instruções ao buildUserPrompt

**Arquivo:** `/src/components/botao/ai/AIService.ts`

**#BRIO-LLM-EXTENSAO-PROMPT:** Adicionar instruções base para novos PromptTypes:
```typescript
const base: Record<PromptType, string> = {
  comentarista: "Comente o resultado da partida de futebol de botão em tom sarcástico.",
  coletiva: "Faça uma pergunta ácida de imprensa na coletiva pós-jogo.",
  medico: "Redija um relatório do departamento médico, irônico, sobre o preparo dos botões.",
  redes_sociais: "Gere um tweet de torcedor reagindo ao último placar.",
  noticia: "Escreva uma manchete de bastidores conectada ao jogo.",
  pracinha: "Fale como Pracinha, o robô militar retrô e guia da Cidadela.",
  
  // #BRIO: Instruções para novos PromptTypes
  bibliotecaria: "Fale como a Bibliotecária da Cidadela dos Clássicos. Sábia, acolhedora e misteriosa. Ajude o jogador a encontrar conhecimento, resumir livros e descobrir pistas.",
  forja: "Fale como o mestre da Forja de Palavras. Criativo, eloquente e inspirador. Ajude o jogador a gerar textos, corrigir frases e criar conteúdo filosófico.",
  resumo: "Resuma o conteúdo de forma clara e objetiva. Destaque os pontos principais e o contexto.",
  pergunta: "Responda à pergunta do jogador de forma informativa e contextualizada.",
  explicacao: "Explique o conceito de forma simples e acessível, como se estivesse ensinando alguém.",
  filosofia: "Crie uma frase filosófica profunda e inspiradora sobre o tema solicitado.",
};
```

### 8.4 Adicionar Buckets ao templateEngine

**Arquivo:** `/src/components/botao/ai/templateEngine.ts`

**#BRIO-LLM-EXTENSAO-TEMPLATE:** Adicionar buckets para novos PromptTypes:
```typescript
const FALLBACK: Record<PromptType, Record<string, string[]>> = {
  // ... buckets existentes ...
  
  // #BRIO: Buckets para novos PromptTypes
  bibliotecaria: {
    boas_vindas: [
      "Bem-vindo à Biblioteca dos Clássicos, {coach}. O conhecimento espera por você.",
      "Ah, {coach}. Entre. Os livros têm muito a contar.",
    ],
    resumo: [
      "Este livro fala sobre {tema}. O ponto principal é {ponto}.",
      "A essência desta obra é {essencia}. Vale a pena a leitura.",
    ],
    pergunta: [
      "Sobre {tema}, o livro diz que {resposta}.",
      "A resposta está nas páginas {paginas}. {explicacao}.",
    ],
    geral: [
      "A Biblioteca guarda segredos antigos, {coach}. O que busca?",
    ],
  },
  forja: {
    gerar: [
      "Aqui está sua {tipo}: {resultado}. Use com sabedoria.",
      "Forjado com cuidado: {resultado}.",
    ],
    corrigir: [
      "Sua frase melhorou: {correcao}.",
      "A versão refinada: {correcao}.",
    ],
    filosofia: [
      "Sobre {tema}: {frase}.",
      "Reflexão: {frase}.",
    ],
    geral: [
      "A Forja de Palavras está pronta, {coach}. O que deseja criar?",
    ],
  },
  resumo: {
    curto: [
      "Resumo: {resumo}.",
      "Em poucas palavras: {resumo}.",
    ],
    detalhado: [
      "Resumo detalhado: {resumo}. Pontos principais: {pontos}.",
      "Análise: {resumo}. Contexto: {contexto}.",
    ],
    geral: [
      "Conteúdo resumido: {resumo}.",
    ],
  },
  pergunta: {
    resposta: [
      "Resposta: {resposta}.",
      "Sobre isso: {resposta}.",
    ],
    geral: [
      "A Biblioteca responde: {resposta}.",
    ],
  },
  explicacao: {
    simples: [
      "De forma simples: {explicacao}.",
      "Pense assim: {explicacao}.",
    ],
    geral: [
      "Explicação: {explicacao}.",
    ],
  },
  filosofia: {
    frase: [
      "Reflexão: {frase}.",
      "Pensamento: {frase}.",
    ],
    geral: [
      "Sabedoria: {frase}.",
    ],
  },
};
```

### 8.5 Adicionar Placeholders ao fillTemplate

**Arquivo:** `/src/components/botao/ai/templateEngine.ts`

**#BRIO-LLM-EXTENSAO-PLACEHOLDERS:** Adicionar placeholders específicos para BRIO:
```typescript
function fillTemplate(tpl: string, ctx: AIContext): string {
  const vars: Record<string, string | number> = {
    // ... placeholders existentes ...
    
    // #BRIO: Placeholders específicos para Biblioteca/Forja
    livro: ctx.livroTitulo ?? "",
    autor: ctx.livroAutor ?? "",
    texto: ctx.textoOriginal ?? "",
    tipo: ctx.tipoGeracao ?? "",
    missao: ctx.missaoAtual ?? "",
    local: ctx.localizacao ?? "",
    
    // Placeholders genéricos para templates BRIO
    tema: ctx.categoria ?? "",
    ponto: ctx.decisaoPendente ?? "",
    essencia: ctx.decisaoPendente ?? "",
    resposta: ctx.decisaoPendente ?? "",
    explicacao: ctx.decisaoPendente ?? "",
    correcao: ctx.decisaoPendente ?? "",
    frase: ctx.decisaoPendente ?? "",
    resumo: ctx.decisaoPendente ?? "",
    pontos: ctx.decisaoPendente ?? "",
    contexto: ctx.decisaoPendente ?? "",
    paginas: ctx.rodada ?? "",
  };
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));
}
```

### 8.6 Adicionar Frases ao Supabase

**Tabela:** `botao_frases_ia`

**#BRIO-LLM-EXTENSAO-SUPABASE:** Adicionar frases para novos PromptTypes:
```sql
-- #BRIO: Frases para Bibliotecária
INSERT INTO botao_frases_ia (prompt_type, categoria, template_text, ativo, ordem) VALUES
('bibliotecaria', 'boas_vindas', 'Bem-vindo à Biblioteca dos Clássicos, {coach}. O conhecimento espera por você.', true, 1),
('bibliotecaria', 'resumo', 'Este livro fala sobre {tema}. O ponto principal é {ponto}.', true, 1),
('bibliotecaria', 'pergunta', 'Sobre {tema}, o livro diz que {resposta}.', true, 1),
('bibliotecaria', 'geral', 'A Biblioteca guarda segredos antigos, {coach}. O que busca?', true, 1)
ON CONFLICT (prompt_type, categoria, ordem) DO NOTHING;

-- #BRIO: Frases para Forja
INSERT INTO botao_frases_ia (prompt_type, categoria, template_text, ativo, ordem) VALUES
('forja', 'gerar', 'Aqui está sua {tipo}: {resultado}. Use com sabedoria.', true, 1),
('forja', 'corrigir', 'Sua frase melhorou: {correcao}.', true, 1),
('forja', 'filosofia', 'Sobre {tema}: {frase}.', true, 1),
('forja', 'geral', 'A Forja de Palavras está pronta, {coach}. O que deseja criar?', true, 1)
ON CONFLICT (prompt_type, categoria, ordem) DO NOTHING;

-- #BRIO: Frases para Resumo
INSERT INTO botao_frases_ia (prompt_type, categoria, template_text, ativo, ordem) VALUES
('resumo', 'curto', 'Resumo: {resumo}.', true, 1),
('resumo', 'detalhado', 'Resumo detalhado: {resumo}. Pontos principais: {pontos}.', true, 1),
('resumo', 'geral', 'Conteúdo resumido: {resumo}.', true, 1)
ON CONFLICT (prompt_type, categoria, ordem) DO NOTHING;
```

---

## 9. INTEGRAÇÃO COM BIBLIOTECÁRIA IA

**#BRIO-LLM-BIBLIOTECARIA:** Usar `generatePersona` para conversa com Bibliotecária:

```typescript
// System prompt da Bibliotecária
const BIBLIOTECARIA_SYSTEM_PROMPT =
  "Você é a Bibliotecária da Cidadela dos Clássicos. Sábia, acolhedora e misteriosa. " +
  "Guardiã do conhecimento desde eras passadas. Fala com elegância e sabedoria. " +
  "Ajude o jogador a encontrar livros, resumir conteúdos e descobrir pistas. " +
  "Responda em 1-2 frases, tom de bibliotecária antiga.";

// Uso
const resposta = await AIService.generatePersona(
  BIBLIOTECARIA_SYSTEM_PROMPT,
  "Qual livro você recomenda para aprender estratégia?"
);
```

---

## 10. INTEGRAÇÃO COM FORJA DE PALAVRAS

**#BRIO-LLM-FORJA:** Usar `generateText` com PromptType `forja`:

```typescript
const contexto: AIContext = {
  coach: "Treinador",
  tipoGeracao: "carta",
  missaoAtual: "Convencer o empresário",
  localizacao: "Forja de Palavras",
};

const resposta = await AIService.generateText(contexto, "forja");
```

---

## 11. INTEGRAÇÃO COM RESUMOS INTELIGENTES

**#BRIO-LLM-RESUMO:** Usar `generateText` com PromptType `resumo`:

```typescript
const contexto: AIContext = {
  livroTitulo: "A Arte da Guerra",
  livroAutor: "Sun Tzu",
  textoOriginal: "Conteúdo completo do livro...",
  localizacao: "Biblioteca",
};

const resumo = await AIService.generateText(contexto, "resumo");
```

---

## 12. RESUMO DA EXTENSÃO LLM

**O QUE PRECISA SER ALTERADO:**
🔄 Adicionar PromptTypes ao `types.ts` (bibliotecaria, forja, resumo, pergunta, explicacao, filosofia)
🔄 Adicionar campos ao `AIContext` (livroTitulo, livroAutor, textoOriginal, tipoGeracao, missaoAtual, localizacao)
🔄 Adicionar instruções base ao `buildUserPrompt` em `AIService.ts`
🔄 Adicionar buckets ao `FALLBACK` em `templateEngine.ts`
🔄 Adicionar placeholders ao `fillTemplate` em `templateEngine.ts`
🔄 Adicionar frases à tabela `botao_frases_ia` no Supabase

**O QUE NÃO PRECISA SER ALTERADO:**
❌ Arquitetura do AIService (já é modular)
❌ Estratégia de fallback (já funciona)
❌ Sistema de cache do templateEngine (já funciona)
❌ Integração com WebLLM (já funciona)

**#BRIO-LLM-IDENTIFICADO** ✅
