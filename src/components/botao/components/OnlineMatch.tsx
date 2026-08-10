import { useEffect, useState, useCallback } from "react";
import { Clock, Users, Timer, Trophy, X } from "lucide-react";
import { useBotaoOnline } from "@/hooks/useBotaoOnline";
import { TEAMS, teamById } from "../data/teams";
import { MatchView } from "./MatchView";
import { TeamPicker } from "./TeamPicker";

type Screen = "selecao" | "fila" | "jogo" | "resultado";

export function OnlineMatch() {
  const {
    sessionId,
    naFila,
    entrarFila,
    sairFila,
    partida,
    meuTurno,
    meuTempoRestante,
    meusGols,
    meuTime,
    atualizarTempo,
    registrarGol,
    finalizarPartida,
    usuario,
    login,
    loading
  } = useBotaoOnline();

  const [screen, setScreen] = useState<Screen>("selecao");
  const [selectedTeam, setSelectedTeam] = useState("fla");
  const [rodada, setRodada] = useState(1);
  const [placarRodadas, setPlacarRodadas] = useState({ jogador1: 0, jogador2: 0 });
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");

  // Cronômetro de tempo por rodada
  useEffect(() => {
    if (!meuTurno || !partida || partida.status !== 'em_andamento') return;

    const interval = setInterval(() => {
      setTempoDecorrido(prev => prev + 1);
      atualizarTempo(1);
    }, 1000);

    return () => clearInterval(interval);
  }, [meuTurno, partida, atualizarTempo]);

  // Verificar se tempo acabou
  useEffect(() => {
    if (meuTempoRestante !== undefined && meuTempoRestante <= 0) {
      finalizarPartida(meuTurno ? 'jogador2' : 'jogador1');
    }
  }, [meuTempoRestante, meuTurno, finalizarPartida]);

  const handleEntrarFila = useCallback(async () => {
    await entrarFila(selectedTeam);
    setScreen("fila");
  }, [selectedTeam, entrarFila]);

  const handleLogin = useCallback(async () => {
    if (email) {
      await login(email, nome);
    }
  }, [email, nome, login]);

  const handleGol = useCallback(() => {
    registrarGol();
  }, [registrarGol]);

  const handleFimRodada = useCallback((gols: number) => {
    const novoPlacar = { ...placarRodadas };
    const golsOponente = partida?.jogador1_session === sessionId ? partida.jogador2_gols : partida.jogador1_gols;
    
    // Determina quem ganhou a rodada baseado nos gols
    if (partida?.jogador1_session === sessionId) {
      if (gols > golsOponente) {
        novoPlacar.jogador1 += 1;
      } else if (golsOponente > gols) {
        novoPlacar.jogador2 += 1;
      }
    } else {
      if (gols > golsOponente) {
        novoPlacar.jogador2 += 1;
      } else if (golsOponente > gols) {
        novoPlacar.jogador1 += 1;
      }
    }
    setPlacarRodadas(novoPlacar);

    if (rodada < 3) {
      setRodada(rodada + 1);
      setTempoDecorrido(0);
    } else {
      // Melhor de 3 acabou
      const vencedor = novoPlacar.jogador1 > novoPlacar.jogador2 ? 'jogador1' : 
                      novoPlacar.jogador2 > novoPlacar.jogador1 ? 'jogador2' : 'empate';
      finalizarPartida(vencedor as 'jogador1' | 'jogador2');
      setScreen("resultado");
    }
  }, [placarRodadas, partida, sessionId, rodada, finalizarPartida]);

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (screen === "selecao") {
    return (
      <div className="panel">
        <h2 className="font-display text-2xl mb-4">Amistoso Online - Melhor de 3</h2>
        
        <div className="mb-4 p-3 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Users className="inline w-4 h-4 mr-1" />
            Cada jogador tem 3 minutos por rodada
          </p>
          <p className="text-sm text-muted-foreground">
            <Timer className="inline w-4 h-4 mr-1" />
            Se o tempo zerar, você perde a rodada
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Email (opcional - para salvar pontos)</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 px-3 py-2 rounded border bg-background"
            />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="flex-1 px-3 py-2 rounded border bg-background"
            />
            <button
              onClick={handleLogin}
              disabled={loading || !email}
              className="btn-primary px-4"
            >
              Salvar
            </button>
          </div>
        </div>

        <TeamPicker
          label="Escolha seu time"
          value={selectedTeam}
          onChange={setSelectedTeam}
        />

        <button
          onClick={handleEntrarFila}
          disabled={loading}
          className="btn-primary w-full mt-4"
        >
          {loading ? "Entrando..." : "Buscar Oponente"}
        </button>

        {usuario && (
          <div className="mt-4 p-3 bg-gold/10 rounded-lg">
            <p className="text-sm">
              <Trophy className="inline w-4 h-4 mr-1 text-gold" />
              Pontos: {usuario.pontos_soberania} | 
              Vitórias: {usuario.partidas_vencidas}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (screen === "fila") {
    return (
      <div className="panel text-center">
        <div className="animate-pulse mb-4">
          <Users className="w-16 h-16 mx-auto text-accent" />
        </div>
        <h2 className="font-display text-2xl mb-2">Buscando oponente...</h2>
        <p className="text-muted-foreground mb-4">Você está na fila de espera</p>
        <p className="text-sm text-muted-foreground mb-4">
          Time: <TeamBadge team={teamById(selectedTeam)} size="sm" />
        </p>
        <button
          onClick={sairFila}
          className="btn-ghost"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </button>
      </div>
    );
  }

  if (screen === "jogo" && partida) {
    const tempoTotal = 180; // 3 minutos
    const tempoRestante = meuTempoRestante !== undefined ? meuTempoRestante : tempoTotal - tempoDecorrido;
    const porcentagemTempo = (tempoRestante / tempoTotal) * 100;

    return (
      <div>
        <div className="panel mb-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Rodada {rodada} de 3</p>
              <p className="font-display text-lg">
                Placar: {placarRodadas.jogador1} - {placarRodadas.jogador2}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Seu tempo</p>
              <p className={`font-display text-2xl ${tempoRestante < 30 ? 'text-destructive' : ''}`}>
                <Clock className="inline w-5 h-5 mr-1" />
                {formatarTempo(tempoRestante)}
              </p>
            </div>
          </div>
          
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${tempoRestante < 30 ? 'bg-destructive' : 'bg-gold'}`}
              style={{ width: `${porcentagemTempo}%` }}
            />
          </div>

          {!meuTurno && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Aguardando turno do oponente...
            </p>
          )}
        </div>

        <MatchView
          homeId={partida.jogador1_time}
          awayId={partida.jogador2_time}
          userSide={partida.jogador1_session === sessionId ? "home" : "away"}
          difficulty="amador"
          turns={24}
          knockout={false}
          stageLabel={`Rodada ${rodada}`}
          onFinish={(result) => {
            const meusGols = partida.jogador1_session === sessionId ? result.homeGoals : result.awayGoals;
            handleFimRodada(meusGols);
          }}
          onQuit={() => sairFila()}
        />
      </div>
    );
  }

  if (screen === "resultado") {
    const venceu = placarRodadas.jogador1 > placarRodadas.jogador2;
    const souVencedor = (venceu && partida?.jogador1_session === sessionId) ||
                        (!venceu && partida?.jogador2_session === sessionId);

    return (
      <div className="panel text-center">
        <Trophy className={`w-20 h-20 mx-auto mb-4 ${souVencedor ? 'text-gold' : 'text-muted-foreground'}`} />
        <h2 className="font-display text-3xl mb-2">
          {souVencedor ? "Vitória!" : "Derrota"}
        </h2>
        <p className="text-muted-foreground mb-4">
          Placar final: {placarRodadas.jogador1} - {placarRodadas.jogador2}
        </p>
        
        {usuario && (
          <div className="mb-4 p-3 bg-gold/10 rounded-lg">
            <p className="text-sm">
              <Trophy className="inline w-4 h-4 mr-1 text-gold" />
              {souVencedor ? "+10 pontos" : "-5 pontos"}
            </p>
          </div>
        )}

        <button
          onClick={() => {
            setScreen("selecao");
            setRodada(1);
            setPlacarRodadas({ jogador1: 0, jogador2: 0 });
            setTempoDecorrido(0);
          }}
          className="btn-primary w-full"
        >
          Jogar Novamente
        </button>
      </div>
    );
  }

  return null;
}

function TeamBadge({ team, size }: { team: ReturnType<typeof teamById>; size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`rounded-full border-2 ${size === "sm" ? "w-4 h-4" : "w-6 h-6"}`}
        style={{ background: team.primary, borderColor: team.secondary }}
      />
      <span>{team.short}</span>
    </span>
  );
}
