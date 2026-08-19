export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      livros: {
        Row: {
          ativo: boolean;
          autor: string | null;
          categoria: string;
          created_at: string;
          descricao: string | null;
          destaque: boolean;
          id: string;
          imagem_url: string | null;
          link_afiliado: string;
          ordem: number;
          preco: string | null;
          titulo: string;
        };
        Insert: {
          ativo?: boolean;
          autor?: string | null;
          categoria?: string;
          created_at?: string;
          descricao?: string | null;
          destaque?: boolean;
          id?: string;
          imagem_url?: string | null;
          link_afiliado: string;
          ordem?: number;
          preco?: string | null;
          titulo: string;
        };
        Update: {
          ativo?: boolean;
          autor?: string | null;
          categoria?: string;
          created_at?: string;
          descricao?: string | null;
          destaque?: boolean;
          id?: string;
          imagem_url?: string | null;
          link_afiliado?: string;
          ordem?: number;
          preco?: string | null;
          titulo?: string;
        };
        Relationships: [];
      };
      botao_usuarios: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          nome: string;
          cores: string[];
          time_personalizado: string;
          abreviacao_time: string;
          numero_jogador: number;
          pontos_soberania: number;
          partidas_jogadas: number;
          partidas_vencidas: number;
          campeonatos_ganhos: number;
          gols_feitos: number;
          gols_sofridos: number;
          vitorias: number;
          derrotas: number;
          empates: number;
          progresso_caminpanha: Json;
          created_at: string;
          updated_at: string;
          tatica: string | null;
          botoes_nomes: string[] | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          nome: string;
          cores?: string[];
          time_personalizado?: string;
          abreviacao_time?: string;
          numero_jogador?: number;
          pontos_soberania?: number;
          partidas_jogadas?: number;
          partidas_vencidas?: number;
          campeonatos_ganhos?: number;
          gols_feitos?: number;
          gols_sofridos?: number;
          vitorias?: number;
          derrotas?: number;
          empates?: number;
          progresso_caminpanha?: Json;
          created_at?: string;
          updated_at?: string;
          tatica?: string | null;
          botoes_nomes?: string[] | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          nome?: string;
          cores?: string[];
          time_personalizado?: string;
          abreviacao_time?: string;
          numero_jogador?: number;
          pontos_soberania?: number;
          partidas_jogadas?: number;
          partidas_vencidas?: number;
          campeonatos_ganhos?: number;
          gols_feitos?: number;
          gols_sofridos?: number;
          vitorias?: number;
          derrotas?: number;
          empates?: number;
          progresso_caminpanha?: Json;
          updated_at?: string;
          tatica?: string | null;
          botoes_nomes?: string[] | null;
        };
        Relationships: [];
      };
      botao_times: {
        Row: {
          id: string;
          nome: string;
          abreviacao: string;
          cores: string[];
          pais: string;
          liga: string;
          forca: number | null;
          divisao: "serie-a" | "serie-b" | "serie-c" | null;
          is_personalizado: boolean;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          abreviacao: string;
          cores: string[];
          pais: string;
          liga: string;
          forca?: number | null;
          divisao?: "serie-a" | "serie-b" | "serie-c" | null;
          is_personalizado?: boolean;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          abreviacao?: string;
          cores?: string[];
          pais?: string;
          liga?: string;
          forca?: number | null;
          divisao?: "serie-a" | "serie-b" | "serie-c" | null;
          is_personalizado?: boolean;
          usuario_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      botao_lobbies: {
        Row: {
          id: string;
          created_at: string;
          nome: string;
          criador_session: string;
          criador_nome: string;
          formato: string;
          status: string;
          max_blocos: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          nome: string;
          criador_session: string;
          criador_nome: string;
          formato?: string;
          status?: string;
          max_blocos?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          nome?: string;
          criador_session?: string;
          criador_nome?: string;
          formato?: string;
          status?: string;
          max_blocos?: number;
        };
        Relationships: [];
      };
      botao_blocos: {
        Row: {
          id: string;
          created_at: string;
          lobby_id: string;
          jogador1_session: string;
          jogador1_nome: string;
          jogador1_time: string;
          jogador2_session: string | null;
          jogador2_nome: string | null;
          jogador2_time: string | null;
          status: string;
          turno: string;
          jogadas_restantes: number;
          timestamp_inicio_turno: string;
          tempo_maximo_turno: number;
          jogador1_gols: number;
          jogador2_gols: number;
          rodada: number;
          vencedor: string | null;
          finalizada_em: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          lobby_id: string;
          jogador1_session: string;
          jogador1_nome: string;
          jogador1_time: string;
          jogador2_session?: string | null;
          jogador2_nome?: string | null;
          jogador2_time?: string | null;
          status?: string;
          turno?: string;
          jogadas_restantes?: number;
          timestamp_inicio_turno?: string;
          tempo_maximo_turno?: number;
          jogador1_gols?: number;
          jogador2_gols?: number;
          rodada?: number;
          vencedor?: string | null;
          finalizada_em?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          lobby_id?: string;
          jogador1_session?: string;
          jogador1_nome?: string;
          jogador1_time?: string;
          jogador2_session?: string | null;
          jogador2_nome?: string | null;
          jogador2_time?: string | null;
          status?: string;
          turno?: string;
          jogadas_restantes?: number;
          timestamp_inicio_turno?: string;
          tempo_maximo_turno?: number;
          jogador1_gols?: number;
          jogador2_gols?: number;
          rodada?: number;
          vencedor?: string | null;
          finalizada_em?: string | null;
        };
        Relationships: [];
      };
      mesas_futebol: {
        Row: {
          id: string;
          mesa_id: string;
          jogador_1_id: string;
          jogador_2_id: string | null;
          time_j1: string;
          time_j2: string | null;
          placar_j1: number;
          placar_j2: number;
          turno_atual_id: string | null;
          status: string;
          duracao_segundos: number;
          iniciado_em: string | null;
          tempo_restante_segundos: number;
          seq_jogada: number;
          estado_fisico: Json | null;
          vencedor_id: string | null;
          motivo_finalizacao: string | null;
          jogador_1_online: boolean;
          jogador_2_online: boolean;
          ultimo_heartbeat_j1: string | null;
          ultimo_heartbeat_j2: string | null;
          criado_em: string;
          atualizado_em: string;
          modalidade: string;
          campeonato_id: number | null;
        };
        Insert: {
          id?: string;
          mesa_id: string;
          jogador_1_id: string;
          jogador_2_id?: string | null;
          time_j1?: string;
          time_j2?: string | null;
          placar_j1?: number;
          placar_j2?: number;
          turno_atual_id?: string | null;
          status?: string;
          duracao_segundos?: number;
          iniciado_em?: string | null;
          tempo_restante_segundos?: number;
          seq_jogada?: number;
          estado_fisico?: Json | null;
          vencedor_id?: string | null;
          motivo_finalizacao?: string | null;
          jogador_1_online?: boolean;
          jogador_2_online?: boolean;
          ultimo_heartbeat_j1?: string | null;
          ultimo_heartbeat_j2?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          modalidade?: string;
          campeonato_id?: number | null;
        };
        Update: {
          id?: string;
          mesa_id?: string;
          jogador_1_id?: string;
          jogador_2_id?: string | null;
          time_j1?: string;
          time_j2?: string | null;
          placar_j1?: number;
          placar_j2?: number;
          turno_atual_id?: string | null;
          status?: string;
          duracao_segundos?: number;
          iniciado_em?: string | null;
          tempo_restante_segundos?: number;
          seq_jogada?: number;
          estado_fisico?: Json | null;
          vencedor_id?: string | null;
          motivo_finalizacao?: string | null;
          jogador_1_online?: boolean;
          jogador_2_online?: boolean;
          ultimo_heartbeat_j1?: string | null;
          ultimo_heartbeat_j2?: string | null;
          atualizado_em?: string;
          modalidade?: string;
          campeonato_id?: number | null;
        };
        Relationships: [];
      };
      botao_campeonatos_online: {
        Row: {
          id: number;
          codigo: string;
          nome: string;
          criador_id: string;
          status: string;
          max_jogadores: number;
          fase: number;
          participantes: Json;
          confrontos: Json;
          rodada_atual: number;
          vencedor_id: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: number;
          codigo: string;
          nome?: string;
          criador_id: string;
          status?: string;
          max_jogadores?: number;
          fase?: number;
          participantes?: Json;
          confrontos?: Json;
          rodada_atual?: number;
          vencedor_id?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: number;
          codigo?: string;
          nome?: string;
          criador_id?: string;
          status?: string;
          max_jogadores?: number;
          fase?: number;
          participantes?: Json;
          confrontos?: Json;
          rodada_atual?: number;
          vencedor_id?: string | null;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      botao_frases_ia: {
        Row: {
          id: number;
          prompt_type: string;
          categoria: string | null;
          template_text: string;
          variaveis: Json | null;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          prompt_type: string;
          categoria?: string | null;
          template_text: string;
          variaveis?: Json | null;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          prompt_type?: string;
          categoria?: string | null;
          template_text?: string;
          variaveis?: Json | null;
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      mesas_trilha: {
        Row: {
          id: string;
          mesa_id: string;
          jogador_1_id: string;
          jogador_2_id: string | null;
          status: string;
          turno_atual: string | null;
          tabuleiro: Json;
          pecas_capturadas: Json;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          mesa_id: string;
          jogador_1_id: string;
          jogador_2_id?: string | null;
          status?: string;
          turno_atual?: string | null;
          tabuleiro: Json;
          pecas_capturadas?: Json;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          mesa_id?: string;
          jogador_1_id?: string;
          jogador_2_id?: string | null;
          status?: string;
          turno_atual?: string | null;
          tabuleiro?: Json;
          pecas_capturadas?: Json;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      user_wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          frozen: boolean;
          frozen_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          frozen?: boolean;
          frozen_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          frozen?: boolean;
          frozen_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bank_ledger: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: string;
          amount: number;
          balance_after: number;
          description: string | null;
          source_module: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: string;
          amount: number;
          balance_after: number;
          description?: string | null;
          source_module: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: string;
          amount?: number;
          balance_after?: number;
          description?: string | null;
          source_module?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      bank_reserves: {
        Row: {
          id: string;
          reserve_type: string;
          allocated_amount: number;
          max_cap: number;
          yield_rate: number;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reserve_type: string;
          allocated_amount?: number;
          max_cap: number;
          yield_rate?: number;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reserve_type?: string;
          allocated_amount?: number;
          max_cap?: number;
          yield_rate?: number;
          status?: string;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      anti_cheat_log: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          action_type: string;
          module: string;
          time_spent_seconds: number;
          screens_viewed: number;
          is_suspicious: boolean;
          suspicion_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          action_type: string;
          module: string;
          time_spent_seconds: number;
          screens_viewed?: number;
          is_suspicious?: boolean;
          suspicion_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          action_type?: string;
          module?: string;
          time_spent_seconds?: number;
          screens_viewed?: number;
          is_suspicious?: boolean;
          suspicion_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sov_market_products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_sov: number;
          category: string;
          stock: number;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_sov: number;
          category: string;
          stock?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price_sov?: number;
          category?: string;
          stock?: number;
          is_active?: boolean;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      sov_market_transactions: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          amount_sov: number;
          status: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          amount_sov: number;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          amount_sov?: number;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      cidadela_chat_messages: {
        Row: {
          id: string;
          sender_id: string | null;
          sender_nome: string;
          tipo: string;
          texto: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id?: string | null;
          sender_nome?: string;
          tipo?: string;
          texto: string;
          created_at?: string;
        };
        Update: {
          sender_id?: string | null;
          sender_nome?: string;
          tipo?: string;
          texto?: string;
        };
        Relationships: [];
      };
      cidadela_itens: {
        Row: {
          slug: string;
          nome: string;
          descricao: string | null;
          tipo: string;
          raridade: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          slug: string;
          nome: string;
          descricao?: string | null;
          tipo: string;
          raridade?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          nome?: string;
          descricao?: string | null;
          tipo?: string;
          raridade?: string;
          ativo?: boolean;
        };
        Relationships: [];
      };
      cidadela_inventory: {
        Row: {
          id: string;
          user_id: string;
          item_slug: string;
          quantidade: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_slug: string;
          quantidade?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quantidade?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      cidadela_market_listings: {
        Row: {
          id: string;
          seller_id: string;
          seller_nome: string;
          item_slug: string;
          quantidade: number;
          preco_sov: number;
          status: string;
          comprador_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          seller_nome?: string;
          item_slug: string;
          quantidade: number;
          preco_sov: number;
          status?: string;
          comprador_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          comprador_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cidadela_missoes_diarias: {
        Row: {
          id: string;
          user_id: string;
          data: string;
          missao_key: string;
          titulo: string;
          descricao: string;
          alvo: number;
          progresso: number;
          recompensa_sov: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data?: string;
          missao_key: string;
          titulo: string;
          descricao: string;
          alvo: number;
          progresso?: number;
          recompensa_sov: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          progresso?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      criar_campeonato_online: {
        Args: { p_nome?: string; p_max?: number };
        Returns: Json;
      };
      entrar_campeonato_online: {
        Args: { p_codigo: string };
        Returns: Json;
      };
      sair_campeonato_online: {
        Args: { p_codigo: string };
        Returns: Json;
      };
      iniciar_campeonato_online: {
        Args: { p_codigo: string };
        Returns: Json;
      };
      vincular_mesa_campeonato: {
        Args: { p_campeonato_id: number; p_rodada: number; p_mesa_id: string };
        Returns: Json;
      };
      abrir_mesa_campeonato: {
        Args: { p_campeonato_id: number; p_rodada: number };
        Returns: string;
      };
      debug_confronto_campeonato: {
        Args: { p_campeonato_id: number; p_rodada: number };
        Returns: Json;
      };
      registrar_resultado_campeonato: {
        Args: { p_campeonato_id: number; p_mesa_id: string; p_gols_j1: number; p_gols_j2: number };
        Returns: Json;
      };
      criar_mesa_futebol: {
        Args: { p_time: string };
        Returns: Json;
      };
      entrar_mesa_futebol: {
        Args: { p_mesa_id: string; p_time: string };
        Returns: Json;
      };
      registrar_jogada_mesa: {
        Args: { p_mesa_id: string; p_estado_fisico?: Json | null; p_trocar_turno?: boolean };
        Returns: Json;
      };
      registrar_gol_mesa: {
        Args: { p_mesa_id: string; p_jogador_id?: string | null };
        Returns: Json;
      };
      abandonar_partida_mesa: {
        Args: { p_mesa_id: string };
        Returns: Json;
      };
      registrar_heartbeat_mesa: {
        Args: { p_mesa_id: string };
        Returns: Json;
      };
      tempo_restante_mesa: {
        Args: { p_mesa_id: string };
        Returns: number;
      };
      iniciar_partida_mesa: {
        Args: { p_mesa_id: string };
        Returns: Json;
      };
      registrar_jogada_bloco: {
        Args: { p_bloco_id: string };
        Returns: Json;
      };
      registrar_gol_bloco: {
        Args: { p_bloco_id: string; p_jogador: string };
        Returns: Json;
      };
      forcar_troca_turno_bloco: {
        Args: { p_bloco_id: string };
        Returns: Json;
      };
      finalizar_bloco: {
        Args: { p_bloco_id: string; p_vencedor: string };
        Returns: Json;
      };
      limpar_salas_antigas: {
        Args: Record<never, never>;
        Returns: Json;
      };
      atualizar_perfil_clube: {
        Args: {
          p_uid: string;
          p_nome?: string | null;
          p_time?: string | null;
          p_abreviacao?: string | null;
          p_cores?: string[] | null;
          p_tatica?: string | null;
          p_botoes?: string[] | null;
        };
        Returns: {
          id: string;
          user_id: string;
          email: string;
          nome: string;
          cores: string[];
          time_personalizado: string;
          abreviacao_time: string;
          numero_jogador: number;
          pontos_soberania: number;
          partidas_jogadas: number;
          partidas_vencidas: number;
          progresso_caminpanha: Json;
          created_at: string;
          updated_at: string;
          campeonatos_ganhos: number;
          gols_feitos: number;
          gols_sofridos: number;
          vitorias: number;
          derrotas: number;
          empates: number;
          tatica: string | null;
          botoes_nomes: string[] | null;
        };
      };
      reiniciar_mesa: {
        Args: { p_mesa_id: string };
        Returns: Json;
      };
      listar_mesas_trilha_disponiveis: {
        Args: { p_dificuldade?: string | null };
        Returns: Json;
      };
      criar_mesa_trilha: {
        Args: { p_dificuldade: string };
        Returns: string;
      };
      entrar_mesa_trilha: {
        Args: { p_mesa_id: string };
        Returns: string;
      };
      registrar_heartbeat_mesa_trilha: {
        Args: { p_mesa_id: string };
        Returns: Json;
      };
      registrar_jogada_trilha: {
        Args: {
          p_mesa_id: string;
          p_from: number | null;
          p_to: number;
          p_remove?: number | null;
          p_board: Json;
          p_hand_p1: Json;
          p_hand_p2: Json;
          p_phase: string;
          p_pending_capture: boolean;
        };
        Returns: Json;
      };
      abandonar_partida_trilha: {
        Args: { p_mesa_id: string };
        Returns: Json;
      };
      create_or_update_wallet: {
        Args: { p_user_id: string };
        Returns: string;
      };
      record_transaction: {
        Args: {
          p_user_id: string;
          p_transaction_type: string;
          p_amount: number;
          p_description: string | null;
          p_source_module: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      update_reserve_allocation: {
        Args: { p_reserve_type: string; p_amount: number; p_operation: string };
        Returns: boolean;
      };
      adjust_yield_rate: {
        Args: Record<never, never>;
        Returns: Json;
      };
      cidadela_gerar_missoes_diarias: {
        Args: Record<never, never>;
        Returns: Array<{
          id: string;
          missao_key: string;
          titulo: string;
          descricao: string;
          alvo: number;
          progresso: number;
          recompensa_sov: number;
          status: string;
        }>;
      };
      cidadela_progresso_missao: {
        Args: { p_chave: string; p_delta?: number };
        Returns: string | null;
      };
      cidadela_resgatar_missao: {
        Args: { p_missao_id: string };
        Returns: number;
      };
      cidadela_criar_oferta: {
        Args: { p_item_slug: string; p_quantidade: number; p_preco_sov: number };
        Returns: string;
      };
      cidadela_comprar_oferta: {
        Args: { p_listing_id: string };
        Returns: number;
      };
      registrar_temporada_carreira: {
        Args: {
          p_user_id: string;
          p_temporada: number;
          p_dificuldade: string;
          p_divisao: string;
          p_estado?: Json;
        };
        Returns: undefined;
      };
      registrar_partida_carreira: {
        Args: { p_user_id: string; p_partida: Json };
        Returns: undefined;
      };
      finalizar_temporada_carreira: {
        Args: {
          p_user_id: string;
          p_temporada: number;
          p_tabelas: Json;
          p_estado?: Json;
        };
        Returns: undefined;
      };
      registrar_evento_carreira: {
        Args: { p_user_id: string; p_evento: Json };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
