import { useEffect, useState, useCallback } from "react";
import { Clock, Users, Plus, DoorOpen, Trophy, X, ArrowLeft, Gamepad2, LogOut, User, Lock } from "lucide-react";
import { useBotaoOnline } from "@/hooks/useBotaoOnline";
import { supabase } from "@/integrations/supabase/client";
import { MatchView } from "./MatchView";

type Screen = "login" | "cadastro" | "lobby-list" | "lobby-view" | "aguardando" | "jogo" | "resultado";

// Chaves para persistência no localStorage
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
  NUMERO_JOGADOR: 'botao_online_numero_jogador'
};

export function OnlineMatch({ onBack }: { onBack?: () => void }) {
  const {
    sessionId,
    lobby,
    lobbiesDisponiveis,
    blocos,
    blocoAtual,
    criarLobby,
    listarLobbies,
    entrarLobby,
    criarBloco,
    entrarBloco,
    inscreverListaLobbies,
    sairLobby,
    registrarJogada,
    registrarGol,
    forcarTrocaTurno,
    finalizarBloco,
    meuTurno,
    meuTime,
    meusGols,
    tempoRestanteTurno,
    usuario,
    login,
    loading,
    error
  } = useBotaoOnline();

  // Carregar estado persistido
  const [screen, setScreen] = useState<Screen>(() => {
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.LOGGED_IN) === 'true';
    if (!isLoggedIn) return "login";
    return (localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen) || "lobby-list";
  });

  const [nome, setNome] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.NOME) || "";
  });
  const [telefone, setTelefone] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.TELEFONE) || "";
  });
  const [nomeSala, setNomeSala] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.NOME_SALA) || "";
  });
  const [formato, setFormato] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FORMATO) || "melhor_de_3";
  });
  const [timePersonalizado, setTimePersonalizado] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.TIME_PERSONALIZADO) || "Meu Time";
  });
  const [numeroJogador, setNumeroJogador] = useState(() => {
    return parseInt(localStorage.getItem(STORAGE_KEYS.NUMERO_JOGADOR) || "10");
  });
  const [cores, setCores] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CORES);
    return saved ? JSON.parse(saved) : ['#FF0000', '#00FF00', '#0000FF'];
  });

  // Persistir estado quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCREEN, screen);
  }, [screen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOME, nome);
  }, [nome]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TELEFONE, telefone);
  }, [telefone]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOME_SALA, nomeSala);
  }, [nomeSala]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FORMATO, formato);
  }, [formato]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CORES, JSON.stringify(cores));
  }, [cores]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIME_PERSONALIZADO, timePersonalizado);
  }, [timePersonalizado]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NUMERO_JOGADOR, numeroJogador.toString());
  }, [numeroJogador]);

  // Persistir lobby/bloco IDs
  useEffect(() => {
    if (lobby) {
      localStorage.setItem(STORAGE_KEYS.LOBBY_ID, lobby.id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.LOBBY_ID);
    }
  }, [lobby]);

  useEffect(() => {
    if (blocoAtual) {
      localStorage.setItem(STORAGE_KEYS.BLOCO_ID, blocoAtual.id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.BLOCO_ID);
    }
  }, [blocoAtual]);

  // Restaurar sessão ao montar
  useEffect(() => {
    const savedLobbyId = localStorage.getItem(STORAGE_KEYS.LOBBY_ID);
    const savedBlocoId = localStorage.getItem(STORAGE_KEYS.BLOCO_ID);
    const savedScreen = localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen;

    if (savedScreen && savedScreen !== "lobby-list") {
      setScreen(savedScreen);
    }

    if (savedLobbyId) {
      entrarLobby(savedLobbyId);
    }
  }, [entrarLobby]);

  // Carregar lobbies ao montar
  useEffect(() => {
    if (screen === "lobby-list") {
      listarLobbies();
      inscreverListaLobbies();
    }
  }, [screen, listarLobbies, inscreverListaLobbies]);

  // Verificar se bloco mudou para em_jogo
  useEffect(() => {
    if (blocoAtual && blocoAtual.status === 'em_jogo' && screen === 'aguardando') {
      setScreen('jogo');
    }
  }, [blocoAtual, screen]);

  // Timeout por turno
  useEffect(() => {
    if (!blocoAtual || blocoAtual.status !== 'em_jogo' || !meuTurno) return;

    const interval = setInterval(() => {
      if (tempoRestanteTurno && tempoRestanteTurno.segundos <= 0) {
        forcarTrocaTurno();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [blocoAtual, meuTurno, tempoRestanteTurno, forcarTrocaTurno]);

  // Verificar fim de jogo e auto-destruir
  useEffect(() => {
    if (blocoAtual && blocoAtual.status === 'finalizado' && screen === 'jogo') {
      setScreen('resultado');
      // Auto-destruir lobby após mostrar resultado
      setTimeout(() => {
        limparPersistencia();
        sairLobby();
        setScreen('lobby-list');
      }, 5000);
    }
  }, [blocoAtual, screen, sairLobby]);

  // Limpar persistência
  const limparPersistencia = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  const handleLogin = useCallback(async () => {
    if (!telefone) {
      alert('Por favor, digite seu telefone');
      return;
    }
    
    // Verificar se já existe usuário com este telefone
    const { data: existingUser } = await supabase
      .from('botao_usuarios')
      .select('*')
      .eq('telefone', telefone)
      .single();
    
    if (existingUser) {
      // Usuário já existe - fazer login direto
      localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
      localStorage.setItem(STORAGE_KEYS.TELEFONE, telefone);
      localStorage.setItem(STORAGE_KEYS.NOME, existingUser.nome);
      setNome(existingUser.nome);
      setTelefone(telefone);
      setTimePersonalizado(existingUser.time_personalizado || 'Meu Time');
      setNumeroJogador(existingUser.numero_jogador || 10);
      setCores(existingUser.cores || ['#FF0000', '#00FF00', '#0000FF']);
      setScreen('lobby-list');
    } else {
      // Novo usuário - ir para tela de cadastro
      setScreen('cadastro');
    }
  }, [telefone, nome, login]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.TELEFONE);
    localStorage.removeItem(STORAGE_KEYS.NOME);
    localStorage.removeItem(STORAGE_KEYS.TIME_PERSONALIZADO);
    localStorage.removeItem(STORAGE_KEYS.NUMERO_JOGADOR);
    localStorage.removeItem(STORAGE_KEYS.CORES);
    setTelefone('');
    setNome('');
    setTimePersonalizado('Meu Time');
    setNumeroJogador(10);
    setCores(['#FF0000', '#00FF00', '#0000FF']);
    setScreen('login');
    sairLobby();
  }, [sairLobby]);

  const handleCadastro = useCallback(async () => {
    if (!timePersonalizado) {
      alert('Por favor, digite o nome do seu time');
      return;
    }
    if (cores.length !== 3 || new Set(cores).size !== 3) {
      alert('Por favor, escolha 3 cores diferentes');
      return;
    }
    // Usa o nome do time como nome do usuário
    const nomeUsuario = timePersonalizado;
    await login(telefone, nomeUsuario, timePersonalizado, numeroJogador, cores);
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
    localStorage.setItem(STORAGE_KEYS.TELEFONE, telefone);
    localStorage.setItem(STORAGE_KEYS.NOME, nomeUsuario);
    localStorage.setItem(STORAGE_KEYS.TIME_PERSONALIZADO, timePersonalizado);
    localStorage.setItem(STORAGE_KEYS.NUMERO_JOGADOR, numeroJogador.toString());
    localStorage.setItem(STORAGE_KEYS.CORES, JSON.stringify(cores));
    setScreen('lobby-list');
  }, [telefone, timePersonalizado, numeroJogador, cores, login]);

  // Função para escolher cor que não conflita com o oponente
  const getCorDisponivel = useCallback((coresOponente?: string[]) => {
    if (!coresOponente || coresOponente.length === 0) {
      return cores[0]; // Retorna a primeira cor preferida
    }
    
    // Tenta encontrar uma cor que não está nas cores do oponente
    const corDisponivel = cores.find(cor => !coresOponente.includes(cor));
    return corDisponivel || cores[0]; // Se todas conflitam, usa a primeira
  }, [cores]);

  const handleCriarLobby = useCallback(async () => {
    if (!nomeSala) {
      alert('Por favor, digite o nome da sala');
      return;
    }
    await criarLobby(nomeSala, formato);
    setScreen('lobby-view');
  }, [nomeSala, formato, criarLobby]);

  const handleEntrarLobby = useCallback(async (lobbyId: string) => {
    await entrarLobby(lobbyId);
    setScreen('lobby-view');
  }, [entrarLobby]);

  const handleCriarBloco = useCallback(async () => {
    // Usar a primeira cor preferida
    const corEscolhida = cores[0] || '#FF0000';
    await criarBloco(corEscolhida, nome);
    setScreen('aguardando');
  }, [nome, cores, criarBloco]);

  const handleEntrarBloco = useCallback(async (blocoId: string) => {
    // Verificar cor do oponente e escolher uma disponível
    const bloco = blocos.find(b => b.id === blocoId);
    const coresOponente = bloco?.jogador1_time ? [bloco.jogador1_time] : [];
    const corEscolhida = getCorDisponivel(coresOponente) || '#00FF00';
    await entrarBloco(blocoId, corEscolhida, nome);
    setScreen('jogo');
  }, [nome, cores, blocos, getCorDisponivel, entrarBloco]);

  const handleFimJogada = useCallback((gols: number) => {
    registrarJogada();
    if (gols > 0) {
      const jogador = blocoAtual?.jogador1_session === sessionId ? 'jogador1' : 'jogador2';
      registrarGol(jogador);
    }
  }, [registrarJogada, registrarGol, blocoAtual, sessionId]);

  const handleSair = useCallback(() => {
    sairLobby();
    setScreen('lobby-list');
  }, [sairLobby]);

  const formatarTempo = (segundos: number) => {
    return `${segundos}s`;
  };

  // Tela de Login
  if (screen === "login") {
    return (
      <div className="panel">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">Entrar na Conta</h2>
          {onBack && (
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-6 p-4 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <User className="inline w-4 h-4 mr-1" />
            Sistema de contas por telefone
          </p>
          <p className="text-sm text-muted-foreground">
            <Lock className="inline w-4 h-4 mr-1" />
            Seu telefone é seu identificador único
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Telefone (obrigatório)</label>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full px-3 py-2 rounded border bg-background"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !telefone}
          className="btn-primary w-full"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Tela de Cadastro (apenas para novos usuários)
  if (screen === "cadastro") {
    return (
      <div className="panel">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">Criar Seu Time</h2>
          <button onClick={() => setScreen('login')} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <Gamepad2 className="inline w-4 h-4 mr-1" />
            Crie seu time personalizado com 3 cores únicas!
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Nome do Time</label>
          <input
            type="text"
            value={timePersonalizado}
            onChange={(e) => {
              setTimePersonalizado(e.target.value);
              setNome(e.target.value); // Usa o nome do time como nome do usuário
            }}
            placeholder="Ex: Flamengo, Corinthians, Meu Time..."
            className="w-full px-3 py-2 rounded border bg-background"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Seu Número</label>
          <input
            type="number"
            min="1"
            max="99"
            value={numeroJogador}
            onChange={(e) => setNumeroJogador(parseInt(e.target.value) || 10)}
            className="w-full px-3 py-2 rounded border bg-background"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Escolha 3 Cores Únicas</label>
          <div className="grid grid-cols-3 gap-2">
            {cores.map((cor, index) => (
              <div key={index} className="flex flex-col items-center">
                <input
                  type="color"
                  value={cor}
                  onChange={(e) => {
                    const novasCores = [...cores];
                    novasCores[index] = e.target.value;
                    setCores(novasCores);
                  }}
                  className="w-full h-12 rounded cursor-pointer border"
                />
                <span className="text-xs text-muted-foreground mt-1">Cor {index + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            As 3 cores devem ser diferentes entre si e únicas no sistema.
          </p>
        </div>

        <button
          onClick={handleCadastro}
          disabled={loading || !nome || !timePersonalizado || cores.length !== 3 || new Set(cores).size !== 3}
          className="btn-primary w-full"
        >
          {loading ? 'Criando...' : 'Cadastrar'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (screen === "lobby-list") {
    return (
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Lobbies Online</h2>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="btn-ghost text-destructive" title="Sair da conta">
              <LogOut className="w-5 h-5" />
            </button>
            {onBack && (
              <button onClick={onBack} className="btn-ghost">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 p-3 bg-accent/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="inline w-4 h-4" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-sm font-medium bg-transparent border-b border-border focus:border-primary focus:outline-none px-1"
                  placeholder="Nome do seu time"
                />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Sistema de lobbies com múltiplos blocos
              </p>
              <p className="text-sm text-muted-foreground">
                <Gamepad2 className="inline w-4 h-4 mr-1" />
                Melhor de 3, 6 ou 9 rodadas
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 ml-4">
              <span className="text-xs text-muted-foreground">Suas cores:</span>
              <div className="flex gap-1">
                {cores.map((cor, i) => (
                  <div key={i} className="w-5 h-5 rounded border-2" style={{ backgroundColor: cor }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Nome da sala</label>
          <input
            type="text"
            value={nomeSala}
            onChange={(e) => setNomeSala(e.target.value)}
            placeholder="Ex: Sala do Flamenguista"
            className="w-full px-3 py-2 rounded border bg-background"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Formato do jogo</label>
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-background"
          >
            <option value="melhor_de_3">Melhor de 3</option>
            <option value="melhor_de_6">Melhor de 6</option>
            <option value="melhor_de_9">Melhor de 9</option>
          </select>
        </div>

        <button
          onClick={handleCriarLobby}
          disabled={loading || !nomeSala}
          className="btn-primary w-full mt-4"
        >
          <Plus className="inline w-4 h-4 mr-2" />
          Criar Lobby
        </button>

        <div className="mt-6">
          <h3 className="font-display text-lg mb-3">Lobbies Disponíveis</h3>
          {lobbiesDisponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum lobby disponível. Crie um!
            </p>
          ) : (
            <div className="space-y-2">
              {lobbiesDisponiveis.map((lobby) => (
                <div
                  key={lobby.id}
                  className="flex items-center justify-between p-3 bg-card rounded border"
                >
                  <div>
                    <p className="font-medium">{lobby.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Criador: {lobby.criador_nome} • Formato: {lobby.formato.replace('_', ' ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEntrarLobby(lobby.id)}
                    disabled={loading}
                    className="btn-primary px-3 py-1 text-sm"
                  >
                    <DoorOpen className="inline w-4 h-4 mr-1" />
                    Entrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {usuario && (
          <div className="mt-4 p-3 bg-gold/10 rounded-lg">
            <p className="text-sm">
              <Trophy className="inline w-4 h-4 mr-1 text-gold" />
              Pontos: {usuario.pontos_soberania} | 
              Vitórias: {usuario.partidas_vencidas}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (screen === "lobby-view" && lobby) {
    return (
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">{lobby.nome}</h2>
          <button onClick={handleSair} className="btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Formato: {lobby.formato.replace('_', ' ')}
          </p>
        </div>

        <button
          onClick={handleCriarBloco}
          disabled={loading}
          className="btn-primary w-full mb-4"
        >
          <Plus className="inline w-4 h-4 mr-2" />
          Criar Bloco
        </button>

        <div className="mt-6">
          <h3 className="font-display text-lg mb-3">Blocos Disponíveis</h3>
          {blocos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum bloco disponível. Crie um!
            </p>
          ) : (
            <div className="space-y-2">
              {blocos.map((bloco) => (
                <div
                  key={bloco.id}
                  className={`flex items-center justify-between p-3 rounded border ${
                    bloco.status === 'aguardando' ? 'bg-card' : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2"
                      style={{ backgroundColor: bloco.jogador1_time || '#FF0000' }}
                    />
                    <div>
                      <p className="font-medium">{bloco.jogador1_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {bloco.status === 'aguardando' && (
                          <span className="text-accent">vs Aguardando...</span>
                        )}
                        {bloco.status === 'em_jogo' && (
                          <span className="text-destructive">Em jogo</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {bloco.status === 'aguardando' && (
                    <button
                      onClick={() => handleEntrarBloco(bloco.id)}
                      disabled={loading}
                      className="btn-primary px-3 py-1 text-sm"
                    >
                      <DoorOpen className="inline w-4 h-4 mr-1" />
                      Entrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (screen === "aguardando") {
    return (
      <div className="panel text-center">
        <div className="animate-pulse mb-4">
          <Users className="w-16 h-16 mx-auto text-accent" />
        </div>
        <h2 className="font-display text-2xl mb-2">Aguardando Oponente...</h2>
        <p className="text-muted-foreground mb-4">Sala criada com sucesso</p>
        <p className="text-sm text-muted-foreground mb-4">
          Time: <span className="font-medium">{nome}</span>
        </p>
        <div className="flex justify-center gap-2 mb-4">
          {cores.map((cor, i) => (
            <div key={i} className="w-6 h-6 rounded border-2" style={{ backgroundColor: cor }} />
          ))}
        </div>
        <button
          onClick={handleSair}
          className="btn-ghost"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </button>
      </div>
    );
  }

  if (screen === "jogo" && blocoAtual && meuTime) {
    const souJogador1 = blocoAtual.jogador1_session === sessionId;
    const oponenteTime = souJogador1 ? blocoAtual.jogador2_time : blocoAtual.jogador1_time;
    const userSide = souJogador1 ? "home" : "away";

    return (
      <div className="h-screen">
        <MatchView
          homeId={souJogador1 ? blocoAtual.jogador1_time : (blocoAtual.jogador2_time || '#FF0000')}
          awayId={oponenteTime || '#00FF00'}
          userSide={userSide}
          difficulty="amador"
          turns={blocoAtual.jogadas_restantes}
          knockout={false}
          stageLabel={`Rodada ${blocoAtual.rodada} - ${meuTurno ? 'Seu turno' : 'Aguardando oponente'}`}
          isOnline={true}
          onFinish={(result) => {
            const meusGols = souJogador1 ? result.homeGoals : result.awayGoals;
            handleFimJogada(meusGols);
          }}
          onQuit={handleSair}
        />
      </div>
    );
  }

  if (screen === "resultado" && blocoAtual) {
    const venceu = blocoAtual.vencedor === (blocoAtual.jogador1_session === sessionId ? 'jogador1' : 'jogador2');
    const souVencedor = venceu || blocoAtual.vencedor === 'empate';

    return (
      <div className="panel text-center">
        <Trophy className={`w-20 h-20 mx-auto mb-4 ${souVencedor ? 'text-gold' : 'text-muted-foreground'}`} />
        <h2 className="font-display text-3xl mb-2">
          {souVencedor ? (blocoAtual.vencedor === 'empate' ? "Empate!" : "Vitória!") : "Derrota"}
        </h2>
        <p className="text-muted-foreground mb-4">
          Placar final: {blocoAtual.jogador1_gols} - {blocoAtual.jogador2_gols}
        </p>
        
        {usuario && (
          <div className="mb-4 p-3 bg-gold/10 rounded-lg">
            <p className="text-sm">
              <Trophy className="inline w-4 h-4 mr-1 text-gold" />
              {souVencedor ? "+10 pontos" : blocoAtual.vencedor === 'empate' ? "+0 pontos" : "-5 pontos"}
            </p>
          </div>
        )}

        <button
          onClick={handleSair}
          className="btn-primary w-full"
        >
          Voltar ao Lobby
        </button>
      </div>
    );
  }

  return null;
}
