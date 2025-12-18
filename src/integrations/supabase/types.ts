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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          artist_id: string
          community_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          reactions: Json | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          community_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          reactions?: Json | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          community_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          reactions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_usernames: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          updated_at: string
          username: string
          verified: boolean
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          updated_at?: string
          username: string
          verified?: boolean
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
          verified?: boolean
        }
        Relationships: []
      }
      communities: {
        Row: {
          artist_id: string
          blend_active: boolean | null
          blend_full_at: string | null
          blend_link: string | null
          created_at: string
          description: string | null
          echo_clip_end: number | null
          echo_clip_start: number | null
          echo_track_url: string | null
          id: string
          name: string
          subscription_price: number
          theme_json: Json | null
          updated_at: string
          wallpaper_url: string | null
          welcome_audio_url: string | null
        }
        Insert: {
          artist_id: string
          blend_active?: boolean | null
          blend_full_at?: string | null
          blend_link?: string | null
          created_at?: string
          description?: string | null
          echo_clip_end?: number | null
          echo_clip_start?: number | null
          echo_track_url?: string | null
          id?: string
          name: string
          subscription_price: number
          theme_json?: Json | null
          updated_at?: string
          wallpaper_url?: string | null
          welcome_audio_url?: string | null
        }
        Update: {
          artist_id?: string
          blend_active?: boolean | null
          blend_full_at?: string | null
          blend_link?: string | null
          created_at?: string
          description?: string | null
          echo_clip_end?: number | null
          echo_clip_start?: number | null
          echo_track_url?: string | null
          id?: string
          name?: string
          subscription_price?: number
          theme_json?: Json | null
          updated_at?: string
          wallpaper_url?: string | null
          welcome_audio_url?: string | null
        }
        Relationships: []
      }
      merch_drops: {
        Row: {
          artist_id: string
          buy_link: string | null
          community_id: string
          created_at: string
          id: string
          image_url: string
          message: string | null
          reactions: Json | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          buy_link?: string | null
          community_id: string
          created_at?: string
          id?: string
          image_url: string
          message?: string | null
          reactions?: Json | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          buy_link?: string | null
          community_id?: string
          created_at?: string
          id?: string
          image_url?: string
          message?: string | null
          reactions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      music_drops: {
        Row: {
          artist_id: string
          community_id: string
          created_at: string
          file_url: string
          id: string
          reactions: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          community_id: string
          created_at?: string
          file_url: string
          id?: string
          reactions?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          community_id?: string
          created_at?: string
          file_url?: string
          id?: string
          reactions?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_drops_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          community_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          community_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          parent_post_id: string | null
          pinned: boolean | null
          reactions: Json | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          parent_post_id?: string | null
          pinned?: boolean | null
          reactions?: Json | null
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          parent_post_id?: string | null
          pinned?: boolean | null
          reactions?: Json | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          first_login: boolean
          full_name: string | null
          id: string
          profile_pic_url: string | null
          updated_at: string
          username: string
          verified: boolean
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          first_login?: boolean
          full_name?: string | null
          id: string
          profile_pic_url?: string | null
          updated_at?: string
          username: string
          verified?: boolean
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          first_login?: boolean
          full_name?: string | null
          id?: string
          profile_pic_url?: string | null
          updated_at?: string
          username?: string
          verified?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          artist_id: string
          community_id: string
          created_at: string
          id: string
          last_echo_generated: string | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          community_id: string
          created_at?: string
          id?: string
          last_echo_generated?: string | null
          status: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          community_id?: string
          created_at?: string
          id?: string
          last_echo_generated?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_drops: {
        Row: {
          artist_id: string
          community_id: string
          created_at: string
          ends_at: string
          id: string
          image_url: string | null
          message: string | null
          reactions: Json | null
          ticket_link: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          community_id: string
          created_at?: string
          ends_at: string
          id?: string
          image_url?: string | null
          message?: string | null
          reactions?: Json | null
          ticket_link?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          community_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          reactions?: Json | null
          ticket_link?: string | null
          updated_at?: string
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
      verifications: {
        Row: {
          artist_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          email?: string
          full_name: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "fan" | "artist" | "admin"
      user_role: "fan" | "artist"
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
      app_role: ["fan", "artist", "admin"],
      user_role: ["fan", "artist"],
    },
  },
} as const
