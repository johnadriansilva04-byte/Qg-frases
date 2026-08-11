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
          id: string
          jogadas: Json
          jogador1_id: string
          jogador2_id: string
          lobby_id: string
          numero: number
          placar_j1: number
          placar_j2: number
          status: string
          time1: string
          time2: string
          turno: string
        }
        Insert: {
          created_at?: string
          id?: string
          jogadas?: Json
          jogador1_id: string
          jogador2_id: string
          lobby_id: string
          numero?: number
          placar_j1?: number
          placar_j2?: number
          status?: string
          time1?: string
          time2?: string
          turno?: string
        }
        Update: {
          created_at?: string
          id?: string
          jogadas?: Json
          jogador1_id?: string
          jogador2_id?: string
          lobby_id?: string
          numero?: number
          placar_j1?: number
          placar_j2?: number
          status?: string
          time1?: string
          time2?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "botao_blocos_jogador1_id_fkey"
            columns: ["jogador1_id"]
            isOneToOne: false
            referencedRelation: "botao_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "botao_blocos_jogador2_id_fkey"
            columns: ["jogador2_id"]
            isOneToOne: false
            referencedRelation: "botao_perfis"
            referencedColumns: ["id"]
          },
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
          adversario_id: string | null
          created_at: string
          criador_id: string
          formato: string
          id: string
          max_jogadores: number
          nome: string
          status: string
        }
        Insert: {
          adversario_id?: string | null
          created_at?: string
          criador_id: string
          formato?: string
          id?: string
          max_jogadores?: number
          nome: string
          status?: string
        }
        Update: {
          adversario_id?: string | null
          created_at?: string
          criador_id?: string
          formato?: string
          id?: string
          max_jogadores?: number
          nome?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "botao_lobbies_adversario_id_fkey"
            columns: ["adversario_id"]
            isOneToOne: false
            referencedRelation: "botao_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "botao_lobbies_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "botao_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      botao_perfis: {
        Row: {
          abreviacao_time: string
          cores: string[]
          created_at: string
          id: string
          nome: string
          numero_jogador: number
          partidas_jogadas: number
          partidas_vencidas: number
          pontos_soberania: number
          progresso_campanha: Json
          telefone: string
          time_personalizado: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abreviacao_time?: string
          cores?: string[]
          created_at?: string
          id?: string
          nome: string
          numero_jogador?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          pontos_soberania?: number
          progresso_campanha?: Json
          telefone: string
          time_personalizado?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abreviacao_time?: string
          cores?: string[]
          created_at?: string
          id?: string
          nome?: string
          numero_jogador?: number
          partidas_jogadas?: number
          partidas_vencidas?: number
          pontos_soberania?: number
          progresso_campanha?: Json
          telefone?: string
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
      botao_meu_perfil_id: { Args: never; Returns: string }
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
