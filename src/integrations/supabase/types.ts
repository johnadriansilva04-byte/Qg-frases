export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      livros: {
        Row: {
          ativo: boolean
          autor: string | null
          categoria: string
          created_at: string
          descricao: string | null
          destaque: boolean
          id: string
          imagem_url: string | null
          link_afiliado: string
          ordem: number
          preco: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          autor?: string | null
          categoria?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem_url?: string | null
          link_afiliado: string
          ordem?: number
          preco?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          autor?: string | null
          categoria?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem_url?: string | null
          link_afiliado?: string
          ordem?: number
          preco?: string | null
          titulo?: string
        }
        Relationships: []
      }
      botao_usuarios: {
        Row: {
          id: string
          user_id: string
          email: string
          nome: string
          cores: string[]
          time_personalizado: string
          abreviacao_time: string
          numero_jogador: number
          pontos_soberania: number
          partidas_jogadas: number
          partidas_vencidas: number
          campeonatos_ganhos: number
          gols_feitos: number
          gols_sofridos: number
          vitorias: number
          derrotas: number
          empates: number
          progresso_caminpanha: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          nome: string
          cores?: string[]
          time_personalizado?: string
          abreviacao_time?: string
          numero_jogador?: number
          pontos_soberania?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          campeonatos_ganhos?: number
          gols_feitos?: number
          gols_sofridos?: number
          vitorias?: number
          derrotas?: number
          empates?: number
          progresso_caminpanha?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          nome?: string
          cores?: string[]
          time_personalizado?: string
          abreviacao_time?: string
          numero_jogador?: number
          pontos_soberania?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          campeonatos_ganhos?: number
          gols_feitos?: number
          gols_sofridos?: number
          vitorias?: number
          derrotas?: number
          empates?: number
          progresso_caminpanha?: Json
          updated_at?: string
        }
          cores?: string[]
          time_personalizado?: string
          abreviacao_time?: string
          numero_jogador?: number
          pontos_soberania?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          progresso_caminpanha?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      botao_times: {
        Row: {
          id: string
          nome: string
          abreviacao: string
          cores: string[]
          pais: string
          liga: string
          is_personalizado: boolean
          usuario_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          abreviacao: string
          cores: string[]
          pais: string
          liga: string
          is_personalizado?: boolean
          usuario_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          abreviacao?: string
          cores?: string[]
          pais?: string
          liga?: string
          is_personalizado?: boolean
          usuario_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      botao_lobbies: {
        Row: {
          id: string
          created_at: string
          nome: string
          criador_session: string
          criador_nome: string
          formato: string
          status: string
          max_blocos: number
        }
        Insert: {
          id?: string
          created_at?: string
          nome: string
          criador_session: string
          criador_nome: string
          formato?: string
          status?: string
          max_blocos?: number
        }
        Update: {
          id?: string
          created_at?: string
          nome?: string
          criador_session?: string
          criador_nome?: string
          formato?: string
          status?: string
          max_blocos?: number
        }
        Relationships: []
      }
      botao_blocos: {
        Row: {
          id: string
          created_at: string
          lobby_id: string
          jogador1_session: string
          jogador1_nome: string
          jogador1_time: string
          jogador2_session: string | null
          jogador2_nome: string | null
          jogador2_time: string | null
          status: string
          turno: string
          jogadas_restantes: number
          timestamp_inicio_turno: string
          tempo_maximo_turno: number
          jogador1_gols: number
          jogador2_gols: number
          rodada: number
          vencedor: string | null
          finalizada_em: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          lobby_id: string
          jogador1_session: string
          jogador1_nome: string
          jogador1_time: string
          jogador2_session?: string | null
          jogador2_nome?: string | null
          jogador2_time?: string | null
          status?: string
          turno?: string
          jogadas_restantes?: number
          timestamp_inicio_turno?: string
          tempo_maximo_turno?: number
          jogador1_gols?: number
          jogador2_gols?: number
          rodada?: number
          vencedor?: string | null
          finalizada_em?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          lobby_id?: string
          jogador1_session?: string
          jogador1_nome?: string
          jogador1_time?: string
          jogador2_session?: string | null
          jogador2_nome?: string | null
          jogador2_time?: string | null
          status?: string
          turno?: string
          jogadas_restantes?: number
          timestamp_inicio_turno?: string
          tempo_maximo_turno?: number
          jogador1_gols?: number
          jogador2_gols?: number
          rodada?: number
          vencedor?: string | null
          finalizada_em?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
