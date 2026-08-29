# BRIO - SISTEMA DE MAPA/LOCATIONS EXISTENTE

**FASE 5: Identificação do Sistema de Mapa/Locations**
**Data:** 2026-08-19
**Objetivo:** Identificar como o sistema de mapa/locations funciona para extensão BRIO

---

## 1. CIDADELA DOS CLÁSSICOS (Location Principal)

**Localização:** `/src/routes/cidadela.tsx`

**Estrutura:**
```typescript
function Cidadela() {
  const [activeGame, setActiveGame] = useState<Game>(null);
  const [loadingGame, setLoadingGame] = useState<"botao" | "trilha" | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showPracinha, setShowPracinha] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  // ...
}
```

**#BRIO-MAPA-CIDADELA:** Cidadela já funciona como location/hub com estados para navegação interna. Posso adicionar estados para Biblioteca e Forja.

---

## 2. JOGOS DISPONÍVEIS

**Localização:** `/src/routes/cidadela.tsx` (linhas 39-96)

**GAMES:**
```typescript
const GAMES = [
  { id: "trilha", label: "Trilha", description: "Jogo de estratégia tática", icon: Target, status: "disponível" },
  { id: "botao", label: "Futebol de Botão", description: "Campeonato com física realista", icon: Trophy, status: "disponível" },
  { id: "dama", label: "Dama", description: "Capturas e leitura de tabuleiro", icon: Grid3X3, status: "em breve" },
  { id: "xadrez", label: "Xadrez", description: "Tática clássica e estratégia", icon: Crown, status: "em breve" },
  { id: "dado", label: "Dado Virtual", description: "Role o dado da sorte", icon: Dice2, status: "em breve" },
  { id: "forca", label: "Jogo da Forca", description: "Adivinhe a palavra secreta", icon: Skull, status: "em breve" },
  { id: "velha", label: "Jogo da Velha", description: "Clássico de estratégia", icon: CircleDot, status: "em breve" },
  { id: "snake", label: "Snake", description: "Relíquia da Nokia", icon: Gamepad2, status: "em breve" },
];
```

**#BRIO-MAPA-JOGOS:** GAMES é um array de objetos com id, label, description, icon, status. Posso adicionar "biblioteca" e "forja" como entries.

---

## 3. NAVEGAÇÃO INTERNA

**Localização:** `/src/routes/cidadela.tsx` (linhas 124-131)

**handleGameSelect:**
```typescript
const handleGameSelect = (game: Game) => {
  if (game === "botao" || game === "trilha") {
    setLoadingGame(game);
    return;
  }
  // Jogos em breve não fazem nada
  console.log("Jogo em breve:", game);
};
```

**#BRIO-MAPA-NAVEGACAO:** handleGameSelect controla qual jogo/location abrir. Posso adicionar lógica para abrir Biblioteca/Forja.

---

## 4. TELAS DE LOADING

**Localização:** `/src/routes/cidadela.tsx` (linhas 182-213)

**Loading Screens:**
```typescript
if (loadingGame === "botao") {
  return <LoadingScreen passos={[...]} categoria="MASTER_LIGA" duracao={2600} onCompleto={() => { setLoadingGame(null); setActiveGame("botao"); }} />;
}

if (loadingGame === "trilha") {
  return <TrilhaLoadingScreen categoria="DICAS" duracao={2600} onCompleto={() => { setLoadingGame(null); setActiveGame("trilha"); }} />;
}
```

**#BRIO-MAPA-LOADING:** Cada jogo tem sua loading screen. Posso criar loading screen para Biblioteca/Forja.

---

## 5. RENDERIZAÇÃO DE JOGOS

**Localização:** `/src/routes/cidadela.tsx` (linhas 215-221)

**Active Game:**
```typescript
if (activeGame === "trilha") {
  return <TrilhaGame onBack={() => setActiveGame(null)} />;
}

if (activeGame === "botao") {
  return <BotaoGame onBack={() => setActiveGame(null)} />;
}
```

**#BRIO-MAPA-RENDER:** Cada jogo renderiza seu componente com onBack. Posso renderizar Biblioteca/Forja da mesma forma.

---

## 6. INTRODUÇÃO NARRATIVA

**Localização:** `/src/routes/cidadela.tsx` (linhas 151-165)

**CidadelaIntro e PracinhaIntro:**
```typescript
if (showIntro) {
  return <CidadelaIntro onContinue={handleContinueIntro} />;
}

if (showPracinha) {
  return <PracinhaIntro nomeJogador={perfil?.nome} onComplete={() => { setShowPracinha(false); setPhoneOpen(!!perfil?.user_id); }} />;
}
```

**#BRIO-MAPA-INTRO:** Cidadela tem intro narrativa. Posso adicionar intro para Biblioteca/Forja.

---

## 7. CELULAR DA CIDADELA

**Localização:** `/src/routes/cidadela.tsx` (linhas 167-180)

**CelularConversas:**
```typescript
if (phoneOpen) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f2e24_0%,#020617_55%)]">
      <CelularConversas
        conversas={[]}
        userId={perfil?.user_id ?? null}
        nomeJogador={perfil?.nome ?? "Recruta"}
        onEnviarMensagem={() => undefined}
        onExcluirConversa={() => undefined}
        onVoltar={() => setPhoneOpen(false)}
      />
    </div>
  );
}
```

**#BRIO-MAPA-CELULAR:** Cidadela integra celular. Posso manter essa integração para Biblioteca/Forja.

---

## 8. BIBLIOTECA EXISTENTE (Rota Independente)

**Localização:** `/src/routes/biblioteca.tsx`

**#BRIO-MAPA-BIBLIOTECA:** Biblioteca existe como rota independente `/biblioteca`. Posso transformá-la em sub-location da Cidadela.

---

## 9. GERADOR/CORRETOR (Rotas Independentes)

**Localização:** `/src/routes/gerador.tsx`, `/src/routes/corretor.tsx`

**#BRIO-MAPA-FERRAMENTAS:** Gerador/Corretor são rotas independentes. Posso integrá-los como "Forja de Palavras" na Cidadela.

---

## 10. PONTOS DE EXTENSÃO PARA BRIO

### 10.1 Adicionar Biblioteca e Forja ao GAMES

**Arquivo:** `/src/routes/cidadela.tsx`

**#BRIO-MAPA-EXTENSAO-GAMES:** Adicionar entries:
```typescript
const GAMES = [
  // ... jogos existentes ...
  
  // #BRIO: Áreas de conhecimento
  {
    id: "biblioteca" as Game,
    label: "Biblioteca",
    description: "Livros, resumos e a Bibliotecária IA",
    icon: Book,  // #BRIO: importar Book de lucide-react
    status: "disponível",
  },
  {
    id: "forja" as Game,
    label: "Forja de Palavras",
    description: "Gerador de textos e correção com IA",
    icon: PenTool,  // #BRIO: importar PenTool de lucide-react
    status: "disponível",
  },
];
```

### 10.2 Atualizar Tipo Game

**Arquivo:** `/src/routes/cidadela.tsx`

**#BRIO-MAPA-EXTENSAO-TIPO:** Adicionar ao tipo Game:
```typescript
type Game = "trilha" | "botao" | "dado" | "forca" | "velha" | "snake" | "dama" | "xadrez" | "biblioteca" | "forja" | null;
```

### 10.3 Adicionar Lógica ao handleGameSelect

**Arquivo:** `/src/routes/cidadela.tsx`

**#BRIO-MAPA-EXTENSAO-SELECT:** Adicionar lógica:
```typescript
const handleGameSelect = (game: Game) => {
  if (game === "botao" || game === "trilha") {
    setLoadingGame(game);
    return;
  }
  // #BRIO: Abrir Biblioteca/Forja
  if (game === "biblioteca" || game === "forja") {
    setActiveGame(game);
    return;
  }
  // Jogos em breve não fazem nada
  console.log("Jogo em breve:", game);
};
```

### 10.4 Adicionar Loading Screens

**Arquivo:** `/src/routes/cidadela.tsx`

**#BRIO-MAPA-EXTENSAO-LOADING:** Adicionar loading screens:
```typescript
if (loadingGame === "biblioteca") {
  return (
    <LoadingScreen
      passos={[
        "Carregando Biblioteca dos Clássicos...",
        "Sincronizando pergaminhos...",
        "Preparando a Bibliotecária IA...",
        "Pronto!",
      ]}
      categoria="CONHECIMENTO"
      duracao={2600}
      onCompleto={() => {
        setLoadingGame(null);
        setActiveGame("biblioteca");
      }}
    />
  );
}

if (loadingGame === "forja") {
  return (
    <LoadingScreen
      passos={[
        "Carregando Forja de Palavras...",
        "Aquecendo as bigornas...",
        "Preparando o mestre escriba...",
        "Pronto!",
      ]}
      categoria="CRIATIVIDADE"
      duracao={2600}
      onCompleto={() => {
        setLoadingGame(null);
        setActiveGame("forja");
      }}
    />
  );
}
```

### 10.5 Adicionar Renderização

**Arquivo:** `/src/routes/cidadela.tsx`

**#BRIO-MAPA-EXTENSAO-RENDER:** Adicionar renderização:
```typescript
if (activeGame === "trilha") {
  return <TrilhaGame onBack={() => setActiveGame(null)} />;
}

if (activeGame === "botao") {
  return <BotaoGame onBack={() => setActiveGame(null)} />;
}

// #BRIO: Renderizar Biblioteca e Forja
if (activeGame === "biblioteca") {
  return <BibliotecaBRIO onBack={() => setActiveGame(null)} />;
}

if (activeGame === "forja") {
  return <ForjaPalavras onBack={() => setActiveGame(null)} />;
}
```

### 10.6 Criar Componentes BibliotecaBRIO e ForjaPalavras

**Arquivos:** `/src/components/botao/career/BibliotecaBRIO.tsx`, `/src/components/botao/career/ForjaPalavras.tsx`

**#BRIO-MAPA-EXTENSAO-COMPONENTES:** Criar componentes que integram com LLM, personagens e celular.

---

## 11. INTEGRAÇÃO COM NARRATIVA

**#BRIO-MAPA-NARRATIVA:** Biblioteca/Forja podem ter intro narrativa similar a CidadelaIntro/PracinhaIntro.

---

## 12. INTEGRAÇÃO COM CELULAR

**#BRIO-MAPA-CELULAR:** Biblioteca/Forja podem acessar celular da Cidadela para contatos (Bibliotecária).

---

## 13. RESUMO DA EXTENSÃO MAPA/LOCATIONS

**O QUE PRECISA SER ALTERADO:**
🔄 Adicionar "biblioteca" e "forja" ao tipo Game
🔄 Adicionar entries ao array GAMES
🔄 Adicionar lógica ao handleGameSelect
🔄 Adicionar loading screens para Biblioteca/Forja
🔄 Adicionar renderização de BibliotecaBRIO e ForjaPalavras
🔄 Criar componentes BibliotecaBRIO e ForjaPalavras

**O QUE NÃO PRECISA SER ALTERADO:**
❌ Estrutura da Cidadela (já funciona como hub)
❌ Sistema de navegação interna (já funciona com estados)
❌ Integração com celular (já funciona)
❌ Sistema de intro narrativa (já existe)

**#BRIO-MAPA-IDENTIFICADO** ✅
