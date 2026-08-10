import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Sala {
  id: string;
  created_at: string;
  jogador1_session: string;
  jogador1_nome: string;
  jogador1_time: string;
  jogador2_session?: string;
  jogador2_nome?: string;
  jogador2_time?: string;
  status: string;
  turno: string;
  jogadas_restantes: number;
  timestamp_inicio_turno: string;
  tempo_maximo_turno: number;
  jogador1_gols: number;
  jogador2_gols: number;
  rodada: number;
  vencedor?: string;
  finalizada_em?: string;
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
  const [sessionId] = useState(() => {
    const existingSession = localStorage.getItem('botao_session_id');
    if (existingSession) return existingSession;
    const newSession = crypto.randomUUID();
    localStorage.setItem('botao_session_id', newSession);
    return newSession;
  });
  
  const [sala, setSala] = useState<Sala | null>(null);
  const [salasDisponiveis, setSalasDisponiveis] = useState<Sala[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Criar sala (jogador 1)
  const criarSala = useCallback(async (timeId: string, nome: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_salas')
        .insert({
          jogador1_session: sessionId,
          jogador1_nome: nome,
          jogador1_time: timeId,
          status: 'aguardando'
        })
        .select()
        .single();

      if (error) throw error;
      
      setSala(data);
      
      // Inscrever em realtime para esta sala
      inscreverSala(data.id);
    } catch (err) {
      setError('Erro ao criar sala');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Listar salas disponíveis
  const listarSalas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_salas')
        .select('*')
        .eq('status', 'aguardando')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSalasDisponiveis(data || []);
    } catch (err) {
      setError('Erro ao listar salas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Entrar em sala existente (jogador 2)
  const entrarSala = useCallback(async (salaId: string, timeId: string, nome: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_salas')
        .update({
          jogador2_session: sessionId,
          jogador2_nome: nome,
          jogador2_time: timeId,
          status: 'em_jogo',
          turno: 'jogador1',
          timestamp_inicio_turno: new Date().toISOString()
        })
        .eq('id', salaId)
        .select()
        .single();

      if (error) throw error;
      
      setSala(data);
      
      // Inscrever em realtime para esta sala
      inscreverSala(salaId);
    } catch (err) {
      setError('Erro ao entrar na sala');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Inscrever em realtime para uma sala
  const inscreverSala = useCallback((salaId: string) => {
    // Limpar canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`sala-${salaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'botao_salas',
          filter: `id=eq.${salaId}`
        },
        (payload) => {
          setSala(payload.new as Sala);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Inscrever em realtime para lista de salas
  const inscreverListaSalas = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('lista-salas')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'botao_salas'
        },
        () => {
          listarSalas();
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [listarSalas]);

  // Registrar jogada
  const registrarJogada = useCallback(async () => {
    if (!sala) return;
    
    await supabase.rpc('registrar_jogada', {
      p_sala_id: sala.id
    });
  }, [sala]);

  // Registrar gol
  const registrarGol = useCallback(async (jogador: 'jogador1' | 'jogador2') => {
    if (!sala) return;
    
    await supabase.rpc('registrar_gol_sala', {
      p_sala_id: sala.id,
      p_jogador: jogador
    });
  }, [sala]);

  // Forçar troca de turno por timeout
  const forcarTrocaTurno = useCallback(async () => {
    if (!sala) return;
    
    await supabase.rpc('forcar_troca_turno', {
      p_sala_id: sala.id
    });
  }, [sala]);

  // Finalizar sala
  const finalizarSala = useCallback(async (vencedor: 'jogador1' | 'jogador2' | 'empate') => {
    if (!sala) return;
    
    await supabase.rpc('finalizar_sala', {
      p_sala_id: sala.id,
      p_vencedor: vencedor
    });
  }, [sala]);

  // Sair da sala
  const sairSala = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setSala(null);
    setSalasDisponiveis([]);
  }, []);

  // Login
  const login = useCallback(async (email: string, nome?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_usuarios')
        .upsert({
          email,
          nome
        })
        .select()
        .single();
      
      if (error) throw error;
      setUsuario(data);
    } catch (err) {
      setError('Erro ao fazer login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Determinar se é meu turno
  const meuTurno = sala ? (
    (sala.jogador1_session === sessionId && sala.turno === 'jogador1') ||
    (sala.jogador2_session === sessionId && sala.turno === 'jogador2')
  ) : false;

  // Determinar meu time
  const meuTime = sala ? (
    sala.jogador1_session === sessionId ? sala.jogador1_time : sala.jogador2_time
  ) : undefined;

  // Determinar meus gols
  const meusGols = sala ? (
    sala.jogador1_session === sessionId ? sala.jogador1_gols : sala.jogador2_gols
  ) : 0;

  // Calcular tempo restante do turno
  const tempoRestanteTurno = sala ? {
    segundos: sala.tempo_maximo_turno - Math.floor((Date.now() - new Date(sala.timestamp_inicio_turno).getTime()) / 1000),
    total: sala.tempo_maximo_turno
  } : null;

  return {
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
  };
}
