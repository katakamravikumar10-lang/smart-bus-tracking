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
      academic_years: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          locked: boolean
          name: string
          promotions_enabled: boolean
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          locked?: boolean
          name: string
          promotions_enabled?: boolean
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          locked?: boolean
          name?: string
          promotions_enabled?: boolean
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          academic_year_id: string | null
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          is_emergency: boolean
          route_id: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Insert: {
          academic_year_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          is_emergency?: boolean
          route_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Update: {
          academic_year_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          is_emergency?: boolean
          route_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bus_locations: {
        Row: {
          bus_id: string
          driver_id: string | null
          heading: number | null
          lat: number
          lng: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          bus_id: string
          driver_id?: string | null
          heading?: number | null
          lat: number
          lng: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          bus_id?: string
          driver_id?: string | null
          heading?: number | null
          lat?: number
          lng?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_locations_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: true
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          active: boolean
          bus_number: string
          capacity: number
          created_at: string
          id: string
          is_demo: boolean
          notes: string | null
          route_id: string | null
          status: Database["public"]["Enums"]["bus_status"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          bus_number: string
          capacity?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          route_id?: string | null
          status?: Database["public"]["Enums"]["bus_status"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          bus_number?: string
          capacity?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          route_id?: string | null
          status?: Database["public"]["Enums"]["bus_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_assignments: {
        Row: {
          academic_year_id: string | null
          active: boolean
          bus_id: string
          created_at: string
          driver_id: string
          id: string
        }
        Insert: {
          academic_year_id?: string | null
          active?: boolean
          bus_id: string
          created_at?: string
          driver_id: string
          id?: string
        }
        Update: {
          academic_year_id?: string | null
          active?: boolean
          bus_id?: string
          created_at?: string
          driver_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_assignments: {
        Row: {
          academic_year_id: string
          active: boolean
          boarding_stop: string | null
          bus_id: string | null
          created_at: string
          department: string | null
          faculty_id: string
          id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          active?: boolean
          boarding_stop?: string | null
          bus_id?: string | null
          created_at?: string
          department?: string | null
          faculty_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          active?: boolean
          boarding_stop?: string | null
          bus_id?: string | null
          created_at?: string
          department?: string | null
          faculty_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_assignments_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          bus_id: string | null
          created_at: string
          id: string
          message: string
          resolved: boolean
          subject: string
          user_id: string
        }
        Insert: {
          bus_id?: string | null
          created_at?: string
          id?: string
          message: string
          resolved?: boolean
          subject: string
          user_id: string
        }
        Update: {
          bus_id?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved?: boolean
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          bus_id: string | null
          created_at: string
          id: string
          is_emergency: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          bus_id?: string | null
          created_at?: string
          id?: string
          is_emergency?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          bus_id?: string | null
          created_at?: string
          id?: string
          is_emergency?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_year_id: string | null
          avatar_url: string | null
          branch: string | null
          created_at: string
          department: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          is_demo: boolean
          license_no: string | null
          phone: string | null
          roll_no: string | null
          section: string | null
          student_status: string
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          academic_year_id?: string | null
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id: string
          is_demo?: boolean
          license_no?: string | null
          phone?: string | null
          roll_no?: string | null
          section?: string | null
          student_status?: string
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          academic_year_id?: string | null
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_demo?: boolean
          license_no?: string | null
          phone?: string | null
          roll_no?: string | null
          section?: string | null
          student_status?: string
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          stops: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          stops?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          stops?: Json
          updated_at?: string
        }
        Relationships: []
      }
      student_assignments: {
        Row: {
          academic_year_id: string | null
          active: boolean
          boarding_stop: string | null
          bus_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          academic_year_id?: string | null
          active?: boolean
          boarding_stop?: string | null
          bus_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          academic_year_id?: string | null
          active?: boolean
          boarding_stop?: string | null
          bus_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_imports: {
        Row: {
          academic_year_id: string | null
          created_at: string
          error_details: Json
          errors: number
          id: string
          imported_by: string | null
          inserted: number
          skipped: number
          total: number
          updated: number
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          error_details?: Json
          errors?: number
          id?: string
          imported_by?: string | null
          inserted?: number
          skipped?: number
          total?: number
          updated?: number
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          error_details?: Json
          errors?: number
          id?: string
          imported_by?: string | null
          inserted?: number
          skipped?: number
          total?: number
          updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_imports_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      student_promotions: {
        Row: {
          action: string
          created_at: string
          from_academic_year_id: string | null
          from_year_of_study: number | null
          id: string
          performed_by: string | null
          student_id: string
          to_academic_year_id: string | null
          to_year_of_study: number | null
        }
        Insert: {
          action: string
          created_at?: string
          from_academic_year_id?: string | null
          from_year_of_study?: number | null
          id?: string
          performed_by?: string | null
          student_id: string
          to_academic_year_id?: string | null
          to_year_of_study?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          from_academic_year_id?: string | null
          from_year_of_study?: number | null
          id?: string
          performed_by?: string | null
          student_id?: string
          to_academic_year_id?: string | null
          to_year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_promotions_from_academic_year_id_fkey"
            columns: ["from_academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotions_to_academic_year_id_fkey"
            columns: ["to_academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          academic_year_id: string | null
          bus_id: string
          driver_id: string
          ended_at: string | null
          id: string
          is_demo: boolean
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["trip_status"]
        }
        Insert: {
          academic_year_id?: string | null
          bus_id: string
          driver_id: string
          ended_at?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["trip_status"]
        }
        Update: {
          academic_year_id?: string | null
          bus_id?: string
          driver_id?: string
          ended_at?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["trip_status"]
        }
        Relationships: [
          {
            foreignKeyName: "trips_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_academic_year_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_locked: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "faculty" | "driver" | "admin"
      bus_status: "running" | "delayed" | "maintenance" | "completed" | "idle"
      trip_status: "active" | "completed" | "cancelled"
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
      app_role: ["student", "faculty", "driver", "admin"],
      bus_status: ["running", "delayed", "maintenance", "completed", "idle"],
      trip_status: ["active", "completed", "cancelled"],
    },
  },
} as const
