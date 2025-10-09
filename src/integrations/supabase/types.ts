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
          id: number
          marketplace: string
          name: string
          whatsapp_host: string | null
          whatsapp_number: string | null
          whatsapp_token: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: number
          marketplace: string
          name: string
          whatsapp_host?: string | null
          whatsapp_number?: string | null
          whatsapp_token: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: number
          marketplace?: string
          name?: string
          whatsapp_host?: string | null
          whatsapp_number?: string | null
          whatsapp_token?: string
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
          name_complete: string | null
          phone: Json | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_candidate: number
          id_category: number
          id_event: number
          name: string
          name_complete?: string | null
          phone?: Json | null
        }
        Update: {
          created_at?: string
          id?: number
          id_candidate?: number
          id_category?: number
          id_event?: number
          name?: string
          name_complete?: string | null
          phone?: Json | null
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
          card_tax: number | null
          created_at: string
          end_vote: string
          highlight_first_place: boolean
          id: number
          id_account: number
          layout_color: string | null
          msg_saudacao: string | null
          name: string
          pix_tax: number | null
          start_vote: string
          vote_value: number
        }
        Insert: {
          active?: boolean
          card_tax?: number | null
          created_at?: string
          end_vote: string
          highlight_first_place?: boolean
          id?: number
          id_account: number
          layout_color?: string | null
          msg_saudacao?: string | null
          name: string
          pix_tax?: number | null
          start_vote: string
          vote_value: number
        }
        Update: {
          active?: boolean
          card_tax?: number | null
          created_at?: string
          end_vote?: string
          highlight_first_place?: boolean
          id?: number
          id_account?: number
          layout_color?: string | null
          msg_saudacao?: string | null
          name?: string
          pix_tax?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      send_ranking: {
        Row: {
          created_at: string
          hour: string
          id: number
          id_event: number
          message: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          hour: string
          id?: number
          id_event: number
          message?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          hour?: string
          id?: number
          id_event?: number
          message?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          candidates_sent: boolean | null
          categories_sent: boolean | null
          change_method_sent: number
          changed_to_card: boolean
          confirm_sent: boolean
          continue_pix: boolean
          created_at: string
          events_sent: boolean | null
          external_reference: string | null
          id: number
          id_candidate: number | null
          id_category: number | null
          id_event: number | null
          info_confirmed: boolean
          last_interation: string | null
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
          candidates_sent?: boolean | null
          categories_sent?: boolean | null
          change_method_sent?: number
          changed_to_card?: boolean
          confirm_sent?: boolean
          continue_pix?: boolean
          created_at?: string
          events_sent?: boolean | null
          external_reference?: string | null
          id?: number
          id_candidate?: number | null
          id_category?: number | null
          id_event?: number | null
          info_confirmed?: boolean
          last_interation?: string | null
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
          candidates_sent?: boolean | null
          categories_sent?: boolean | null
          change_method_sent?: number
          changed_to_card?: boolean
          confirm_sent?: boolean
          continue_pix?: boolean
          created_at?: string
          events_sent?: boolean | null
          external_reference?: string | null
          id?: number
          id_candidate?: number | null
          id_category?: number | null
          id_event?: number | null
          info_confirmed?: boolean
          last_interation?: string | null
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
        Relationships: [
          {
            foreignKeyName: "votes_id_event_fkey"
            columns: ["id_event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_id_event_id_category_fkey"
            columns: ["id_event", "id_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id_event", "id_category"]
          },
          {
            foreignKeyName: "votes_id_event_id_category_id_candidate_fkey"
            columns: ["id_event", "id_category", "id_candidate"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id_event", "id_category", "id_candidate"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      log_auth_attempt: {
        Args: {
          _attempt_type: string
          _email: string
          _ip_address: unknown
          _success: boolean
        }
        Returns: undefined
      }
      require_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
      track_user_session: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
