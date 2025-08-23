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
      accounts: {
        Row: {
          access_token: string
          created_at: string
          evolution_instance: string | null
          id: number
          marketplace: string
          name: string
        }
        Insert: {
          access_token: string
          created_at?: string
          evolution_instance?: string | null
          id?: number
          marketplace: string
          name: string
        }
        Update: {
          access_token?: string
          created_at?: string
          evolution_instance?: string | null
          id?: number
          marketplace?: string
          name?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          created_at: string
          id: number
          id_candidate: number
          id_category: number
          id_event: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_candidate: number
          id_category: number
          id_event: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          id_candidate?: number
          id_category?: number
          id_event?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_category_fk"
            columns: ["id_event", "id_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id_event", "id_category"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: number
          id_category: number
          id_event: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_category: number
          id_event: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          id_category?: number
          id_event?: number
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_id_event_fkey"
            columns: ["id_event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          active: boolean
          created_at: string
          end_vote: string
          id: number
          id_account: number
          name: string
          start_vote: string
          vote_value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_vote: string
          id?: number
          id_account: number
          name: string
          start_vote: string
          vote_value: number
        }
        Update: {
          active?: boolean
          created_at?: string
          end_vote?: string
          id?: number
          id_account?: number
          name?: string
          start_vote?: string
          vote_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_id_payment_account_fkey"
            columns: ["id_account"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          candidates_sent: boolean
          categories_sent: boolean
          change_method_sent: boolean
          changed_to_card: boolean
          confirm_sent: boolean
          continue_pix: boolean
          created_at: string
          events_sent: boolean
          external_reference: string | null
          id: number
          id_candidate: number | null
          id_category: number | null
          id_event: number | null
          info_confirmed: boolean
          payment_id: string | null
          payment_payload: Json | null
          payment_status: string
          payment_status_detail: string | null
          phone: string
          pix_qr: string | null
          pix_sent_time: string | null
          votes: number | null
          votes_sent: boolean
        }
        Insert: {
          candidates_sent?: boolean
          categories_sent?: boolean
          change_method_sent?: boolean
          changed_to_card?: boolean
          confirm_sent?: boolean
          continue_pix?: boolean
          created_at?: string
          events_sent?: boolean
          external_reference?: string | null
          id?: number
          id_candidate?: number | null
          id_category?: number | null
          id_event?: number | null
          info_confirmed?: boolean
          payment_id?: string | null
          payment_payload?: Json | null
          payment_status?: string
          payment_status_detail?: string | null
          phone: string
          pix_qr?: string | null
          pix_sent_time?: string | null
          votes?: number | null
          votes_sent?: boolean
        }
        Update: {
          candidates_sent?: boolean
          categories_sent?: boolean
          change_method_sent?: boolean
          changed_to_card?: boolean
          confirm_sent?: boolean
          continue_pix?: boolean
          created_at?: string
          events_sent?: boolean
          external_reference?: string | null
          id?: number
          id_candidate?: number | null
          id_category?: number | null
          id_event?: number | null
          info_confirmed?: boolean
          payment_id?: string | null
          payment_payload?: Json | null
          payment_status?: string
          payment_status_detail?: string | null
          phone?: string
          pix_qr?: string | null
          pix_sent_time?: string | null
          votes?: number | null
          votes_sent?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
