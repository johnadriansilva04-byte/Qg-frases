# PROMPT MESTRE - Jogo de Futebol de Botão

## Visão Geral do Projeto

Este é um jogo de futebol de botão (button football) desenvolvido em React com TypeScript, utilizando Supabase para backend e persistência de dados. O jogo possui modo offline (amistoso e torneio) e modo online (multiplayer em tempo real).

## Estrutura do Projeto

### Arquivos Principais

```
src/
├── components/botao/
│   ├── BotaoGame.tsx              # Componente principal do jogo
│   ├── components/
│   │   ├── MatchView.tsx          # Interface visual da partida
│   │   ├── OnlineMatch.tsx        # Modo online (login, lobby, jogo)
│   │   └── TeamPicker.tsx         # Seleção de times
│   ├── engine/
│   │   ├── physics.ts             # Física do jogo
│   │   └── ai.ts                  # Inteligência artificial da CPU
│   ├── data/
│   │   └── teams.ts               # Dados dos times
│   ├── storage.ts                 # Persistência local e Supabase
│   ├── tournament.ts              # Lógica de torneio
│   └── types.ts                   # Tipos TypeScript
├── hooks/
│   └── useBotaoOnline.ts          # Hook para modo online
├── integrations/supabase/
│   └── client.ts                  # Cliente Supabase
└── routes/
    └── cidadela.tsx               # Rota que carrega o jogo
```

## Banco de Dados (Supabase)

### Tabelas

#### 1. botao_times
Armazena os times disponíveis no jogo.

```sql
CREATE TABLE botao_times (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  short TEXT NOT NULL,           -- Abreviação (3 letras)
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  power INTEGER NOT NULL,         -- Força do time (1-100)
  pais TEXT NOT NULL,
  liga TEXT NOT NULL
);
```

#### 2. botao_usuarios
Armazena os dados dos usuários logados.

```sql
CREATE TABLE botao_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL UNIQUE,  -- Login por telefone
  nome TEXT NOT NULL,            -- Nome do usuário/time
  cores TEXT[] NOT NULL,         -- Array de 3 cores hex
  time_personalizado TEXT NOT NULL DEFAULT 'Meu Time',
  abreviacao_time TEXT NOT NULL DEFAULT 'MTI',
  numero_jogador INTEGER NOT NULL DEFAULT 10,
  pontos_soberania INTEGER NOT NULL DEFAULT 0,
  partidas_jogadas INTEGER NOT NULL DEFAULT 0,
  partidas_vencidas INTEGER NOT NULL DEFAULT 0,
  progresso_caminpanha JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 3. botao_lobbies
Salas de jogo online.

```sql
CREATE TABLE botao_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  criador_id UUID REFERENCES botao_usuarios(id),
  formato TEXT NOT NULL DEFAULT 'melhor_de_3',
  max_jogadores INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'aguardando',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 4. botao_blocos
Blocos/jogos dentro de um lobby.

```sql
CREATE TABLE botao_blocos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID REFERENCES botao_lobbies(id),
  jogador1_id UUID REFERENCES botao_usuarios(id),
  jogador2_id UUID REFERENCES botao_usuarios(id),
  placar_j1 INTEGER NOT NULL DEFAULT 0,
  placar_j2 INTEGER NOT NULL DEFAULT 0,
  turno TEXT NOT NULL DEFAULT 'jogador1',
  status TEXT NOT NULL DEFAULT 'aguardando',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Variáveis de Estado Principais

### BotaoGame.tsx

```typescript
// Estado da tela atual
type Screen = 
  | "menu"           // Menu principal
  | "friendly-match" // Partida amistosa
  | "tournament"     // Configuração de torneio
  | "hub"            // Hub do torneio
  | "tournament-match" // Partida de torneio
  | "online"         // Modo online
  | "login";         // Tela de login

const [screen, setScreen] = useState<Screen>(() => {
  // Verifica se usuário já está logado
  const isLoggedIn = localStorage.getItem('botao_online_logged_in') === 'true';
  return isLoggedIn ? "menu" : "login";
});

// Dados do usuário
const userTeam = useMemo(() => {
  const timeNome = localStorage.getItem('botao_online_time_personalizado') || "Meu Time";
  const abreviacao = localStorage.getItem('botao_online_abreviacao_time') || "MTI";
  const cores = JSON.parse(localStorage.getItem('botao_online_cores') || '["#FF0000", "#00FF00", "#0000FF"]');
  const numero = localStorage.getItem('botao_online_numero_jogador') || "10";
  
  return {
    nome: timeNome,
    short: abreviacao,
    primary: cores[0],
    secondary: cores[1],
    numero: parseInt(numero)
  };
}, []);

// Progresso da campanha
const [progress, setProgress] = useState<Progress>(() => loadProgress());

// Torneio atual
const [tour, setTour] = useState<Tournament | null>(null);
```

### OnlineMatch.tsx

```typescript
// Chaves de localStorage
const STORAGE_KEYS = {
  SCREEN: 'botao_online_screen',
  NOME: 'botao_online_nome',
  TELEFONE: 'botao_online_telefone',
  NOME_SALA: 'botao_online_nome_sala',
  CORES: 'botao_online_cores',
  FORMATO: 'botao_online_formato',
  LOBBY_ID: 'botao_online_lobby_id',
  BLOCO_ID: 'botao_online_bloco_id',
  LOGGED_IN: 'botao_online_logged_in',
  TIME_PERSONALIZADO: 'botao_online_time_personalizado',
  ABREVIACAO_TIME: 'botao_online_abreviacao_time',
  NUMERO_JOGADOR: 'botao_online_numero_jogador'
};

// Estados locais
const [screen, setScreen] = useState<Screen>(() => {
  const isLoggedIn = localStorage.getItem(STORAGE_KEYS.LOGGED_IN) === 'true';
  if (!isLoggedIn) return "login";
  return (localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen) || "lobby-list";
});

const [localLoading, setLocalLoading] = useState(false);
const [localError, setLocalError] = useState<string | null>(null);
const [nome, setNome] = useState(() => localStorage.getItem(STORAGE_KEYS.NOME) || "");
const [telefone, setTelefone] = useState(() => localStorage.getItem(STORAGE_KEYS.TELEFONE) || "");
const [timePersonalizado, setTimePersonalizado] = useState(() => localStorage.getItem(STORAGE_KEYS.TIME_PERSONALIZADO) || "Meu Time");
const [abreviacaoTime, setAbreviacaoTime] = useState(() => localStorage.getItem(STORAGE_KEYS.ABREVIACAO_TIME) || "MTI");
const [numeroJogador, setNumeroJogador] = useState(() => parseInt(localStorage.getItem(STORAGE_KEYS.NUMERO_JOGADOR) || "10"));
const [cores, setCores] = useState<string[]>(() => {
  const saved = localStorage.getItem(STORAGE_KEYS.CORES);
  return saved ? JSON.parse(saved) : ['#FF0000', '#00FF00', '#0000FF'];
});
```

## Fluxo de Login/Logout

### Fluxo Atual (PROBLEMÁTICO)

1. **Inicialização:**
   - `BotaoGame.tsx` verifica `localStorage.getItem('botao_online_logged_in') === 'true'`
   - Se true: vai para "menu"
   - Se false: vai para "login"

2. **Login:**
   - Usuário digita telefone
   - `handleLogin` verifica no Supabase se usuário existe
   - Se existe: carrega dados e vai para menu
   - Se não existe: vai para tela de cadastro

3. **Cadastro:**
   - Usuário preenche: nome do time, abreviação (3 letras), número, 3 cores
   - Dados são salvos no Supabase e localStorage
   - Vai para menu

### PROBLEMAS IDENTIFICADOS

1. **Tela de login não aparece:**
   - Se `botao_online_logged_in` estiver 'true' mas os dados não estiverem completos, vai direto para menu
   - Não há verificação se os dados do usuário estão completos

2. **Não puxa nome do time:**
   - Se o usuário já estiver logado mas os dados não estiverem no localStorage, usa valores padrão
   - Não há sincronização com Supabase ao carregar

3. **Sem botão de logout visível:**
   - Só há logout dentro do modo online
   - Não há botão de logout no menu principal

4. **Pode deslogar estando online:**
   - Não há verificação se usuário está em lobby/jogo ao deslogar

### Fluxo CORRETO (Deveria ser assim)

1. **Inicialização:**
   - Verificar se `botao_online_logged_in` === 'true'
   - Se true: verificar se `botao_online_usuario_id` existe
   - Se existe: buscar dados completos do Supabase
   - Se dados completos: ir para menu
   - Se dados incompletos: ir para login
   - Se false: ir para login

2. **Login:**
   - Usuário digita telefone
   - Verificar no Supabase se usuário existe
   - Se existe: carregar dados COMPLETOS do Supabase
   - Salvar no localStorage
   - Ir para menu

3. **Cadastro:**
   - Usuário preenche todos os campos
   - Salvar no Supabase
   - Salvar no localStorage
   - Ir para menu

4. **Logout:**
   - Verificar se usuário está em lobby ou jogo
   - Se estiver: mostrar alerta "Não pode deslogar durante partida"
   - Se não estiver: limpar localStorage e ir para login

5. **Botão de Login/Logout:**
   - Sempre visível no canto da tela
   - Se não logado: botão "Login"
   - Se logado: botão "Logout" com nome do time

## Lógica do Jogo

### Modo Amistoso

1. Usuário seleciona time adversário
2. Joga partida (24 turnos)
3. Resultado é salvo no progresso local
4. Volta para menu

### Modo Torneio

1. Usuário inicia torneio
2. Sistema cria 8 grupos com 4 times cada
3. Cada time joga 3 jogos (um contra cada adversário do grupo)
4. Quando usuário joga 1 jogo, sistema simula TODOS os outros jogos
5. Ao final dos grupos, top 2 de cada grupo avança para mata-mata
6. Mata-mata: oitavas → quartas → semifinal → final
7. Se usuário vencer, ganha troféu

### Modo Online

1. Usuário faz login
2. Vai para lista de lobbies
3. Pode criar lobby ou entrar em existente
4. Dentro do lobby, jogam blocos (melhor de 3)
5. Cada bloco é uma partida
6. Vencedor do bloco ganha ponto
7. Quem ganhar 2 blocos vence o lobby

## Variáveis Críticas

### localStorage

```javascript
// Login/Usuário
'botao_online_logged_in' = 'true'/'false'
'botao_online_usuario_id' = UUID do usuário
'botao_online_telefone' = telefone
'botao_online_nome' = nome do usuário
'botao_online_time_personalizado' = nome do time
'botao_online_abreviacao_time' = abreviação (3 letras)
'botao_online_numero_jogador' = número do jogador
'botao_online_cores' = JSON array de 3 cores hex

// Online
'botao_online_screen' = tela atual
'botao_online_lobby_id' = ID do lobby
'botao_online_bloco_id' = ID do bloco atual
'botao_session_id' = ID da sessão

// Progresso
'botao_progress' = JSON do progresso da campanha
```

### Supabase

```sql
-- Consulta para verificar usuário
SELECT * FROM botao_usuarios WHERE telefone = '48999880030';

-- Criar usuário
INSERT INTO botao_usuarios (telefone, nome, time_personalizado, abreviacao_time, numero_jogador, cores)
VALUES ('48999880030', 'Meu Time', 'Meu Time', 'MTI', 10, ARRAY['#FF0000', '#00FF00', '#0000FF']);

-- Atualizar usuário
UPDATE botao_usuarios SET cores = ARRAY['#FF0000', '#00FF00', '#0000FF'] WHERE id = 'uuid';
```

## Problemas Atuais e Soluções

### 1. Tela de login não aparece

**Causa:**
- `BotaoGame.tsx` só verifica `botao_online_logged_in` sem validar dados
- Se o flag estiver true mas dados incompletos, vai para menu com dados padrão

**Solução:**
- Adicionar verificação completa dos dados do usuário
- Se dados incompletos, forçar login
- Buscar dados do Supabase ao inicializar

### 2. Não puxa nome do time

**Causa:**
- `BotaoGame.tsx` só lê do localStorage
- Não sincroniza com Supabase
- Se localStorage estiver vazio, usa valores padrão

**Solução:**
- Ao inicializar, se usuário logado, buscar dados do Supabase
- Atualizar localStorage com dados do Supabase
- Garantir sincronização

### 3. Sem botão de logout visível

**Causa:**
- Botão de logout só existe dentro de `OnlineMatch.tsx`
- Menu principal não tem botão de logout

**Solução:**
- Adicionar componente de UserMenu sempre visível
- Mostrar botão de login se não logado
- Mostrar botão de logout se logado
- Posicionar no canto da tela

### 4. Pode deslogar estando online

**Causa:**
- `handleLogout` não verifica se está em lobby/jogo
- Não há verificação de estado online

**Solução:**
- Adicionar verificação antes de deslogar
- Se em lobby: sair do lobby primeiro
- Se em jogo: impedir logout com alerta
- Só permitir logout se não estiver em partida

## Implementação Correta

### 1. Componente UserMenu

```typescript
// src/components/botao/components/UserMenu.tsx
export function UserMenu() {
  const isLoggedIn = localStorage.getItem('botao_online_logged_in') === 'true';
  const timeNome = localStorage.getItem('botao_online_time_personalizado') || 'Meu Time';
  const abreviacao = localStorage.getItem('botao_online_abreviacao_time') || 'MTI';

  const handleLogin = () => {
    // Navegar para tela de login
  };

  const handleLogout = () => {
    // Verificar se está em partida
    const lobbyId = localStorage.getItem('botao_online_lobby_id');
    if (lobbyId) {
      alert('Não pode deslogar durante partida!');
      return;
    }
    
    // Limpar dados
    localStorage.removeItem('botao_online_logged_in');
    localStorage.removeItem('botao_online_usuario_id');
    // ... limpar outros dados
    
    // Recarregar página
    window.location.reload();
  };

  return (
    <div className="user-menu">
      {isLoggedIn ? (
        <div className="user-info">
          <span>{abreviacao}</span>
          <span>{timeNome}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 2. Inicialização Correta do BotaoGame

```typescript
const [screen, setScreen] = useState<Screen>(async () => {
  const isLoggedIn = localStorage.getItem('botao_online_logged_in') === 'true';
  
  if (!isLoggedIn) return "login";
  
  // Se logado, verificar dados completos
  const usuarioId = localStorage.getItem('botao_online_usuario_id');
  if (!usuarioId) return "login";
  
  // Buscar dados do Supabase
  const { data: usuario } = await supabase
    .from('botao_usuarios')
    .select('*')
    .eq('id', usuarioId)
    .single();
  
  if (!usuario) return "login";
  
  // Atualizar localStorage com dados do Supabase
  localStorage.setItem('botao_online_nome', usuario.nome);
  localStorage.setItem('botao_online_time_personalizado', usuario.time_personalizado);
  localStorage.setItem('botao_online_abreviacao_time', usuario.abreviacao_time);
  localStorage.setItem('botao_online_numero_jogador', usuario.numero_jogador.toString());
  localStorage.setItem('botao_online_cores', JSON.stringify(usuario.cores));
  
  return "menu";
});
```

### 3. Integração do UserMenu

```typescript
// No BotaoGame.tsx
import { UserMenu } from './components/UserMenu';

export function BotaoGame({ onBack }: BotaoGameProps = {}) {
  // ... código existente
  
  return (
    <Shell>
      <UserMenu />
      {/* resto do componente */}
    </Shell>
  );
}
```

## Resumo da Arquitetura

1. **Estado Global:**
   - `BotaoGame.tsx` gerencia o estado principal do jogo
   - `useBotaoOnline.ts` gerencia estado do modo online
   - `localStorage` persiste dados localmente
   - `Supabase` persiste dados no servidor

2. **Fluxo de Dados:**
   - Usuário → localStorage → Supabase
   - Supabase → localStorage → Componentes
   - Componentes → localStorage → Supabase

3. **Sincronização:**
   - Login: Supabase → localStorage
   - Cadastro: localStorage → Supabase → localStorage
   - Jogo: localStorage → Supabase (progresso)

4. **Validação:**
   - Sempre verificar dados completos antes de prosseguir
   - Sincronizar com Supabase ao inicializar
   - Validar estado antes de ações críticas (logout)

## Conclusão

O projeto está estruturado corretamente, mas falta:
1. Validação completa dos dados do usuário ao inicializar
2. Sincronização com Supabase ao carregar
3. Componente de UserMenu sempre visível
4. Verificação de estado antes de logout
5. Tratamento de erros mais robusto

Implementando essas correções, o sistema de login/logout funcionará corretamente e o usuário terá controle total sobre sua sessão.
