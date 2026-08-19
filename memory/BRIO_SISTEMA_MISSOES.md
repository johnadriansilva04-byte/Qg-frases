# BRIO - SISTEMA DE MISSÕES EXISTENTE

**FASE 7: Identificação do Sistema de Missões**
**Data:** 2026-08-19
**Objetivo:** Identificar como o sistema de missões funciona para extensão BRIO

---

## 1. SISTEMA DE ESCOLHAS (choicesEngine)

**Localização:** `/src/components/botao/career/choicesEngine.ts`

**#BRIO-MISSOES-CHOICES:** choicesEngine gerencia eventos de escolha entre partidas. Cada ChoiceEvent tem título, descrição e escolhas com efeitos.

---

## 2. TIPO ChoiceEvent

**Localização:** `/src/components/botao/career/types.ts` (linhas 41-64)

**Estrutura:**
```typescript
export type Choice = {
  id: string;
  texto: string;
  descricao?: string;
  bonusPoder?: number;
  bonusMoral?: number;
  penaltyPontos?: number;
  riscoAlto?: boolean;
  wo?: boolean;
  desfalqueBotao?: number;
  perdaPontos?: number;
  impactoFinanceiro?: number;
};

export type ChoiceEvent = {
  id: string;
  titulo: string;
  descricao: string;
  escolhas: Choice[];
};
```

**#BRIO-MISSOES-CHOICEEVENT:** ChoiceEvent já suporta efeitos variados (soberania, moral, poder, relacionamentos). Posso criar ChoiceEvents que utilizam Biblioteca/Forja.

---

## 3. CHOICE_EVENTS EXISTENTES

**Localização:** `/src/components/botao/career/choicesEngine.ts` (linhas 6-265)

**Eventos:**
- `craque-dor` - Craque com desconforto muscular
- `coletiva` - Coletiva de imprensa
- `escalar-jovem` - A joia da base pede oportunidade
- `torcida` - Bandeira da torcida organizada
- `treino-intensivo` - Preparação intensiva
- `presidente-ultimato` - Ultimato da diretoria
- `empresario-proposta` - Proposta de empresário
- `namorada-cobranca` - Mensagem da namorada
- `subornador-abordagem` - Abordagem suspeita

**#BRIO-MISSOES-EXISTENTES:** Cada evento tem narrativa contextual e escolhas com efeitos. Posso criar eventos que exigem uso de Biblioteca/Forja.

---

## 4. SISTEMA NARRATIVO (narrativeEngine)

**Localização:** `/src/components/botao/career/narrativeEngine.ts`

**#BRIO-MISSOES-NARRATIVA:** narrativeEngine gerencia histórias dinâmicas (amoroso, bastidores, traicao, midia) que chegam ao celular como mensagens.

---

## 5. TIPO NarrativaState

**Localização:** `/src/components/botao/career/narrativeEngine.ts` (linhas 57-69)

**Estrutura:**
```typescript
export type NarrativaState = {
  cenaAtual: string | null;
  categoria: CategoriaNarrativa | null;
  remetente: { nome: string; cargo: string; initials: string } | null;
  ganchoIdx: number;
  reviravoltaIdx: number;
  flags: string[];
  desfecho: NarrativaDesfecho | null;
};
```

**#BRIO-MISSOES-NARRATIVASTATE:** NarrativaState armazena estado da história ativa. Posso criar narrativas que envolvem Biblioteca/Forja.

---

## 6. CATEGORIAS NARRATIVAS

**Localização:** `/src/components/botao/career/narrativeEngine.ts` (linhas 18)

**Categorias:**
```typescript
export type CategoriaNarrativa = "amoroso" | "bastidores" | "traicao" | "midia";
```

**#BRIO-MISSOES-CATEGORIAS:** Posso adicionar categoria "conhecimento" para narrativas de Biblioteca/Forja.

---

## 7. SISTEMA DE PATROCINADOR (patrocinadorEngine)

**Localização:** `/src/components/botao/career/patrocinadorEngine.ts`

**#BRIO-MISSOES-PATROCINADOR:** patrocinadorEngine gerencia desafios de patrocinador com metas (vencer, gols feitos, etc.). Posso criar desafios que exigem uso de Biblioteca/Forja.

---

## 8. PONTOS DE EXTENSÃO PARA BRIO

### 8.1 Adicionar ChoiceEvent de Biblioteca

**Arquivo:** `/src/components/botao/career/choicesEngine.ts`

**#BRIO-MISSOES-EXTENSAO-CHOICE:** Adicionar evento:
```typescript
export const CHOICE_EVENTS: ChoiceEvent[] = [
  // ... eventos existentes ...
  
  {
    id: "livro-perdido",
    titulo: "O Pergaminho Perdido",
    descricao:
      "Treinador, aqui é a Bibliotecária. Encontrei um pergaminho antigo que parece conter uma pista sobre a origem da Cidadela. " +
      "Para decifrá-lo, precisamos de conhecimento. Como deseja proceder?",
    escolhas: [
      {
        id: "pesquisar-biblioteca",
        texto: "Pesquisar na Biblioteca",
        descricao: "+5 soberania se encontrar a pista. Requer acesso à Biblioteca.",
        bonusMoral: 3,
        impactoFinanceiro: 5,
      },
      {
        id: "ignorar",
        texto: "Ignorar por agora",
        descricao: "Sem efeito imediato. A Bibliotecária guarda o pergaminho.",
      },
    ],
  },
];
```

### 8.2 Adicionar Categoria Narrativa de Conhecimento

**Arquivo:** `/src/components/botao/career/narrativeEngine.ts`

**#BRIO-MISSOES-EXTENSAO-CATEGORIA:** Adicionar categoria:
```typescript
export type CategoriaNarrativa =
  | "amoroso"
  | "bastidores"
  | "traicao"
  | "midia"
  | "conhecimento";  // #BRIO: Narrativas de Biblioteca/Forja
```

### 8.3 Adicionar Personas de Conhecimento

**Arquivo:** `/src/components/botao/career/narrativeEngine.ts`

**#BRIO-MISSOES-EXTENSAO-PERSONAS:** Adicionar personas:
```typescript
const PERSONAS_CONHECIMENTO = [
  {
    nome: "Bibliotecária",
    cargo: "Guardiã do Conhecimento",
    initials: "BL",
    perfis: ["Biblioteca dos Clássicos", "Arquivo dos Pergaminhos"],
  },
  {
    nome: "Mestre da Forja",
    cargo: "Escriba",
    initials: "MF",
    perfis: ["Forja de Palavras", "Oficina de Textos"],
  },
];
```

### 8.4 Adicionar Ganchos de Conhecimento

**Arquivo:** `/src/components/botao/career/narrativeEngine.ts`

**#BRIO-MISSOES-EXTENSAO-GANCHOS:** Adicionar ganchos:
```typescript
const GANCHOS_CONHECIMENTO = [
  "Treinador, aqui é {nome}. Encontrei um livro que pode ajudar com {perfil}. Quer investigar?",
  "Treinador, {nome} da {cargo}. Preciso de sua ajuda para decifrar este pergaminho. Vamos à Biblioteca?",
  "Treinador, {nome}. Sua redação precisa de trabalho. Vamos à Forja de Palavras?",
];
```

---

## 9. RESUMO DA EXTENSÃO MISSÕES

**O QUE PRECISA SER ALTERADO:**
🔄 Adicionar ChoiceEvents que utilizam Biblioteca/Forja
🔄 Adicionar categoria "conhecimento" ao tipo CategoriaNarrativa
🔄 Adicionar personas de conhecimento (Bibliotecária, Mestre da Forja)
🔄 Adicionar ganchos de conhecimento para narrativas

**O QUE NÃO PRECISA SER ALTERADO:**
❌ Estrutura do ChoiceEvent (já suporta efeitos variados)
❌ Sistema narrativo (já é extensível)
❌ Sistema de patrocinador (já funciona)
❌ Integração com celular (já funciona)

**#BRIO-MISSOES-IDENTIFICADO** ✅
