import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Lobby {
  id: string;
  created_at: string;
  nome: string;
  criador_session: string;
  criador_nome: string;
  formato: string;
  status: string;
  max_blocos: number;
}

interface Bloco {
  id: string;
  created_at: string;
  lobby_id: string;
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
  telefone: string;
  nome: string;
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
  
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [lobbiesDisponiveis, setLobbiesDisponiveis] = useState<Lobby[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [blocoAtual, setBlocoAtual] = useState<Bloco | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Criar lobby
  const criarLobby = useCallback(async (nome: string, formato: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_lobbies')
        .insert({
          nome,
          criador_session: sessionId,
          criador_nome: nome,
          formato,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      
      setLobby(data);
      
      // Inscrever em realtime para este lobby
      inscreverLobby(data.id);
    } catch (err) {
      setError('Erro ao criar lobby');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Listar lobbies disponíveis
  const listarLobbies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_lobbies')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setLobbiesDisponiveis(data || []);
    } catch (err) {
      setError('Erro ao listar lobbies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Entrar em lobby
  const entrarLobby = useCallback(async (lobbyId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single();

      if (error) throw error;
      
      setLobby(data);
      
      // Carregar blocos do lobby
      carregarBlocos(lobbyId);
      
      // Inscrever em realtime para este lobby
      inscreverLobby(lobbyId);
    } catch (err) {
      setError('Erro ao entrar no lobby');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar blocos de um lobby
  const carregarBlocos = useCallback(async (lobbyId: string) => {
    try {
      const { data, error } = await supabase
        .from('botao_blocos')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setBlocos(data || []);
    } catch (err) {
      console.error('Erro ao carregar blocos:', err);
    }
  }, []);

  // Criar bloco dentro do lobby
  const criarBloco = useCallback(async (timeId: string, nome: string) => {
    if (!lobby) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_blocos')
        .insert({
          lobby_id: lobby.id,
          jogador1_session: sessionId,
          jogador1_nome: nome,
          jogador1_time: timeId,
          status: 'aguardando'
        })
        .select()
        .single();

      if (error) throw error;
      
      setBlocoAtual(data);
      inscreverBloco(data.id);
    } catch (err) {
      setError('Erro ao criar bloco');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lobby, sessionId]);

  // Entrar em bloco existente
  const entrarBloco = useCallback(async (blocoId: string, timeId: string, nome: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_blocos')
        .update({
          jogador2_session: sessionId,
          jogador2_nome: nome,
          jogador2_time: timeId,
          status: 'em_jogo',
          turno: 'jogador1',
          timestamp_inicio_turno: new Date().toISOString()
        })
        .eq('id', blocoId)
        .select()
        .single();

      if (error) throw error;
      
      setBlocoAtual(data);
      inscreverBloco(blocoId);
    } catch (err) {
      setError('Erro ao entrar no bloco');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Inscrever em realtime para um lobby
  const inscreverLobby = useCallback((lobbyId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'botao_blocos',
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          carregarBlocos(lobbyId);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [carregarBlocos]);

  // Inscrever em realtime para um bloco
  const inscreverBloco = useCallback((blocoId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`bloco-${blocoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'botao_blocos',
          filter: `id=eq.${blocoId}`
        },
        (payload) => {
          setBlocoAtual(payload.new as Bloco);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Inscrever em realtime para lista de lobbies
  const inscreverListaLobbies = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('lista-lobbies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'botao_lobbies'
        },
        () => {
          listarLobbies();
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [listarLobbies]);

  // Registrar jogada
  const registrarJogada = useCallback(async () => {
    if (!blocoAtual) return;
    
    await supabase.rpc('registrar_jogada_bloco', {
      p_bloco_id: blocoAtual.id
    });
  }, [blocoAtual]);

  // Registrar gol
  const registrarGol = useCallback(async (jogador: 'jogador1' | 'jogador2') => {
    if (!blocoAtual) return;
    
    await supabase.rpc('registrar_gol_bloco', {
      p_bloco_id: blocoAtual.id,
      p_jogador: jogador
    });
  }, [blocoAtual]);

  // Forçar troca de turno por timeout
  const forcarTrocaTurno = useCallback(async () => {
    if (!blocoAtual) return;
    
    await supabase.rpc('forcar_troca_turno_bloco', {
      p_bloco_id: blocoAtual.id
    });
  }, [blocoAtual]);

  // Finalizar bloco
  const finalizarBloco = useCallback(async (vencedor: 'jogador1' | 'jogador2' | 'empate') => {
    if (!blocoAtual) return;
    
    await supabase.rpc('finalizar_bloco', {
      p_bloco_id: blocoAtual.id,
      p_vencedor: vencedor
    });
  }, [blocoAtual]);

  // Sair do lobby/bloco
  const sairLobby = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setLobby(null);
    setBlocos([]);
    setBlocoAtual(null);
    setLobbiesDisponiveis([]);
  }, []);

  // Login
  const login = useCallback(async (telefone: string, nome: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('botao_usuarios')
        .upsert({
          telefone,
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
  const meuTurno = blocoAtual ? (
    (blocoAtual.jogador1_session === sessionId && blocoAtual.turno === 'jogador1') ||
    (blocoAtual.jogador2_session === sessionId && blocoAtual.turno === 'jogador2')
  ) : false;

  // Determinar meu time
  const meuTime = blocoAtual ? (
    blocoAtual.jogador1_session === sessionId ? blocoAtual.jogador1_time : blocoAtual.jogador2_time
  ) : undefined;

  // Determinar meus gols
  const meusGols = blocoAtual ? (
    blocoAtual.jogador1_session === sessionId ? blocoAtual.jogador1_gols : blocoAtual.jogador2_gols
  ) : 0;

  // Calcular tempo restante do turno
  const tempoRestanteTurno = blocoAtual ? {
    segundos: blocoAtual.tempo_maximo_turno - Math.floor((Date.now() - new Date(blocoAtual.timestamp_inicio_turno).getTime()) / 1000),
    total: blocoAtual.tempo_maximo_turno
  } : null;

  return {
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
  };
}
