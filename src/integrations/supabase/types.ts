export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      academias: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      preguntas: {
        Row: {
          academia_id: string
          created_at: string
          id: string
          opcion_a: string
          opcion_b: string
          opcion_c: string | null
          opcion_d: string | null
          parte: string | null
          pregunta_texto: string
          solucion_letra: string
          tema_id: string
        }
        Insert: {
          academia_id: string
          created_at?: string
          id?: string
          opcion_a: string
          opcion_b: string
          opcion_c?: string | null
          opcion_d?: string | null
          parte?: string | null
          pregunta_texto: string
          solucion_letra: string
          tema_id: string
        }
        Update: {
          academia_id?: string
          created_at?: string
          id?: string
          opcion_a?: string
          opcion_b?: string
          opcion_c?: string | null
          opcion_d?: string | null
          parte?: string | null
          pregunta_texto?: string
          solucion_letra?: string
          tema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preguntas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      preguntas_falladas: {
        Row: {
          created_at: string
          id: string
          pregunta_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pregunta_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pregunta_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_falladas_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          puntos: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          puntos?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          puntos?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      temas: {
        Row: {
          academia_id: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          academia_id: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          academia_id?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "temas_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          academia_id: string
          tema_id: string
          mode: string
          total_questions: number
          correct_answers: number
          incorrect_answers: number
          score_percentage: number | null
          time_started: string
          time_completed: string | null
          duration_seconds: number | null
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          academia_id: string
          tema_id: string
          mode: string
          total_questions?: number
          correct_answers?: number
          incorrect_answers?: number
          score_percentage?: number | null
          time_started?: string
          time_completed?: string | null
          duration_seconds?: number | null
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          academia_id?: string
          tema_id?: string
          mode?: string
          total_questions?: number
          correct_answers?: number
          incorrect_answers?: number
          score_percentage?: number | null
          time_started?: string
          time_completed?: string | null
          duration_seconds?: number | null
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          }
        ]
      }
      user_answers: {
        Row: {
          id: string
          session_id: string
          user_id: string
          pregunta_id: string
          selected_answer: string
          correct_answer: string
          is_correct: boolean | null
          time_spent_seconds: number | null
          answered_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          pregunta_id: string
          selected_answer: string
          correct_answer: string
          is_correct?: boolean | null
          time_spent_seconds?: number | null
          answered_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          pregunta_id?: string
          selected_answer?: string
          correct_answer?: string
          is_correct?: boolean | null
          time_spent_seconds?: number | null
          answered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: string | null
          notifications_enabled: boolean | null
          sound_enabled: boolean | null
          auto_advance: boolean | null
          preferred_academia_id: string | null
          preferred_tema_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string | null
          notifications_enabled?: boolean | null
          sound_enabled?: boolean | null
          auto_advance?: boolean | null
          preferred_academia_id?: string | null
          preferred_tema_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string | null
          notifications_enabled?: boolean | null
          sound_enabled?: boolean | null
          auto_advance?: boolean | null
          preferred_academia_id?: string | null
          preferred_tema_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_academia_fkey"
            columns: ["preferred_academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_tema_fkey"
            columns: ["preferred_tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_random_preguntas: {
        Args: { p_academia_id: string; p_tema_id: string; p_limit?: number }
        Returns: {
          academia_id: string
          created_at: string
          id: string
          opcion_a: string
          opcion_b: string
          opcion_c: string | null
          opcion_d: string | null
          parte: string | null
          pregunta_texto: string
          solucion_letra: string
          tema_id: string
        }[]
      }
      start_quiz_session: {
        Args: { p_academia_id: string; p_tema_id: string; p_mode: string }
        Returns: string
      }
      record_answer: {
        Args: { 
          p_session_id: string; 
          p_pregunta_id: string; 
          p_selected_answer: string; 
          p_time_spent_seconds: number 
        }
        Returns: boolean
      }
      complete_quiz_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: Json
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
