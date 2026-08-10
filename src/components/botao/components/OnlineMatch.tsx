import { useEffect, useState, useCallback } from "react";
import { Clock, Users, Plus, DoorOpen, Trophy, X, ArrowLeft } from "lucide-react";
import { useBotaoOnline } from "@/hooks/useBotaoOnline";
import { TEAMS, teamById } from "../data/teams";
import { MatchView } from "./MatchView";
import { TeamPicker } from "./TeamPicker";

type Screen = "lobby" | "aguardando" | "jogo" | "resultado";

export function OnlineMatch({ onBack }: { onBack?: () => void }) {
  const {
    sessionId,
    sala,
    salasDisponiveis,
    criarSala,
    listarSalas,
    entrarSala,
    inscreverListaSalas,
    sairSala,
    registrarJogada,
    registrarGol,
    forcarTrocaTurno,
    finalizarSala,
    meuTurno,
    meuTime,
    meusGols,
    tempoRestanteTurno,
    usuario,
    login,
    loading,
    error
  } = useBotaoOnline();

  const [screen, setScreen] = useState<Screen>("lobby");
  const [selectedTeam, setSelectedTeam] = useState("fla");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  // Carregar salas ao montar
  useEffect(() => {
    listarSalas();
    inscreverListaSalas();
  }, [listarSalas, inscreverListaSalas]);

  // Verificar se sala mudou para em_jogo
  useEffect(() => {
    if (sala && sala.status === 'em_jogo' && screen === 'aguardando') {
      setScreen('jogo');
    }
  }, [sala, screen]);

  // Timeout por turno
  useEffect(() => {
    if (!sala || sala.status !== 'em_jogo' || !meuTurno) return;

    const interval = setInterval(() => {
      if (tempoRestanteTurno && tempoRestanteTurno.segundos <= 0) {
        forcarTrocaTurno();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sala, meuTurno, tempoRestanteTurno, forcarTrocaTurno]);

  // Verificar fim de jogo
  useEffect(() => {
    if (sala && sala.status === 'finalizado' && screen === 'jogo') {
      setScreen('resultado');
    }
  }, [sala, screen]);

  const handleLogin = useCallback(async () => {
    if (telefone && nome) {
      await login(telefone, nome);
    }
  }, [telefone, nome, login]);

  const handleCriarSala = useCallback(async () => {
    if (!nome || !telefone) {
      alert('Por favor, digite seu nome e telefone');
      return;
    }
    await criarSala(selectedTeam, nome);
    setScreen('aguardando');
  }, [nome, telefone, selectedTeam, criarSala]);

  const handleEntrarSala = useCallback(async (salaId: string) => {
    if (!nome || !telefone) {
      alert('Por favor, digite seu nome e telefone');
      return;
    }
    await entrarSala(salaId, selectedTeam, nome);
    setScreen('jogo');
  }, [nome, telefone, selectedTeam, entrarSala]);

  const handleFimJogada = useCallback((gols: number) => {
    registrarJogada();
    if (gols > 0) {
      const jogador = sala?.jogador1_session === sessionId ? 'jogador1' : 'jogador2';
      registrarGol(jogador);
    }
  }, [registrarJogada, registrarGol, sala, sessionId]);

  const handleSair = useCallback(() => {
    sairSala();
    setScreen('lobby');
  }, [sairSala]);

  const formatarTempo = (segundos: number) => {
    return `${segundos}s`;
  };

  if (screen === "lobby") {
    return (
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Lobby Online</h2>
          {onBack && (
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-4 p-3 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Users className="inline w-4 h-4 mr-1" />
            Sistema de salas em tempo real
          </p>
          <p className="text-sm text-muted-foreground">
            <Clock className="inline w-4 h-4 mr-1" />
            20 jogadas • 30 segundos por turno
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
          <label className="block text-sm font-medium mb-2">Telefone (obrigatório - para salvar pontos)</label>
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

        <TeamPicker
          label="Escolha seu time"
          value={selectedTeam}
          onChange={setSelectedTeam}
        />

        <button
          onClick={handleCriarSala}
          disabled={loading || !nome}
          className="btn-primary w-full mt-4"
        >
          <Plus className="inline w-4 h-4 mr-2" />
          Criar Sala
        </button>

        <div className="mt-6">
          <h3 className="font-display text-lg mb-3">Salas Disponíveis</h3>
          {salasDisponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma sala disponível. Crie uma!
            </p>
          ) : (
            <div className="space-y-2">
              {salasDisponiveis.map((sala) => (
                <div
                  key={sala.id}
                  className="flex items-center justify-between p-3 bg-card rounded border"
                >
                  <div>
                    <p className="font-medium">{sala.jogador1_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Time: <TeamBadge team={teamById(sala.jogador1_time)} size="sm" />
                    </p>
                  </div>
                  <button
                    onClick={() => handleEntrarSala(sala.id)}
                    disabled={loading || !nome}
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

  if (screen === "jogo" && sala && meuTime) {
    const oponenteTime = sala.jogador1_session === sessionId ? sala.jogador2_time : sala.jogador1_time;
    const oponenteNome = sala.jogador1_session === sessionId ? sala.jogador2_nome : sala.jogador1_nome;

    return (
      <div>
        <div className="panel mb-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Jogadas restantes: {sala.jogadas_restantes}</p>
              <p className="font-display text-lg">
                Placar: {sala.jogador1_gols} - {sala.jogador2_gols}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tempo do turno</p>
              <p className={`font-display text-2xl ${tempoRestanteTurno && tempoRestanteTurno.segundos < 10 ? 'text-destructive' : ''}`}>
                <Clock className="inline w-5 h-5 mr-1" />
                {tempoRestanteTurno ? formatarTempo(tempoRestanteTurno.segundos) : '--'}
              </p>
            </div>
          </div>
          
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            {tempoRestanteTurno && (
              <div 
                className={`h-full transition-all ${tempoRestanteTurno.segundos < 10 ? 'bg-destructive' : 'bg-gold'}`}
                style={{ width: `${(tempoRestanteTurno.segundos / tempoRestanteTurno.total) * 100}%` }}
              />
            )}
          </div>

          {!meuTurno && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Aguardando turno do oponente ({oponenteNome})...
            </p>
          )}
        </div>

        <MatchView
          homeId={sala.jogador1_time}
          awayId={oponenteTime || 'fla'}
          userSide={sala.jogador1_session === sessionId ? "home" : "away"}
          difficulty="amador"
          turns={sala.jogadas_restantes}
          knockout={false}
          stageLabel={`Jogadas: ${sala.jogadas_restantes}`}
          onFinish={(result) => {
            const meusGols = sala.jogador1_session === sessionId ? result.homeGoals : result.awayGoals;
            handleFimJogada(meusGols);
          }}
          onQuit={handleSair}
        />
      </div>
    );
  }

  if (screen === "resultado" && sala) {
    const venceu = sala.vencedor === (sala.jogador1_session === sessionId ? 'jogador1' : 'jogador2');
    const souVencedor = venceu || sala.vencedor === 'empate';

    return (
      <div className="panel text-center">
        <Trophy className={`w-20 h-20 mx-auto mb-4 ${souVencedor ? 'text-gold' : 'text-muted-foreground'}`} />
        <h2 className="font-display text-3xl mb-2">
          {souVencedor ? (sala.vencedor === 'empate' ? "Empate!" : "Vitória!") : "Derrota"}
        </h2>
        <p className="text-muted-foreground mb-4">
          Placar final: {sala.jogador1_gols} - {sala.jogador2_gols}
        </p>
        
        {usuario && (
          <div className="mb-4 p-3 bg-gold/10 rounded-lg">
            <p className="text-sm">
              <Trophy className="inline w-4 h-4 mr-1 text-gold" />
              {souVencedor ? "+10 pontos" : sala.vencedor === 'empate' ? "+0 pontos" : "-5 pontos"}
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
