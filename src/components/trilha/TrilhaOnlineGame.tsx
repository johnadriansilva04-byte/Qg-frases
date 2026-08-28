import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Trophy, Target, X, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registrarEventoMissao } from "@/lib/cidadela/pracinhaCore";
import { TrilhaBoard } from "./TrilhaBoard";
import { HQPanel } from "./HQPanel";
import { MatchEndAdCard } from "@/components/MatchEndAdCard";
import { legalDestinations, legalPlacements, canFly, millsFormedAt, removableTargets, opponent, type Player } from "@/lib/trilha/engine";

interface TrilhaOnlineGameProps {
  mesaId: string;
  onBack?: () => void;
}

export function TrilhaOnlineGame({ mesaId, onBack }: TrilhaOnlineGameProps) {
  const [mesa, setMesa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);
  const missaoRegistradaRef = useRef(false);

  useEffect(() => {
    if (
      missaoRegistradaRef.current ||
      !userId ||
      !mesa ||
      mesa.status !== "em_andamento"
    ) {
      return;
    }
    missaoRegistradaRef.current = true;
    void registrarEventoMissao("trilha_online");
  }, [mesa, userId]);

  useEffect(() => {
    // Verificar se Supabase está configurado
    try {
      const isMock = !supabase || typeof supabase.from !== 'function';
      if (isMock) {
        setSupabaseNotConfigured(true);
        setLoading(false);
        return;
      }
    } catch (e) {
      setSupabaseNotConfigured(true);
      setLoading(false);
      return;
    }

    // Obter usuário atual
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();

    // Carregar estado inicial da mesa
    const loadMesa = async () => {
      const { data, error } = await supabase
        .from('mesas_trilha')
        .select('*')
        .eq('mesa_id', mesaId)
        .single();

      if (error) {
        setError('Erro ao carregar mesa: ' + error.message);
        setLoading(false);
        return;
      }

      setMesa(data);
      setLoading(false);
    };

    loadMesa();

    // Assinar mudanças em tempo real
    console.log('[TrilhaOnline] Inscrevendo na mesa:', mesaId);
    const channel = supabase
      .channel(`mesa_${mesaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mesas_trilha',
          filter: `mesa_id=eq.${mesaId}`
        },
        (payload) => {
          console.log('[TrilhaOnline] Mesa atualizada via realtime:', payload.new);
          setMesa(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mesas_trilha',
          filter: `mesa_id=eq.${mesaId}`
        },
        (payload) => {
          console.log('[TrilhaOnline] Mesa inserida via realtime:', payload.new);
          setMesa(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[TrilhaOnline] Status da subscrição:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('[TrilhaOnline] Erro na subscrição realtime');
          setError('Erro na conexão em tempo real. Tentando reconectar...');
        }
      });

    // Heartbeat para manter presença + recarregar estado periodicamente
    const heartbeatInterval = setInterval(async () => {
      if (userId) {
        await supabase.rpc('registrar_heartbeat_mesa_trilha', {
          p_mesa_id: mesaId
        });

        // Recarregar estado da mesa periodicamente para garantir sincronização
        const { data: currentMesa } = await supabase
          .from('mesas_trilha')
          .select('*')
          .eq('mesa_id', mesaId)
          .single();

        if (currentMesa) {
          console.log('[TrilhaOnline] Recarregando estado da mesa via heartbeat');
          setMesa(currentMesa);
        }
      }
    }, 5000); // 5 segundos

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeatInterval);
    };
  }, [mesaId, userId]);

  if (supabaseNotConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="texto-marca text-2xl mb-4">Modo Online Indisponível</h2>
          <p className="text-muted-foreground mb-6">
            O modo online precisa do Supabase configurado. Por enquanto, jogue no modo carreira local!
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  const isMyTurn = mesa && userId && (
    (mesa.turn === 1 && mesa.jogador_1_id === userId) ||
    (mesa.turn === 2 && mesa.jogador_2_id === userId)
  );

  const myPlayerNumber = mesa && userId ? (
    mesa.jogador_1_id === userId ? 1 : 2
  ) : null;

  const targets = useMemo(() => {
    if (!mesa) return new Set<number>();

    const gameState = {
      board: mesa.board,
      turn: mesa.turn,
      hand: { 1: mesa.hand_p1, 2: mesa.hand_p2 },
      phase: mesa.phase,
      captured: { 1: mesa.captured_p1 || 0, 2: mesa.captured_p2 || 0 },
      winner: null,
      reason: null,
      ply: 0
    };

    if (mesa.phase === "placing") {
      return new Set(legalPlacements(gameState));
    }

    if (selected !== null) {
      return new Set(legalDestinations(gameState, selected));
    }

    return new Set<number>();
  }, [mesa, selected]);

  const captureTargets = useMemo(() => {
    if (!mesa || !mesa.pending_capture) return new Set<number>();

    const gameState = {
      board: mesa.board,
      turn: mesa.turn,
      hand: { 1: mesa.hand_p1, 2: mesa.hand_p2 },
      phase: mesa.phase,
      captured: { 1: mesa.captured_p1 || 0, 2: mesa.captured_p2 || 0 },
      winner: null,
      reason: null,
      ply: 0
    };

    const foe = opponent(mesa.turn);
    const targets = removableTargets(gameState.board, foe);
    return new Set(targets);
  }, [mesa]);

  const handleNodeClick = async (node: number) => {
    if (!mesa || !userId || !isMyTurn || mesa.status !== 'em_andamento') return;

    // Se está esperando captura
    if (mesa.pending_capture) {
      if (captureTargets.has(node)) {
        await fazerJogada(mesa.last_move_from, mesa.last_move_to, node);
      }
      return;
    }

    // Fase de colocação de peças
    if (mesa.phase === "placing") {
      if (targets.has(node)) {
        await fazerJogada(null, node, null);
      }
      return;
    }

    // Fase de movimentação - apenas turno do jogador
    if (mesa.turn === myPlayerNumber) {
      if (selected === null) {
        // Selecionar peça para mover
        if (mesa.board[node] === myPlayerNumber) {
          setSelected(node);
        }
      } else {
        // Já tem peça selecionada
        if (node === selected) {
          // Deselecionar
          setSelected(null);
        } else if (targets.has(node)) {
          // Mover para destino válido
          await fazerJogada(selected, node, null);
          setSelected(null);
        } else if (mesa.board[node] === myPlayerNumber) {
          // Selecionar outra peça própria
          setSelected(node);
        }
      }
    }
  };

  const fazerJogada = async (from: number | null, to: number, remove: number | null) => {
    if (!mesa) return;

    const newBoard = [...mesa.board];
    let newHandP1 = mesa.hand_p1;
    let newHandP2 = mesa.hand_p2;
    let newPhase = mesa.phase;
    let newPendingCapture = false;

    // Aplicar jogada no board
    if (from === null) {
      // Colocação
      newBoard[to] = mesa.turn;
      if (mesa.turn === 1) {
        newHandP1--;
      } else {
        newHandP2--;
      }
    } else {
      // Movimentação
      newBoard[from] = 0;
      newBoard[to] = mesa.turn;
    }

    // Verificar mudança de fase
    if (newHandP1 === 0 && newHandP2 === 0 && mesa.phase === "placing") {
      newPhase = "moving";
    }

    // Verificar trilha usando o motor do jogo (antes da remoção da peça capturada)
    const formedMill = millsFormedAt(newBoard, to, mesa.turn).length > 0;
    if (formedMill && remove === null) {
      // Se formou trilha e ainda não removeu peça, ativa modo de captura
      newPendingCapture = true;
    }

    // Remoção de peça (após verificar trilha)
    if (remove !== null) {
      newBoard[remove] = 0;
    }

    try {
      const { error } = await supabase.rpc('registrar_jogada_trilha', {
        p_mesa_id: mesaId,
        p_from: from,
        p_to: to,
        p_remove: remove,
        p_board: newBoard,
        p_hand_p1: newHandP1,
        p_hand_p2: newHandP2,
        p_phase: newPhase,
        p_pending_capture: newPendingCapture
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao fazer jogada:', error);
      alert('Erro ao fazer jogada. Tente novamente.');
    }
  };

  const status = useMemo(() => {
    if (!mesa) return "Carregando...";
    
    if (mesa.status === 'finalizado') {
      if (mesa.vencedor_id === userId) return "Vitória! Você venceu a partida!";
      if (mesa.vencedor_id) return "Derrota. O oponente venceu.";
      return "Partida finalizada.";
    }

    if (mesa.status === 'aguardando') return "Aguardando oponente...";

    if (mesa.pending_capture) return "TRILHA FECHADA! Selecione a peça inimiga a neutralizar.";

    if (!isMyTurn) return "Aguardando o oponente.";

    if (mesa.phase === "placing") {
      const myHand = myPlayerNumber === 1 ? mesa.hand_p1 : mesa.hand_p2;
      return `Desdobre um pracinha. Reserva: ${myHand}.`;
    }

    const flying = canFly({
      board: mesa.board,
      turn: mesa.turn,
      hand: { 1: mesa.hand_p1, 2: mesa.hand_p2 },
      phase: mesa.phase,
      captured: { 1: mesa.captured_p1 || 0, 2: mesa.captured_p2 || 0 },
      winner: null,
      reason: null,
      ply: 0
    }, myPlayerNumber || 1);
    
    if (flying) return "Esquadrão em voo: salte para qualquer interseção vazia.";
    if (selected === null) return "Selecione um pracinha para manobrar.";
    return "Escolha a interseção adjacente de destino.";
  }, [mesa, isMyTurn, myPlayerNumber, selected, userId]);

  const handleResign = async () => {
    if (!confirm('Tem certeza que deseja abandonar a partida?')) return;

    try {
      const { error } = await supabase.rpc('abandonar_partida_trilha', {
        p_mesa_id: mesaId
      });

      if (error) throw error;
      if (onBack) onBack();
    } catch (error) {
      console.error('Erro ao abandonar partida:', error);
      alert('Erro ao abandonar partida. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Carregando jogo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold mb-2">Erro</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!mesa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Mesa não encontrada.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="texto-marca text-lg sm:text-xl">TRILHA ONLINE</h2>
            <p className="text-xs text-muted-foreground">Mesa: {mesaId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isMyTurn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {isMyTurn ? "Seu turno" : "Turno do oponente"}
          </div>
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Sair</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {mesa.status === 'finalizado' ? "Partida Finalizada" : "Partida em Andamento"}
            </h1>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
          {mesa.status === 'em_andamento' && (
            <button
              onClick={handleResign}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Abandonar Partida
            </button>
          )}
        </div>

        {mesa.status === 'finalizado' && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-yellow-500">
              {mesa.vencedor_id === userId ? "Vitória!" : "Derrota"}
            </h3>
            <p className="text-muted-foreground">
              {mesa.motivo_finalizacao === 'abandono' ? 'O oponente abandonou a partida.' : 'Partida finalizada.'}
            </p>
          </div>
        )}

        {/* Card de anúncio no fim de partida online */}
        {mesa.status === 'finalizado' && <MatchEndAdCard />}

        <div className="flex gap-6 items-start flex-col lg:flex-row">
          <div className="flex flex-1 flex-col items-center w-full">
            <TrilhaBoard
              state={{
                board: mesa.board,
                turn: mesa.turn,
                hand: { 1: mesa.hand_p1, 2: mesa.hand_p2 },
                phase: mesa.phase,
                captured: { 1: mesa.captured_p1 || 0, 2: mesa.captured_p2 || 0 },
                winner: null,
                reason: null,
                ply: 0
              }}
              perspective={myPlayerNumber || 1}
              selected={selected}
              targets={targets}
              captureTargets={captureTargets}
              lastMove={mesa.last_move_to ? {
                from: mesa.last_move_from,
                to: mesa.last_move_to,
                remove: mesa.last_move_remove
              } : null}
              interactive={isMyTurn && mesa.status === 'em_andamento'}
              onNodeClick={handleNodeClick}
            />
          </div>

          <HQPanel
            state={{
              board: mesa.board,
              turn: mesa.turn,
              hand: { 1: mesa.hand_p1, 2: mesa.hand_p2 },
              phase: mesa.phase,
              captured: { 1: mesa.captured_p1 || 0, 2: mesa.captured_p2 || 0 },
              winner: null,
              reason: null,
              ply: 0
            }}
            myPlayer={myPlayerNumber || 1}
            p1={{ name: "Jogador 1", slot: 1, subtitle: mesa.jogador_1_id === userId ? "Você" : "Oponente" }}
            p2={{ name: "Jogador 2", slot: 2, subtitle: mesa.jogador_2_id === userId ? "Você" : "Oponente" }}
            status={status}
            log={[]}
            awaitingCapture={mesa.pending_capture}
            onRestart={() => {}}
            onResign={handleResign}
          />
        </div>
      </main>
    </div>
  );
}
