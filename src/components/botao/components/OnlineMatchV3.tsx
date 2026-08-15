import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Users, ArrowLeft, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MatchView } from "./MatchView";
import { supabase } from "@/integrations/supabase/client";
import { useJogador } from "@/hooks/useJogador";
import { useBotaoAuth } from "../online/useBotaoAuth";
import { createCustomTeam, teamByIdSync } from "../data/teams";
import type { Difficulty, MatchResult } from "../types";
import { MesaRealtime, type MesaRow, type JogadaPayload } from "@/lib/multiplayer/MesaRealtime";
import {
  criarMesa,
  entrarMesa,
  buscarMesa,
  buscarMesasAguardando,
  type MesaFutebol,
} from "@/lib/multiplayer/mesa.api";

type Screen = "lobby-list" | "jogo" | "resultado";

const STORAGE_KEYS = {
  SCREEN: 'botao_online_v3_screen',
  MESA_ID: 'botao_online_v3_mesa_id',
};

export function OnlineMatchV3({ onBack }: { onBack?: () => void }) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { perfil } = useBotaoAuth();
  const userId = jogador?.user_id ?? perfil?.user_id ?? "";

  const [mesaId, setMesaId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.MESA_ID));
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen) || "lobby-list");

  const mesaRef = useRef<MesaRealtime | null>(null);

  // Persistir estado
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCREEN, screen);
  }, [screen]);

  useEffect(() => {
    if (mesaId) {
      localStorage.setItem(STORAGE_KEYS.MESA_ID, mesaId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.MESA_ID);
    }
  }, [mesaId]);

  // Restaurar sessão ao montar
  useEffect(() => {
    const savedMesaId = localStorage.getItem(STORAGE_KEYS.MESA_ID);
    const savedScreen = localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen;

    if (savedScreen && savedScreen !== "lobby-list" && savedMesaId) {
      buscarMesa(savedMesaId).then(mesa => {
        if (mesa) {
          // Verificar se o usuário é participante da mesa
          const isParticipant = mesa.jogador_1_id === userId || mesa.jogador_2_id === userId;
          if (isParticipant) {
            setMesaId(savedMesaId);
            setScreen(savedScreen);
          } else {
            limparPersistencia();
            setScreen("lobby-list");
          }
        } else {
          limparPersistencia();
          setScreen("lobby-list");
        }
      });
    }
  }, [userId]);

  const limparPersistencia = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  // Time personalizado
  const meuTime = useMemo(() => {
    if (!perfil) return null;
    return {
      id: `custom-${perfil.user_id}`,
      nome: perfil.time_personalizado,
      abreviacao: perfil.abreviacao_time,
      cores: perfil.cores,
      pais: "Brasil",
      liga: "Personalizado",
      is_personalizado: true,
      usuario_id: perfil.user_id,
      created_at: perfil.created_at,
    };
  }, [perfil]);

  const { data: mesas = [], refetch: recarregarMesas } = useQuery({
    queryKey: ["mesas_futebol"],
    queryFn: buscarMesasAguardando,
    refetchInterval: 5000,
  });

  const { data: mesaAtual } = useQuery({
    queryKey: ["mesa_atual", mesaId],
    queryFn: () => mesaId ? buscarMesa(mesaId) : null,
    enabled: !!mesaId,
    refetchInterval: 3000,
  });

  // Criar mesa
  const novaMesa = useMutation({
    mutationFn: async () => {
      if (!perfil || !userId) throw new Error("Perfil não carregado.");
      const timeId = meuTime?.id ?? "MTI";
      return criarMesa(timeId);
    },
    onSuccess: (novaMesaId) => {
      setMesaId(novaMesaId);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      // Silenciar erro
    },
  });

  // Entrar em mesa
  const entrar = useMutation({
    mutationFn: async (mesa: MesaFutebol) => {
      if (!perfil || !meuTime) throw new Error("Perfil não carregado.");
      return entrarMesa(mesa.mesa_id, meuTime.id);
    },
    onSuccess: (mesa) => {
      setMesaId(mesa.mesa_id);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      // Silenciar erro
    },
  });

  if (screen === "jogo" && mesaAtual && perfil) {
    return (
      <MesaOnline
        mesa={mesaAtual}
        perfil={perfil}
        meuTime={meuTime}
        userId={userId}
        onSair={() => {
          setMesaId(null);
          setScreen("lobby-list");
          limparPersistencia();
        }}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-display text-2xl">Mesas Online v3</h2>
      </div>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Seu time</h2>
        {meuTime && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border"
              style={{ background: meuTime.cores[0] }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: meuTime.cores[1] }}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: meuTime.cores[2] }} />
              </span>
            </span>
            <div>
              <p className="font-display text-lg">{meuTime.nome}</p>
              <p className="text-sm text-muted-foreground">{meuTime.abreviacao}</p>
            </div>
          </div>
        )}
      </section>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Criar mesa</h2>
        <button onClick={() => novaMesa.mutate()} disabled={novaMesa.isPending || !perfil} className="btn-primary">
          <Plus className="mr-1 h-4 w-4" /> {novaMesa.isPending ? "Criando..." : "Abrir mesa"}
        </button>
        {!perfil && (
          <p className="text-sm text-red-500">Você precisa estar logado para criar uma mesa.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Mesas disponíveis</h2>
          <button className="btn-ghost text-sm" onClick={() => recarregarMesas()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
          </button>
        </div>
        {mesas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma mesa disponível. Seja o primeiro a abrir.</p>
        )}
        {mesas.map((mesa) => {
          const souJogador1 = mesa.jogador_1_id === userId;
          const souParticipante = souJogador1 || mesa.jogador_2_id === userId;
          return (
            <article key={mesa.id} className="surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg leading-tight">Mesa {mesa.mesa_id}</h3>
                <p className="text-xs text-muted-foreground">
                  {mesa.status === "aguardando"
                    ? "Aguardando adversário"
                    : mesa.status === "em_andamento"
                      ? `Em jogo · ${mesa.placar_j1} x ${mesa.placar_j2}`
                      : `Finalizado · ${mesa.placar_j1} x ${mesa.placar_j2}`}
                </p>
              </div>
              {souParticipante ? (
                <button onClick={() => { setMesaId(mesa.mesa_id); setScreen("jogo"); }} className="btn-primary">
                  Reentrar
                </button>
              ) : mesa.status === "aguardando" ? (
                <button onClick={() => entrar.mutate(mesa)} disabled={entrar.isPending} className="btn-primary">
                  <Users className="mr-1 h-4 w-4" /> Entrar
                </button>
              ) : (
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Mesa ocupada</span>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

/** Mesa online com MesaRealtime */
function MesaOnline({
  mesa,
  perfil,
  meuTime,
  userId,
  onSair,
}: {
  mesa: MesaFutebol;
  perfil: any;
  meuTime: any;
  userId: string;
  onSair: () => void;
}) {
  const souJogador1 = mesa.jogador_1_id === userId;
  
  const [currentTurn, setCurrentTurn] = useState<"home" | "away">(souJogador1 ? "home" : "away");
  const [placar, setPlacar] = useState([mesa.placar_j1, mesa.placar_j2]);
  const [tempoRestante, setTempoRestante] = useState(mesa.tempo_restante_segundos || 300); // Default 5 minutos se não tiver valor
  const [oponenteOnline, setOponenteOnline] = useState(false);
  const [jogadaAdversaria, setJogadaAdversaria] = useState<JogadaPayload | null>(null);
  const [doisJogadoresConectados, setDoisJogadoresConectados] = useState(mesa.status === "em_andamento" || (mesa.jogador_2_id !== null)); // Se já tiver 2 jogadores ou estiver em andamento
  const [partidaIniciada, setPartidaIniciada] = useState(mesa.status === "em_andamento"); // Se já estiver em andamento, não bloquear
  const mesaRef = useRef<MesaRealtime | null>(null);
  const userTeam = useMemo(() => {
    if (!meuTime) return createCustomTeam('custom', 'Meu Time', 'MTI', '#FF0000', '#00FF00', 75);
    return createCustomTeam(
      meuTime.id,
      meuTime.nome,
      meuTime.abreviacao,
      meuTime.cores[0],
      meuTime.cores[1],
      75
    );
  }, [meuTime]);

  const opponentTeam = useMemo(() => {
    // Buscar o time do adversário da mesa
    const opponentTimeId = souJogador1 ? mesa.time_j2 : mesa.time_j1;
    
    if (!opponentTimeId) {
      // Se ainda não tem adversário, usar time genérico
      return createCustomTeam('opponent', 'Aguardando...', '---', '#666666', '#999999', 75);
    }

    // Se o time for personalizado (começa com "custom-"), criar com dados genéricos
    // Na prática, precisaríamos buscar os dados do time personalizado do adversário do banco
    if (opponentTimeId.startsWith('custom-')) {
      return createCustomTeam(opponentTimeId, 'Adversário', 'ADV', '#FF0000', '#FFFFFF', 75);
    }

    // Buscar time do banco de dados
    const teamFromDb = teamByIdSync(opponentTimeId);
    if (teamFromDb) {
      return teamFromDb;
    }

    // Fallback para time genérico
    return createCustomTeam(opponentTimeId, 'Adversário', 'ADV', '#0000FF', '#FFFF00', 75);
  }, [mesa.time_j1, mesa.time_j2, souJogador1]);

  const homeId = souJogador1 ? userTeam.id : opponentTeam.id;
  const awayId = souJogador1 ? opponentTeam.id : userTeam.id;
  const userSide = souJogador1 ? "home" : "away";

  // Inicializar MesaRealtime
  useEffect(() => {
    if (!userId || !mesa.mesa_id) return;

    const mesaRealtime = new MesaRealtime({
      supabase,
      mesaId: mesa.mesa_id,
      userId,
      handlers: {
        onJogadaAdversaria: (jogada) => {
          setJogadaAdversaria(jogada);
        },
        onEstado: (m) => {
          setPlacar([m.placar_j1, m.placar_j2]);
        },
        onTurno: (meuTurno, turnoAtualId) => {
          // Lógica simples: se turno_atual_id == jogador_1_id, então home, senão away
          const novoTurno = turnoAtualId === mesa.jogador_1_id ? "home" : "away";
          setCurrentTurn(novoTurno);
        },
        onTempo: (segundos) => {
          setTempoRestante(segundos);
        },
        onOponente: (online) => {
          setOponenteOnline(online);
        },
        onDoisJogadoresConectados: (jogador1Id, jogador2Id) => {
          setDoisJogadoresConectados(true);
        },
        onSyncPositions: (payload) => {
          // Será aplicado no MatchView via callback
        },
        onGoalScored: (payload) => {
          setPlacar([payload.placar.home, payload.placar.away]);
        },
        onPartidaIniciada: (m) => {
          setPartidaIniciada(true);
        },
        onPartidaFinalizada: (m) => {
          // Partida finalizada
        },
        onFimDeTurno: (payload) => {
          // Será aplicado no MatchView via callback
        },
        onErro: (erro) => {
          // Erro
        },
      },
    });

    mesaRealtime.conectarMesa();
    mesaRef.current = mesaRealtime;

    return () => {
      mesaRealtime.desconectar();
    };
  }, [userId, mesa.mesa_id, userSide]);

  const handleFinish = useCallback((result: MatchResult) => {
    onSair();
  }, [onSair]);

  const handlePlay = useCallback(async (goals: number, jogadaData?: { discId: string; ix: number; iy: number; power: number }, posicoesFinais?: { discos: Array<{ id: string; x: number; y: number }>; bola: { x: number; y: number } }) => {
    if (!mesaRef.current) return;

    try {
      // Enviar jogada via MesaRealtime com dados reais da física
      if (jogadaData && jogadaData.discId !== "own_goal" && jogadaData.discId !== "goal" && jogadaData.discId !== "pass_turn" && jogadaData.discId !== "no_goal") {
        await mesaRef.current.enviarJogada({
          id_botao: jogadaData.discId,
          forca: Math.round(jogadaData.power * 100),
          forca_x: jogadaData.ix,
          forca_y: jogadaData.iy,
          angulo: Math.round(Math.atan2(jogadaData.iy, jogadaData.ix) * (180 / Math.PI)),
          origem: { x: 0, y: 0 }, // Será preenchido pela posição real do disco
        });
      }

      // Se houve gol, registrar o gol e enviar broadcast
      if (goals > 0) {
        await mesaRef.current.registrarGol();
        // Enviar broadcast do gol para atualizar placar instantaneamente
        await mesaRef.current.enviarGoalScored({
          jogadorId: userId,
          placar: { home: placar[0], away: placar[1] },
        });
      }

      // Se a jogada terminou sem gol e temos posições finais, enviar evento de fim de turno
      if (goals === 0 && posicoesFinais && jogadaData?.discId === "no_goal") {
        await mesaRef.current.enviarFimDeTurno({
          discos: posicoesFinais.discos,
          bola: posicoesFinais.bola,
          jogadorId: userId,
        });
      }
    } catch (error) {
      // Erro ao enviar jogada
    }
  }, [userId, placar]);

  const handleQuit = useCallback(() => {
    if (mesaRef.current) {
      mesaRef.current.desconectar(true);
    }
    onSair();
  }, [onSair]);

  const meuTurno = currentTurn === userSide;

  const iniciarPartida = async () => {
    if (!mesaRef.current) return;
    if (!doisJogadoresConectados) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('iniciar_partida_mesa', {
        p_mesa_id: mesa.mesa_id
      });

      if (error) {
        return;
      }

      setPartidaIniciada(true);
    } catch (error) {
      // Erro ao iniciar partida
    }
  };

  // Mostrar tela de espera se não tiver 2 jogadores conectados
  if (!doisJogadoresConectados) {
    return (
      <div className="space-y-4">
        <div className="surface p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl">Mesa {mesa.mesa_id}</h2>
            <p className="text-sm text-muted-foreground">
              Aguardando oponente... {oponenteOnline ? "Oponente conectado!" : "Aguardando conexão"}
            </p>
          </div>
          <button onClick={handleQuit} className="btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="surface p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium">Aguardando segundo jogador...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Compartilhe o código da sala: <span className="font-mono font-bold">{mesa.mesa_id}</span>
          </p>
        </div>
      </div>
    );
  }

  // Mostrar botão para iniciar partida se 2 jogadores conectados mas partida não iniciada
  if (doisJogadoresConectados && !partidaIniciada) {
    return (
      <div className="space-y-4">
        <div className="surface p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl">Mesa {mesa.mesa_id}</h2>
            <p className="text-sm text-muted-foreground">
              2 jogadores conectados! Pronto para começar.
            </p>
          </div>
          <button onClick={handleQuit} className="btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="surface p-8 text-center">
          <p className="text-lg font-medium mb-4">Ambos os jogadores estão conectados!</p>
          <button onClick={iniciarPartida} className="btn-primary">
            Iniciar Partida
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl">Mesa {mesa.mesa_id}</h2>
          <p className="text-sm text-muted-foreground">
            Placar: {placar[0]} x {placar[1]} · Tempo: {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-muted-foreground">
            {meuTurno ? "Seu turno" : "Turno do oponente"} · Oponente: {oponenteOnline ? "Online" : "Offline"}
          </p>
        </div>
        <button onClick={handleQuit} className="btn-ghost">
          <X className="w-5 h-5" />
        </button>
      </div>

      <MatchView
        key={`${mesa.id}-${currentTurn}`}
        homeId={homeId}
        awayId={awayId}
        userSide={userSide}
        difficulty="amador" as Difficulty
        turns={12} // Melhor de 3 (12 jogadas por partida)
        knockout={false}
        stageLabel={`Partida Online - ${meuTurno ? 'Seu turno' : 'Turno do oponente'}`}
        onFinish={handleFinish}
        onQuit={handleQuit}
        isOnline={true}
        customTeam={userTeam}
        onPlay={handlePlay}
        initialTurn={currentTurn}
        onJogadaAdversaria={(jogada) => {
          // Aplicar jogada na física do MatchView
        }}
        onFimDeTurno={(handler) => {
          // O handler será chamado pelo MatchView quando receber posições finais
        }}
      />
    </div>
  );
}
