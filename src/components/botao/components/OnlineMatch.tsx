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
  ABREVIACAO_TIME: 'botao_online_abreviacao_time',
  NUMERO_JOGADOR: 'botao_online_numero_jogador'
};

export function OnlineMatch({ onBack, onEstadoPartida }: { onBack?: () => void; onEstadoPartida?: (emPartida: boolean) => void }) {
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
    if (!isLoggedIn) return "lobby-list";
    return (localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen) || "lobby-list";
  });

  // Notificar estado de partida online
  useEffect(() => {
    if (onEstadoPartida) {
      const emPartida = screen === "jogo" || screen === "aguardando";
      onEstadoPartida(emPartida);
    }
  }, [screen, onEstadoPartida]);
  
  // Estado local para UI
  const [nomeSala, setNomeSala] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.NOME_SALA) || "";
  });
  const [formato, setFormato] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FORMATO) || "melhor_de_3";
  });

  // Persistir estado quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCREEN, screen);
  }, [screen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOME_SALA, nomeSala);
  }, [nomeSala]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FORMATO, formato);
  }, [formato]);

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
