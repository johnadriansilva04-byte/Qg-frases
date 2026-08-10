import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FilaEntry {
  id: string;
  session_id: string;
  time_escolhido: string;
  status: string;
  criado_em: string;
}

interface Partida {
  id: string;
  jogador1_session: string;
  jogador1_time: string;
  jogador1_tempo_restante: number;
  jogador1_gols: number;
  jogador2_session: string;
  jogador2_time: string;
  jogador2_tempo_restante: number;
  jogador2_gols: number;
  turno: string;
  rodada: number;
  status: string;
  vencedor?: string;
}

interface Usuario {
  id: string;
  email?: string;
  nome?: string;
  pontos_soberania: number;
  partidas_jogadas: number;
  partidas_vencidas: number;
}

export function useBotaoOnline() {
  const [naFila, setNaFila] = useState(false);
  const [filaId, setFilaId] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    const existingSession = localStorage.getItem('botao_session_id');
    if (existingSession) return existingSession;
    const newSession = crypto.randomUUID();
    localStorage.setItem('botao_session_id', newSession);
    return newSession;
  });
  const [partida, setPartida] = useState<Partida | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Entrar na fila
  const entrarFila = useCallback(async (timeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_fila')
        .insert({
          session_id: sessionId,
          time_escolhido: timeId,
          status: 'esperando'
        })
        .select()
        .single();

      if (error) throw error;
      
      setFilaId(data.id);
      setNaFila(true);
      
      // Iniciar polling para matchmaking
      iniciarPolling();
    } catch (err) {
      setError('Erro ao entrar na fila');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Sair da fila
  const sairFila = useCallback(async () => {
    if (filaId) {
      await supabase
        .from('botao_fila')
        .update({ status: 'cancelado' })
        .eq('id', filaId);
    }
    
    setNaFila(false);
    setFilaId(null);
    pararPolling();
  }, [filaId]);

  // Polling para verificar matchmaking
  const iniciarPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      // Verificar se foi matchado
      const { data: filaData } = await supabase
        .from('botao_fila')
        .select('status')
        .eq('id', filaId)
        .single();

      if (filaData?.status === 'em_partida') {
        // Buscar partida
        const { data: partidaData } = await supabase
          .from('botao_partidas')
          .select('*')
          .or(`jogador1_session.eq.${sessionId},jogador2_session.eq.${sessionId}`)
          .eq('status', 'em_andamento')
          .order('criada_em', { ascending: false })
          .limit(1)
          .single();

        if (partidaData) {
          setPartida(partidaData as Partida);
          setNaFila(false);
          pararPolling();
          iniciarPollingPartida();
        }
      }
    }, 2000);
  }, [filaId, sessionId]);

  const pararPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Polling para atualização da partida
  const iniciarPollingPartida = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      if (!partida) return;

      const { data: partidaAtualizada } = await supabase
        .from('botao_partidas')
        .select('*')
        .eq('id', partida.id)
        .single();

      if (partidaAtualizada) {
        setPartida(partidaAtualizada as Partida);
        
        if (partidaAtualizada.status === 'finalizada') {
          pararPolling();
        }
      }
    }, 1000);
  }, [partida]);

  // Atualizar tempo do jogador
  const atualizarTempo = useCallback(async (tempoGasto: number) => {
    if (!partida) return;

    await supabase.rpc('atualizar_tempo_jogador', {
      p_partida_id: partida.id,
      p_session: sessionId,
      p_tempo_gasto: tempoGasto
    });
  }, [partida, sessionId]);

  // Registrar gol
  const registrarGol = useCallback(async () => {
    if (!partida) return;

    await supabase.rpc('registrar_gol', {
      p_partida_id: partida.id,
      p_session: sessionId
    });
  }, [partida, sessionId]);

  // Finalizar partida
  const finalizarPartida = useCallback(async (vencedor: 'jogador1' | 'jogador2') => {
    if (!partida) return;

    await supabase.rpc('finalizar_partida', {
      p_partida_id: partida.id,
      p_vencedor: vencedor
    });
  }, [partida]);

  // Login opcional
  const login = useCallback(async (email: string, nome?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Verificar se usuário já existe
      const { data: existingUser } = await supabase
        .from('botao_usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        setUsuario(existingUser as Usuario);
      } else {
        // Criar novo usuário
        const { data: newUser } = await supabase
          .from('botao_usuarios')
          .insert({ email, nome })
          .select()
          .single();

        setUsuario(newUser as Usuario);
      }
    } catch (err) {
      setError('Erro ao fazer login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      pararPolling();
    };
  }, [pararPolling]);

  // Verificar se é meu turno
  const meuTurno = partida && (
    (partida.turno === 'jogador1' && partida.jogador1_session === sessionId) ||
    (partida.turno === 'jogador2' && partida.jogador2_session === sessionId)
  );

  // Meu tempo restante
  const meuTempoRestante = partida && (
    partida.jogador1_session === sessionId ? partida.jogador1_tempo_restante :
    partida.jogador2_session === sessionId ? partida.jogador2_tempo_restante :
    0
  );

  // Meus gols
  const meusGols = partida && (
    partida.jogador1_session === sessionId ? partida.jogador1_gols :
    partida.jogador2_session === sessionId ? partida.jogador2_gols :
    0
  );

  // Meu time
  const meuTime = partida && (
    partida.jogador1_session === sessionId ? partida.jogador1_time :
    partida.jogador2_session === sessionId ? partida.jogador2_time :
    null
  );

  return {
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
    loading,
    error
  };
}
