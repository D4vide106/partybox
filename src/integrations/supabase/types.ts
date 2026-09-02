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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          avatar: string
          created_at: string
          id: string
          nickname: string
          player_id: string
          room_id: string
          text: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          id?: string
          nickname: string
          player_id: string
          room_id: string
          text: string
        }
        Update: {
          avatar?: string
          created_at?: string
          id?: string
          nickname?: string
          player_id?: string
          room_id?: string
          text?: string
        }
        Relationships: []
      }
      game_votes: {
        Row: {
          created_at: string
          game_type: string
          id: string
          player_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          player_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          player_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      monopoly_games: {
        Row: {
          id: string
          room_id: string
          round_id: string
          state: Json
          turn_player_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          round_id: string
          state?: Json
          turn_player_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          round_id?: string
          state?: Json
          turn_player_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      player_votes: {
        Row: {
          created_at: string
          id: string
          room_id: string
          target_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          target_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          target_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_votes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_emoji: string
          client_id: string
          id: string
          is_connected: boolean
          is_host: boolean
          joined_at: string
          kicked: boolean
          last_seen_at: string
          left_at: string | null
          nickname: string
          room_id: string
          score: number
        }
        Insert: {
          avatar_emoji?: string
          client_id: string
          id?: string
          is_connected?: boolean
          is_host?: boolean
          joined_at?: string
          kicked?: boolean
          last_seen_at?: string
          left_at?: string | null
          nickname: string
          room_id: string
          score?: number
        }
        Update: {
          avatar_emoji?: string
          client_id?: string
          id?: string
          is_connected?: boolean
          is_host?: boolean
          joined_at?: string
          kicked?: boolean
          last_seen_at?: string
          left_at?: string | null
          nickname?: string
          room_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          current_round: number
          disconnect_timeout_sec: number
          game_sequence: string[]
          host_client_id: string
          id: string
          settings: Json
          status: string
          updated_at: string
          used_pool: Json
        }
        Insert: {
          code: string
          created_at?: string
          current_round?: number
          disconnect_timeout_sec?: number
          game_sequence?: string[]
          host_client_id: string
          id?: string
          settings?: Json
          status?: string
          updated_at?: string
          used_pool?: Json
        }
        Update: {
          code?: string
          created_at?: string
          current_round?: number
          disconnect_timeout_sec?: number
          game_sequence?: string[]
          host_client_id?: string
          id?: string
          settings?: Json
          status?: string
          updated_at?: string
          used_pool?: Json
        }
        Relationships: []
      }
      rounds: {
        Row: {
          config: Json
          ends_at: string | null
          game_type: string
          id: string
          room_id: string
          round_number: number
          started_at: string
          status: string
        }
        Insert: {
          config?: Json
          ends_at?: string | null
          game_type: string
          id?: string
          room_id: string
          round_number: number
          started_at?: string
          status?: string
        }
        Update: {
          config?: Json
          ends_at?: string | null
          game_type?: string
          id?: string
          room_id?: string
          round_number?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          player_id: string
          points: number
          round_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          player_id: string
          points?: number
          round_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          player_id?: string
          points?: number
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_server_time: { Args: never; Returns: string }
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
