import { useEffect, useState, useCallback } from "react";
import { Clock, Users, Plus, DoorOpen, Trophy, X, ArrowLeft, Gamepad2 } from "lucide-react";
import { useBotaoOnline } from "@/hooks/useBotaoOnline";
import { teamById } from "../data/teams";
import { MatchView } from "./MatchView";
import { TeamPicker } from "./TeamPicker";

type Screen = "lobby-list" | "lobby-view" | "aguardando" | "jogo" | "resultado";

// Chaves para persistência no localStorage
const STORAGE_KEYS = {
  SCREEN: 'botao_online_screen',
  NOME: 'botao_online_nome',
  TELEFONE: 'botao_online_telefone',
  NOME_SALA: 'botao_online_nome_sala',
  TIME: 'botao_online_time',
  FORMATO: 'botao_online_formato',
  LOBBY_ID: 'botao_online_lobby_id',
  BLOCO_ID: 'botao_online_bloco_id'
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
    return (localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen) || "lobby-list";
  });
  const [selectedTeam, setSelectedTeam] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.TIME) || "fla";
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

  // Persistir estado quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCREEN, screen);
  }, [screen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIME, selectedTeam);
  }, [selectedTeam]);

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
    if (telefone && nome) {
      await login(telefone, nome);
    }
  }, [telefone, nome, login]);

  const handleCriarLobby = useCallback(async () => {
    if (!nome || !telefone) {
      alert('Por favor, digite seu nome e telefone');
      return;
    }
    if (!nomeSala) {
      alert('Por favor, digite o nome da sala');
      return;
    }
    await criarLobby(nomeSala, formato);
    setScreen('lobby-view');
  }, [nome, telefone, nomeSala, formato, criarLobby]);

  const handleEntrarLobby = useCallback(async (lobbyId: string) => {
    await entrarLobby(lobbyId);
    setScreen('lobby-view');
  }, [entrarLobby]);

  const handleCriarBloco = useCallback(async () => {
    if (!nome || !telefone) {
      alert('Por favor, digite seu nome e telefone');
      return;
    }
    await criarBloco(selectedTeam, nome);
    setScreen('aguardando');
  }, [nome, telefone, selectedTeam, criarBloco]);

  const handleEntrarBloco = useCallback(async (blocoId: string) => {
    if (!nome || !telefone) {
      alert('Por favor, digite seu nome e telefone');
      return;
    }
    await entrarBloco(blocoId, selectedTeam, nome);
    setScreen('jogo');
  }, [nome, telefone, selectedTeam, entrarBloco]);

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
          {onBack && (
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-4 p-3 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Users className="inline w-4 h-4 mr-1" />
            Sistema de lobbies com múltiplos blocos
          </p>
          <p className="text-sm text-muted-foreground">
            <Gamepad2 className="inline w-4 h-4 mr-1" />
            Melhor de 3, 6 ou 9 rodadas
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Seu nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome"
            className="w-full px-3 py-2 rounded border bg-background"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Telefone (obrigatório)</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="flex-1 px-3 py-2 rounded border bg-background"
            />
            <button
              onClick={handleLogin}
              disabled={loading || !telefone || !nome}
              className="btn-primary px-4"
            >
              Salvar
            </button>
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

        <TeamPicker
          label="Escolha seu time"
          value={selectedTeam}
          onChange={setSelectedTeam}
        />

        <button
          onClick={handleCriarLobby}
          disabled={loading || !nome || !telefone || !nomeSala}
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
                    disabled={loading || !nome || !telefone}
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
          disabled={loading || !nome || !telefone}
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
                  <div>
                    <p className="font-medium">{bloco.jogador1_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Time: <TeamBadge team={teamById(bloco.jogador1_time)} size="sm" />
                      {bloco.status === 'aguardando' && (
                        <span className="ml-2 text-accent">vs Aguardando...</span>
                      )}
                      {bloco.status === 'em_jogo' && (
                        <span className="ml-2 text-destructive">Em jogo</span>
                      )}
                    </p>
                  </div>
                  {bloco.status === 'aguardando' && (
                    <button
                      onClick={() => handleEntrarBloco(bloco.id)}
                      disabled={loading || !nome || !telefone}
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
          Time: <TeamBadge team={teamById(selectedTeam)} size="sm" />
        </p>
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
    const oponenteTime = blocoAtual.jogador1_session === sessionId ? blocoAtual.jogador2_time : blocoAtual.jogador1_time;
    const userSide = blocoAtual.jogador1_session === sessionId ? "home" : "away";

    return (
      <div className="h-screen">
        <MatchView
          homeId={blocoAtual.jogador1_time}
          awayId={oponenteTime || 'fla'}
          userSide={userSide}
          difficulty="amador"
          turns={blocoAtual.jogadas_restantes}
          knockout={false}
          stageLabel={`Rodada ${blocoAtual.rodada} - ${meuTurno ? 'Seu turno' : 'Aguardando oponente'}`}
          isOnline={true}
          onFinish={(result) => {
            const meusGols = blocoAtual.jogador1_session === sessionId ? result.homeGoals : result.awayGoals;
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

function TeamBadge({ team, size }: { team: ReturnType<typeof teamById>; size?: "sm" | "md" }) {
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${size === 'sm' ? 'text-xs' : 'text-sm'}`} style={{ backgroundColor: team.primary, color: team.secondary }}>
      <span className="font-bold">{team.short}</span>
    </div>
  );
}
