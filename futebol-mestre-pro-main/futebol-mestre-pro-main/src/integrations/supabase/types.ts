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
      botao_blocos: {
        Row: {
          created_at: string
          finalizada_em: string | null
          id: string
          jogadas_restantes: number
          jogador1_gols: number
          jogador1_nome: string
          jogador1_session: string
          jogador1_time: string
          jogador2_gols: number
          jogador2_nome: string | null
          jogador2_session: string | null
          jogador2_time: string | null
          lobby_id: string
          rodada: number
          status: string
          tempo_maximo_turno: number
          timestamp_inicio_turno: string
          turno: string
          vencedor: string | null
        }
        Insert: {
          created_at?: string
          finalizada_em?: string | null
          id?: string
          jogadas_restantes?: number
          jogador1_gols?: number
          jogador1_nome: string
          jogador1_session: string
          jogador1_time: string
          jogador2_gols?: number
          jogador2_nome?: string | null
          jogador2_session?: string | null
          jogador2_time?: string | null
          lobby_id: string
          rodada?: number
          status?: string
          tempo_maximo_turno?: number
          timestamp_inicio_turno?: string
          turno?: string
          vencedor?: string | null
        }
        Update: {
          created_at?: string
          finalizada_em?: string | null
          id?: string
          jogadas_restantes?: number
          jogador1_gols?: number
          jogador1_nome?: string
          jogador1_session?: string
          jogador1_time?: string
          jogador2_gols?: number
          jogador2_nome?: string | null
          jogador2_session?: string | null
          jogador2_time?: string | null
          lobby_id?: string
          rodada?: number
          status?: string
          tempo_maximo_turno?: number
          timestamp_inicio_turno?: string
          turno?: string
          vencedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "botao_blocos_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "botao_lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      botao_lobbies: {
        Row: {
          created_at: string
          criador_nome: string
          criador_session: string
          formato: string
          id: string
          max_blocos: number
          nome: string
          status: string
        }
        Insert: {
          created_at?: string
          criador_nome: string
          criador_session: string
          formato?: string
          id?: string
          max_blocos?: number
          nome: string
          status?: string
        }
        Update: {
          created_at?: string
          criador_nome?: string
          criador_session?: string
          formato?: string
          id?: string
          max_blocos?: number
          nome?: string
          status?: string
        }
        Relationships: []
      }
      botao_times: {
        Row: {
          abreviacao: string
          cores: string[]
          created_at: string
          id: string
          is_personalizado: boolean
          liga: string
          nome: string
          pais: string
          usuario_id: string | null
        }
        Insert: {
          abreviacao: string
          cores: string[]
          created_at?: string
          id: string
          is_personalizado?: boolean
          liga: string
          nome: string
          pais: string
          usuario_id?: string | null
        }
        Update: {
          abreviacao?: string
          cores?: string[]
          created_at?: string
          id?: string
          is_personalizado?: boolean
          liga?: string
          nome?: string
          pais?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "botao_times_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "botao_usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      botao_usuarios: {
        Row: {
          abreviacao_time: string
          cores: string[]
          created_at: string
          email: string
          id: string
          nome: string
          numero_jogador: number
          partidas_jogadas: number
          partidas_vencidas: number
          pontos_soberania: number
          progresso_caminpanha: Json
          time_personalizado: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abreviacao_time?: string
          cores?: string[]
          created_at?: string
          email: string
          id?: string
          nome: string
          numero_jogador?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          pontos_soberania?: number
          progresso_caminpanha?: Json
          time_personalizado?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abreviacao_time?: string
          cores?: string[]
          created_at?: string
          email?: string
          id?: string
          nome?: string
          numero_jogador?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          pontos_soberania?: number
          progresso_caminpanha?: Json
          time_personalizado?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alternar_turno_bloco: { Args: { p_bloco_id: string }; Returns: undefined }
      finalizar_bloco: {
        Args: { p_bloco_id: string; p_vencedor: string }
        Returns: undefined
      }
      forcar_troca_turno_bloco: {
        Args: { p_bloco_id: string }
        Returns: undefined
      }
      registrar_gol_bloco: {
        Args: { p_bloco_id: string; p_jogador: string }
        Returns: undefined
      }
      registrar_jogada_bloco: {
        Args: { p_bloco_id: string }
        Returns: undefined
      }
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
