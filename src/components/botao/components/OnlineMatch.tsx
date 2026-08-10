import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, Users, Plus, DoorOpen, Trophy, X, ArrowLeft, Volume2, Gamepad2 } from "lucide-react";
import { useBotaoOnline } from "@/hooks/useBotaoOnline";
import { TEAMS, teamById } from "../data/teams";
import { MatchView } from "./MatchView";
import { TeamPicker } from "./TeamPicker";

type Screen = "lobby-list" | "lobby-view" | "aguardando" | "jogo" | "resultado";

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

  const [screen, setScreen] = useState<Screen>("lobby-list");
  const [selectedTeam, setSelectedTeam] = useState("fla");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [formato, setFormato] = useState("melhor_de_3");
  const [golsAnteriores, setGolsAnteriores] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio de gol
  const tocarSomGol = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/gol.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch (e) {
      console.error('Erro ao tocar som de gol:', e);
    }
  }, []);

  // Detectar gol novo
  useEffect(() => {
    if (blocoAtual && meusGols > golsAnteriores && golsAnteriores > 0) {
      tocarSomGol();
    }
    if (blocoAtual) {
      setGolsAnteriores(meusGols);
    }
  }, [blocoAtual, meusGols, golsAnteriores, tocarSomGol]);

  // Carregar lobbies ao montar
  useEffect(() => {
    listarLobbies();
    inscreverListaLobbies();
  }, [listarLobbies, inscreverListaLobbies]);

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

  // Verificar fim de jogo
  useEffect(() => {
    if (blocoAtual && blocoAtual.status === 'finalizado' && screen === 'jogo') {
      setScreen('resultado');
    }
  }, [blocoAtual, screen]);

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
    await criarLobby(nome, formato);
    setScreen('lobby-view');
  }, [nome, telefone, formato, criarLobby]);

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
          disabled={loading || !nome || !telefone}
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
    const oponenteNome = blocoAtual.jogador1_session === sessionId ? blocoAtual.jogador2_nome : blocoAtual.jogador1_nome;
    const time1 = teamById(blocoAtual.jogador1_time);
    const time2 = teamById(oponenteTime || 'fla');

    return (
      <div className="flex flex-col h-screen">
        {/* Header do placar */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            {/* Informações da partida */}
            <div className="flex justify-between items-center mb-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-gold/20 text-gold px-2 py-1 rounded-full font-semibold">
                  Jogadas: {blocoAtual.jogadas_restantes}
                </span>
                {!meuTurno && (
                  <span className="bg-accent/20 text-accent px-2 py-1 rounded-full animate-pulse">
                    Aguardando {oponenteNome}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${tempoRestanteTurno && tempoRestanteTurno.segundos < 10 ? 'text-destructive' : ''}`} />
                <span className={`font-mono font-bold ${tempoRestanteTurno && tempoRestanteTurno.segundos < 10 ? 'text-destructive' : ''}`}>
                  {tempoRestanteTurno ? formatarTempo(tempoRestanteTurno.segundos) : '--'}
                </span>
              </div>
            </div>

            {/* Barra de tempo */}
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
              {tempoRestanteTurno && (
                <div 
                  className={`h-full transition-all duration-1000 ${tempoRestanteTurno.segundos < 10 ? 'bg-destructive' : 'bg-gold'}`}
                  style={{ width: `${(tempoRestanteTurno.segundos / tempoRestanteTurno.total) * 100}%` }}
                />
              )}
            </div>

            {/* Placar */}
            <div className="flex items-center justify-between gap-4">
              {/* Time 1 */}
              <div className="flex-1 text-center">
                <div 
                  className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: time1.primary, color: time1.secondary }}
                >
                  {time1.short}
                </div>
                <p className="font-semibold text-sm truncate">{blocoAtual.jogador1_nome}</p>
              </div>

              {/* Placar central */}
              <div className="flex items-center gap-4 bg-slate-700/50 px-6 py-3 rounded-xl">
                <span className={`text-4xl font-black ${blocoAtual.jogador1_session === sessionId ? 'text-gold' : ''}`}>
                  {blocoAtual.jogador1_gols}
                </span>
                <span className="text-2xl text-slate-400">-</span>
                <span className={`text-4xl font-black ${blocoAtual.jogador2_session === sessionId ? 'text-gold' : ''}`}>
                  {blocoAtual.jogador2_gols}
                </span>
              </div>

              {/* Time 2 */}
              <div className="flex-1 text-center">
                <div 
                  className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: time2.primary, color: time2.secondary }}
                >
                  {time2.short}
                </div>
                <p className="font-semibold text-sm truncate">{blocoAtual.jogador2_nome}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Área do jogo */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-green-800 to-green-900">
          <div className="h-full max-w-4xl mx-auto p-4">
            <MatchView
              homeId={blocoAtual.jogador1_time}
              awayId={oponenteTime || 'fla'}
              userSide={blocoAtual.jogador1_session === sessionId ? "home" : "away"}
              difficulty="amador"
              turns={blocoAtual.jogadas_restantes}
              knockout={false}
              stageLabel=""
              onFinish={(result) => {
                const meusGols = blocoAtual.jogador1_session === sessionId ? result.homeGoals : result.awayGoals;
                handleFimJogada(meusGols);
              }}
              onQuit={handleSair}
            />
          </div>
        </div>
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
