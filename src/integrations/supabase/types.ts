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
      banned_users: {
        Row: {
          banned_at: string
          id: string
          reason: string | null
          user_hash: string
          username: string | null
        }
        Insert: {
          banned_at?: string
          id?: string
          reason?: string | null
          user_hash: string
          username?: string | null
        }
        Update: {
          banned_at?: string
          id?: string
          reason?: string | null
          user_hash?: string
          username?: string | null
        }
        Relationships: []
      }
      college_requests: {
        Row: {
          city: string
          created_at: string
          description: string | null
          established: number | null
          id: string
          name: string
          requester_hash: string
          reviewed_at: string | null
          state: string
          status: string
          type: Database["public"]["Enums"]["college_type"]
        }
        Insert: {
          city: string
          created_at?: string
          description?: string | null
          established?: number | null
          id?: string
          name: string
          requester_hash: string
          reviewed_at?: string | null
          state: string
          status?: string
          type: Database["public"]["Enums"]["college_type"]
        }
        Update: {
          city?: string
          created_at?: string
          description?: string | null
          established?: number | null
          id?: string
          name?: string
          requester_hash?: string
          reviewed_at?: string | null
          state?: string
          status?: string
          type?: Database["public"]["Enums"]["college_type"]
        }
        Relationships: []
      }
      colleges: {
        Row: {
          city: string
          created_at: string
          description: string | null
          established: number | null
          id: string
          incident_count: number | null
          latitude: number | null
          longitude: number | null
          name: string
          state: string
          total_rating: number | null
          total_reviews: number | null
          type: Database["public"]["Enums"]["college_type"]
        }
        Insert: {
          city: string
          created_at?: string
          description?: string | null
          established?: number | null
          id?: string
          incident_count?: number | null
          latitude?: number | null
          longitude?: number | null
          name: string
          state: string
          total_rating?: number | null
          total_reviews?: number | null
          type: Database["public"]["Enums"]["college_type"]
        }
        Update: {
          city?: string
          created_at?: string
          description?: string | null
          established?: number | null
          id?: string
          incident_count?: number | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          state?: string
          total_rating?: number | null
          total_reviews?: number | null
          type?: Database["public"]["Enums"]["college_type"]
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          anonymous_user_hash: string
          college_id: string
          content: string
          created_at: string
          id: string
          incident_id: string | null
          is_incident_signal: boolean | null
          username: string
        }
        Insert: {
          anonymous_user_hash: string
          college_id: string
          content: string
          created_at?: string
          id?: string
          incident_id?: string | null
          is_incident_signal?: boolean | null
          username: string
        }
        Update: {
          anonymous_user_hash?: string
          college_id?: string
          content?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          is_incident_signal?: boolean | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          recipient_username: string
          sender_hash: string
          sender_username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          recipient_username: string
          sender_hash: string
          sender_username: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipient_username?: string
          sender_hash?: string
          sender_username?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          file_url: string
          id: string
          incident_id: string | null
          is_verified: boolean | null
          post_id: string | null
          type: string
          upvotes: number | null
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          file_url: string
          id?: string
          incident_id?: string | null
          is_verified?: boolean | null
          post_id?: string | null
          type: string
          upvotes?: number | null
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          file_url?: string
          id?: string
          incident_id?: string | null
          is_verified?: boolean | null
          post_id?: string | null
          type?: string
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      global_messages: {
        Row: {
          anonymous_user_hash: string
          content: string
          created_at: string
          id: string
          username: string
        }
        Insert: {
          anonymous_user_hash: string
          content: string
          created_at?: string
          id?: string
          username: string
        }
        Update: {
          anonymous_user_hash?: string
          content?: string
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          admin_notes: string | null
          affected_count: number | null
          ai_summary: string | null
          ai_verdict: string | null
          category: string
          college_id: string
          description: string | null
          first_seen: string
          id: string
          last_updated: string
          proof_count: number | null
          severity: number | null
          status: Database["public"]["Enums"]["incident_status"] | null
          title: string
          total_amount: number | null
          trend: Database["public"]["Enums"]["incident_trend"] | null
        }
        Insert: {
          admin_notes?: string | null
          affected_count?: number | null
          ai_summary?: string | null
          ai_verdict?: string | null
          category: string
          college_id: string
          description?: string | null
          first_seen?: string
          id?: string
          last_updated?: string
          proof_count?: number | null
          severity?: number | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          title: string
          total_amount?: number | null
          trend?: Database["public"]["Enums"]["incident_trend"] | null
        }
        Update: {
          admin_notes?: string | null
          affected_count?: number | null
          ai_summary?: string | null
          ai_verdict?: string | null
          category?: string
          college_id?: string
          description?: string | null
          first_seen?: string
          id?: string
          last_updated?: string
          proof_count?: number | null
          severity?: number | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          title?: string
          total_amount?: number | null
          trend?: Database["public"]["Enums"]["incident_trend"] | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_analyzed: boolean | null
          anonymous_user_hash: string
          category: string | null
          college_id: string
          content: string
          created_at: string
          downvotes: number | null
          id: string
          incident_id: string | null
          is_incident: boolean | null
          upvotes: number | null
          username: string
        }
        Insert: {
          ai_analyzed?: boolean | null
          anonymous_user_hash: string
          category?: string | null
          college_id: string
          content: string
          created_at?: string
          downvotes?: number | null
          id?: string
          incident_id?: string | null
          is_incident?: boolean | null
          upvotes?: number | null
          username: string
        }
        Update: {
          ai_analyzed?: boolean | null
          anonymous_user_hash?: string
          category?: string | null
          college_id?: string
          content?: string
          created_at?: string
          downvotes?: number | null
          id?: string
          incident_id?: string | null
          is_incident?: boolean | null
          upvotes?: number | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          anonymous_user_hash: string
          campus_life_rating: number | null
          college_id: string
          created_at: string
          faculty_rating: number | null
          id: string
          infrastructure_rating: number | null
          overall: number | null
          placement_rating: number | null
          value_rating: number | null
        }
        Insert: {
          anonymous_user_hash: string
          campus_life_rating?: number | null
          college_id: string
          created_at?: string
          faculty_rating?: number | null
          id?: string
          infrastructure_rating?: number | null
          overall?: number | null
          placement_rating?: number | null
          value_rating?: number | null
        }
        Update: {
          anonymous_user_hash?: string
          campus_life_rating?: number | null
          college_id?: string
          created_at?: string
          faculty_rating?: number | null
          id?: string
          infrastructure_rating?: number | null
          overall?: number | null
          placement_rating?: number | null
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      college_type:
        | "Engineering"
        | "Medical"
        | "Arts"
        | "Commerce"
        | "University"
        | "Research"
      incident_status: "active" | "investigating" | "resolved" | "dismissed"
      incident_trend: "rising" | "stable" | "declining"
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
      college_type: [
        "Engineering",
        "Medical",
        "Arts",
        "Commerce",
        "University",
        "Research",
      ],
      incident_status: ["active", "investigating", "resolved", "dismissed"],
      incident_trend: ["rising", "stable", "declining"],
    },
  },
} as const
