# BRIO - SISTEMA DE ESCOLHAS/ESTADO EXISTENTE

**FASE 8: Identificação do Sistema de Escolhas/Estado**
**Data:** 2026-08-19
**Objetivo:** Identificar como o sistema de escolhas/estado funciona para extensão BRIO

---

## 1. CAREERSTATE (Estado Principal)

**Localização:** `/src/components/botao/career/types.ts` (linhas 130-183)

**#BRIO-ESTADO-CAREERSTATE:** CareerState é o estado principal da carreira, persistido no localStorage. Contém coach, moral, soberania, conversas, memória RPG, etc.

---

## 2. CAMPOS DO CareerState

**Localização:** `/src/components/botao/career/types.ts` (linhas 130-183)

**Campos Relevantes:**
```typescript
export type CareerState = {
  coach: Coach;
  dificuldadeAtual: Difficulty | null;
  bonusProximaPartida: number;
  penaltiesProximaPartida: number;
  moralTime: number;
  ultimasEscolhas: string[];
  headlines: Headline[];
  ultimaRodadaProcessada: number;
  eventoPendenteId: string | null;
  divisao: Divisao;
  ligas?: LigasTemporada | undefined;
  composicoes?: ComposicoesDivisoes | undefined;
  suborno?: SubornoState | undefined;
  narrativa?: NarrativaState | undefined;
  copaBrasil?: CopaBrasilState | undefined;
  rodadaAtual: number;
  rodadasDesdeEventoNarrativo: number;
  temporada: number;
  desafioPatrocinador?: DesafioPatrocinador | null | undefined;
  conversas: ConversaCelular[];
  woProximaPartida?: boolean | undefined;
  desfalqueBotaoProxima?: number | undefined;
  perdaPontosProxima?: number | undefined;
  memoriaRpg?: MemoriaRpg | undefined;
  feedCidadela?: PostFeed[] | undefined;
  trilhaRitual?: {...} | undefined;
};
```

**#BRIO-ESTADO-CAMPOS:** CareerState já é extensível. Posso adicionar campos específicos para BRIO (progressoBiblioteca, progressoForja, etc.).

---

## 3. PERSISTÊNCIA

**Localização:** `/src/components/botao/career/types.ts` (linha 185)

**#BRIO-ESTADO-PERSISTENCIA:** CareerState é persistido via localStorage com chave `CAREER_KEY`. Posso usar o mesmo mecanismo para estado BRIO.

---

## 4. SISTEMA DE ESCOLHAS (choicesEngine)

**Localização:** `/src/components/botao/career/choicesEngine.ts`

**#BRIO-ESTADO-CHOICES:** choicesEngine gerencia eventos de escolha que afetam o CareerState (bonusProximaPartida, moralTime, soberania, etc.).

---

## 5. EFEITOS DAS ESCOLHAS

**Localização:** `/src/components/botao/career/types.ts` (linhas 41-57)

**Efeitos Possíveis:**
```typescript
export type Choice = {
  id: string;
  texto: string;
  descricao?: string;
  bonusPoder?: number;        // Afeta power do time na próxima partida
  bonusMoral?: number;        // Afeta soberania se ganhar
  penaltyPontos?: number;     // Desconta soberania se resultado ruim
  riscoAlto?: boolean;
  wo?: boolean;              // Derrota por W.O.
  desfalqueBotao?: number;   // Desfalca N botões
  perdaPontos?: number;      // Perde N pontos na tabela
  impactoFinanceiro?: number; // Impacto financeiro (Soberania)
};
```

**#BRIO-ESTADO-EFEITOS:** Escolhas podem afetar soberania, moral, poder, relacionamentos. Posso criar escolhas que desbloqueiam Biblioteca/Forja.

---

## 6. SISTEMA NARRATIVO (narrativeEngine)

**Localização:** `/src/components/botao/career/narrativeEngine.ts`

**NarrativaEfeitos:**
```typescript
export type NarrativaEfeitos = {
  soberania?: number;
  moral?: number;
  bonusPoder?: number;
  pressaoTorcida?: number;
  flag?: string;
};
```

**#BRIO-ESTADO-NARRATIVA:** Narrativas também afetam o estado. Posso criar narrativas que desbloqueiam Biblioteca/Forja.

---

## 7. MEMÓRIA RPG (MemoriaRpg)

**Localização:** `/src/components/botao/career/rpg/types.ts` (lines 54-68)

**Estrutura:**
```typescript
export interface MemoriaRpg {
  relacoes: Partial<Record<NpcId, number>>;
  segredos: SegredoNarrativo[];
  eventosVistos: string[];
  ultimaRodadaEvento: number;
  derrotasSeguidas: number;
  jaFoiDemitido: boolean;
}
```

**#BRIO-ESTADO-MEMORIA:** MemoriaRpg armazena relacionamentos e segredos. Posso usar para rastrear progresso BRIO.

---

## 8. SEGREDOS NARRATIVOS

**Localização:** `/src/components/botao/career/rpg/types.ts` (lines 42-52)

**Estrutura:**
```typescript
export interface SegredoNarrativo {
  id: string;
  descricao: string;
  rodada: number;
  cobraEmRodada: number;
  cobrado: boolean;
}
```

**#BRIO-ESTADO-SEGREDOS:** Segredos podem ser cobrados no futuro. Posso criar segredos relacionados a Biblioteca/Forja.

---

## 9. PONTOS DE EXTENSÃO PARA BRIO

### 9.1 Adicionar Campos ao CareerState

**Arquivo:** `/src/components/botao/career/types.ts`

**#BRIO-ESTADO-EXTENSAO-CAMPOS:** Adicionar campos específicos para BRIO:
```typescript
export type CareerState = {
  // ... campos existentes ...
  
  // #BRIO: Campos específicos para progresso BRIO
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
  
  // #BRIO: Estado de missões BRIO
  missaoBibliotecaAtiva?: string | null;
  missaoForjaAtiva?: string | null;
};
```

### 9.2 Adicionar Efeitos de Escolha BRIO

**Arquivo:** `/src/components/botao/career/choicesEngine.ts`

**#BRIO-ESTADO-EXTENSAO-EFEITOS:** Adicionar efeitos específicos:
```typescript
{
  id: "desbloquear-biblioteca",
  texto: "Desbloquear acesso à Biblioteca",
  descricao: "Permite acesso à Biblioteca dos Clássicos e à Bibliotecária IA.",
  efeitos: {
    // #BRIO: Desbloqueia Biblioteca
    desbloqueiaBiblioteca: true,
  },
}
```

### 9.3 Adicionar Flags de Estado

**Arquivo:** `/src/components/botao/career/narrativeEngine.ts`

**#BRIO-ESTADO-EXTENSAO-FLAGS:** Adicionar flags específicas:
```typescript
flags: [
  "biblioteca_desbloqueada",
  "forja_desbloqueada",
  "pergaminho_encontrado",
  "mestre_conhecido",
]
```

---

## 10. RESUMO DA EXTENSÃO ESCOLHAS/ESTADO

**O QUE PRECISA SER ALTERADO:**
🔄 Adicionar campos específicos para BRIO ao CareerState
🔄 Adicionar efeitos de escolha que desbloqueiam Biblioteca/Forja
🔄 Adicionar flags de estado para rastrear progresso BRIO
🔄 Usar MemoriaRpg para rastrear relacionamento com Bibliotecária

**O QUE NÃO PRECISA SER ALTERADO:**
❌ Estrutura do CareerState (já é extensível)
❌ Sistema de persistência (já funciona via localStorage)
❌ Sistema de efeitos de escolha (já suporta efeitos variados)
❌ Sistema de memória RPG (já funciona)

**#BRIO-ESTADO-IDENTIFICADO** ✅
