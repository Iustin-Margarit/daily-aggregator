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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author: string | null
          created_at: string
          id: string
          image_url: string | null
          published_at: string
          reading_minutes: number | null
          slug: string
          source_id: string
          summary: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          reading_minutes?: number | null
          slug: string
          source_id: string
          summary?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          reading_minutes?: number | null
          slug?: string
          source_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      hidden_articles: {
        Row: {
          article_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          articles_deleted: number | null
          articles_inserted: number | null
          duration_ms: number | null
          errors: Json
          finished_at: string | null
          id: string
          items_found: number | null
          sources_failed: number | null
          sources_succeeded: number | null
          sources_total: number | null
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          articles_deleted?: number | null
          articles_inserted?: number | null
          duration_ms?: number | null
          errors?: Json
          finished_at?: string | null
          id?: string
          items_found?: number | null
          sources_failed?: number | null
          sources_succeeded?: number | null
          sources_total?: number | null
          started_at?: string
          status?: string
          trigger: string
        }
        Update: {
          articles_deleted?: number | null
          articles_inserted?: number | null
          duration_ms?: number | null
          errors?: Json
          finished_at?: string | null
          id?: string
          items_found?: number | null
          sources_failed?: number | null
          sources_succeeded?: number | null
          sources_total?: number | null
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      muted_keywords: {
        Row: {
          created_at: string
          keyword: string
          user_id: string
        }
        Insert: {
          created_at?: string
          keyword: string
          user_id: string
        }
        Update: {
          created_at?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      muted_sources: {
        Row: {
          created_at: string
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          banner_color: string
          created_at: string
          font_size: string
          has_completed_onboarding: boolean
          id: string
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_color?: string
          banner_color?: string
          created_at?: string
          font_size?: string
          has_completed_onboarding?: boolean
          id: string
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_color?: string
          banner_color?: string
          created_at?: string
          font_size?: string
          has_completed_onboarding?: boolean
          id?: string
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      saved_articles: {
        Row: {
          article_id: string
          folder_id: string | null
          is_read: boolean
          notes: string | null
          saved_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          folder_id?: string | null
          is_read?: boolean
          notes?: string | null
          saved_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          folder_id?: string | null
          is_read?: boolean
          notes?: string | null
          saved_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_articles_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "saved_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          category_id: string
          consecutive_failures: number
          created_at: string
          description: string | null
          etag: string | null
          id: string
          is_enabled: boolean
          last_error: string | null
          last_fetched_at: string | null
          last_item_count: number | null
          last_modified: string | null
          last_success_at: string | null
          name: string
          rss_url: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category_id: string
          consecutive_failures?: number
          created_at?: string
          description?: string | null
          etag?: string | null
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_fetched_at?: string | null
          last_item_count?: number | null
          last_modified?: string | null
          last_success_at?: string | null
          name: string
          rss_url: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category_id?: string
          consecutive_failures?: number
          created_at?: string
          description?: string | null
          etag?: string | null
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_fetched_at?: string | null
          last_item_count?: number | null
          last_modified?: string | null
          last_success_at?: string | null
          name?: string
          rss_url?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferred_categories: {
        Row: {
          category_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferred_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_list_sources: {
        Args: never
        Returns: {
          article_count: number
          category_id: string
          category_name: string
          consecutive_failures: number
          description: string
          id: string
          is_enabled: boolean
          last_error: string
          last_fetched_at: string
          last_item_count: number
          last_success_at: string
          latest_article_at: string
          name: string
          rss_url: string
          website_url: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          has_completed_onboarding: boolean
          id: string
          last_sign_in_at: string
          role: string
          saved_count: number
          username: string
        }[]
      }
      cleanup_old_articles: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined }
      get_article: {
        Args: { p_slug_or_id: string }
        Returns: {
          author: string
          category_id: string
          category_name: string
          id: string
          image_url: string
          is_saved: boolean
          published_at: string
          reading_minutes: number
          slug: string
          source_id: string
          source_name: string
          source_website_url: string
          summary: string
          title: string
          url: string
        }[]
      }
      get_feed: {
        Args: {
          p_as_of?: string
          p_category_ids?: string[]
          p_limit?: number
          p_muted_source_ids?: string[]
          p_muted_words?: string[]
          p_offset?: number
          p_search?: string
          p_since?: string
          p_sort?: string
          p_source_ids?: string[]
        }
        Returns: {
          author: string
          category_id: string
          category_name: string
          id: string
          image_url: string
          is_saved: boolean
          published_at: string
          reading_minutes: number
          slug: string
          source_id: string
          source_name: string
          summary: string
          title: string
          total_count: number
          url: string
        }[]
      }
      get_related_articles: {
        Args: {
          p_article_id: string
          p_limit?: number
          p_muted_source_ids?: string[]
          p_muted_words?: string[]
        }
        Returns: {
          category_name: string
          id: string
          image_url: string
          published_at: string
          slug: string
          source_name: string
          summary: string
          title: string
        }[]
      }
      get_saved_articles: {
        Args: never
        Returns: {
          article_id: string
          category_id: string
          category_name: string
          folder_id: string
          image_url: string
          is_read: boolean
          notes: string
          published_at: string
          reading_minutes: number
          saved_at: string
          slug: string
          source_enabled: boolean
          source_id: string
          source_name: string
          summary: string
          title: string
          url: string
        }[]
      }
      ingest_articles: {
        Args: { p_articles: Json; p_source_id: string }
        Returns: {
          article_id: string
          article_url: string
          image_url: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_reserved_username: { Args: { p_username: string }; Returns: boolean }
      promote_to_admin: { Args: { p_email: string }; Returns: string }
      slugify: { Args: { p_text: string }; Returns: string }
      start_ingestion_run: {
        Args: { p_min_interval_minutes?: number; p_trigger: string }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
