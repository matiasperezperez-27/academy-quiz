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
          created_at: string
          id: string
          puntos: number | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          puntos?: number | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          puntos?: number | null
          role?: string | null
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
      user_answers: {
        Row: {
          answered_at: string
          correct_answer: string
          id: string
          is_correct: boolean | null
          pregunta_id: string
          selected_answer: string
          session_id: string
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          correct_answer: string
          id?: string
          is_correct?: boolean | null
          pregunta_id: string
          selected_answer: string
          session_id: string
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string
          correct_answer?: string
          id?: string
          is_correct?: boolean | null
          pregunta_id?: string
          selected_answer?: string
          session_id?: string
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_advance: boolean | null
          created_at: string
          id: string
          notifications_enabled: boolean | null
          preferred_academia_id: string | null
          preferred_tema_id: string | null
          sound_enabled: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_advance?: boolean | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          preferred_academia_id?: string | null
          preferred_tema_id?: string | null
          sound_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_advance?: boolean | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          preferred_academia_id?: string | null
          preferred_tema_id?: string | null
          sound_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          },
        ]
      }
      user_pregunta_status: {
        Row: {
          created_at: string
          id: string
          pregunta_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pregunta_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pregunta_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pregunta_status_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          academia_id: string
          correct_answers: number
          created_at: string
          duration_seconds: number | null
          id: string
          incorrect_answers: number
          is_completed: boolean
          mode: string
          score_percentage: number | null
          tema_id: string
          time_completed: string | null
          time_started: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          academia_id: string
          correct_answers?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          incorrect_answers?: number
          is_completed?: boolean
          mode: string
          score_percentage?: number | null
          tema_id: string
          time_completed?: string | null
          time_started?: string
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          academia_id?: string
          correct_answers?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          incorrect_answers?: number
          is_completed?: boolean
          mode?: string
          score_percentage?: number | null
          tema_id?: string
          time_completed?: string | null
          time_started?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { action_type: string; limit_per_hour?: number; user_id: string }
        Returns: boolean
      }
      complete_quiz_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      fix_user_stats: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users_last_week: number
          total_questions_answered: number
          total_sessions: number
          total_users: number
        }[]
      }
      get_random_preguntas: {
        Args: { p_academia_id: string; p_limit?: number; p_tema_id: string }
        Returns: {
          academia_id: string
          id: string
          opcion_a: string
          opcion_b: string
          opcion_c: string
          opcion_d: string
          parte: string
          pregunta_texto: string
          solucion_letra: string
          tema_id: string
        }[]
      }
      get_smart_preguntas: {
        Args: {
          p_academia_id: string
          p_days_threshold?: number
          p_include_failed?: boolean
          p_limit?: number
          p_tema_id: string
          p_user_id: string
        }
        Returns: {
          academia_id: string
          created_at: string
          days_since_correct: number
          id: string
          opcion_a: string
          opcion_b: string
          opcion_c: string
          opcion_d: string
          parte: string
          pregunta_texto: string
          priority_level: number
          solucion_letra: string
          tema_id: string
          times_answered: number
        }[]
      }
      get_topic_analysis: {
        Args: { p_user_id: string }
        Returns: {
          academia_id: string
          academia_nombre: string
          nivel_dominio: string
          porcentaje_acierto: number
          preguntas_falladas_ids: string[]
          tema_id: string
          tema_nombre: string
          total_correctas: number
          total_incorrectas: number
          total_respondidas: number
          ultima_respuesta: string
        }[]
      }
      get_topic_analysis_summary: {
        Args: { p_user_id: string }
        Returns: {
          promedio_general: number
          temas_dominados: number
          temas_necesitan_practica: number
          total_preguntas_falladas: number
          total_preguntas_respondidas: number
          total_temas_evaluados: number
        }[]
      }
      get_user_progress_stats: {
        Args: { p_academia_id?: string; p_tema_id?: string; p_user_id: string }
        Returns: {
          answered_questions: number
          completion_percentage: number
          correct_answers: number
          failed_answers: number
          remaining_questions: number
          total_questions: number
        }[]
      }
      get_user_rankings: {
        Args: { limit_count?: number }
        Returns: {
          accuracy: number
          email: string
          id: string
          puntos: number
          total_sessions: number
          username: string
        }[]
      }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_users_list: {
        Args: { limit_count?: number }
        Returns: {
          email: string
          last_activity: string
          nombre: string
          puntos: number
          role: string
          total_questions_answered: number
          user_id: string
        }[]
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      record_answer: {
        Args: {
          p_pregunta_id: string
          p_selected_answer: string
          p_session_id: string
          p_time_spent_seconds: number
        }
        Returns: boolean
      }
      refresh_user_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_user_progress: {
        Args: { p_tema_id?: string; p_user_id: string }
        Returns: undefined
      }
      start_quiz_session: {
        Args: {
          p_academia_id: string
          p_mode: string
          p_tema_id: string
          p_user_id: string
        }
        Returns: string
      }
      test_session_creation: {
        Args: Record<PropertyKey, never>
        Returns: {
          result: string
          step: string
        }[]
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