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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          actual_amount: number | null
          budget_amount: number | null
          budget_type: Database["public"]["Enums"]["budget_type"]
          category: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          department: string | null
          forecast_amount: number | null
          id: string
          notes: string | null
          org_id: string
          updated_at: string
          year: number
        }
        Insert: {
          actual_amount?: number | null
          budget_amount?: number | null
          budget_type: Database["public"]["Enums"]["budget_type"]
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          department?: string | null
          forecast_amount?: number | null
          id?: string
          notes?: string | null
          org_id: string
          updated_at?: string
          year: number
        }
        Update: {
          actual_amount?: number | null
          budget_amount?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"]
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          department?: string | null
          forecast_amount?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_user_id: string | null
          id: string
          name: string
          org_id: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          name: string
          org_id: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          name?: string
          org_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_user_id_fkey"
            columns: ["head_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number | null
          dashboard_url: string | null
          data_source: string | null
          department_id: string | null
          description: string | null
          goal_id: string
          id: string
          org_id: string
          owner_id: string | null
          owner_name: string | null
          score: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["initiative_status"]
          target_date: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          dashboard_url?: string | null
          data_source?: string | null
          department_id?: string | null
          description?: string | null
          goal_id: string
          id?: string
          org_id: string
          owner_id?: string | null
          owner_name?: string | null
          score?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          target_date?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          dashboard_url?: string | null
          data_source?: string | null
          department_id?: string | null
          description?: string | null
          goal_id?: string
          id?: string
          org_id?: string
          owner_id?: string | null
          owner_name?: string | null
          score?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          target_date?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiatives_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "performance_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiatives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_editors: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          item_id: string
          item_type: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          item_id: string
          item_type: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          item_id?: string
          item_type?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_editors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_attachments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          kpi_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          kpi_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          kpi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_attachments_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          archived_at: string | null
          cadence: string | null
          created_at: string
          created_by: string | null
          current_value: number | null
          department_id: string | null
          description: string | null
          id: string
          last_updated_at: string | null
          name: string
          next_update_due_at: string | null
          org_id: string
          owner_id: string | null
          owner_name: string | null
          parent_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["kpi_status"] | null
          target_value: number | null
          unit: string | null
          updated_at: string
          weight: number
          year: number
        }
        Insert: {
          archived_at?: string | null
          cadence?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          department_id?: string | null
          description?: string | null
          id?: string
          last_updated_at?: string | null
          name: string
          next_update_due_at?: string | null
          org_id: string
          owner_id?: string | null
          owner_name?: string | null
          parent_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["kpi_status"] | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          weight?: number
          year?: number
        }
        Update: {
          archived_at?: string | null
          cadence?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          department_id?: string | null
          description?: string | null
          id?: string
          last_updated_at?: string | null
          name?: string
          next_update_due_at?: string | null
          org_id?: string
          owner_id?: string | null
          owner_name?: string | null
          parent_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["kpi_status"] | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          weight?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpis_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          initiative_id: string
          notes: string | null
          recorded_at: string
          score: number | null
          source: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          initiative_id: string
          notes?: string | null
          recorded_at: string
          score?: number | null
          source?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          initiative_id?: string
          notes?: string | null
          recorded_at?: string
          score?: number | null
          source?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_snapshots_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          org_id: string
          payload: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          org_id: string
          payload?: Json | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          org_id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_goals: {
        Row: {
          actual_end_date: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          org_id: string
          overall_score: number | null
          owner_id: string | null
          owner_name: string | null
          parent_id: string | null
          perspective: Database["public"]["Enums"]["bsc_perspective"] | null
          start_date: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          org_id: string
          overall_score?: number | null
          owner_id?: string | null
          owner_name?: string | null
          parent_id?: string | null
          perspective?: Database["public"]["Enums"]["bsc_perspective"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          org_id?: string
          overall_score?: number | null
          owner_id?: string | null
          owner_name?: string | null
          parent_id?: string | null
          perspective?: Database["public"]["Enums"]["bsc_perspective"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "performance_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          is_approved: boolean
          org_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          email: string
          full_name?: string | null
          id: string
          is_approved?: boolean
          org_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          org_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checkins: {
        Row: {
          blockers: string | null
          created_at: string
          id: string
          plan_next_week: string | null
          progress_percent: number | null
          status: Database["public"]["Enums"]["task_status"] | null
          summary_this_week: string | null
          task_id: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          id?: string
          plan_next_week?: string | null
          progress_percent?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          summary_this_week?: string | null
          task_id: string
          user_id: string
          week_start_date: string
        }
        Update: {
          blockers?: string | null
          created_at?: string
          id?: string
          plan_next_week?: string | null
          progress_percent?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          summary_this_week?: string | null
          task_id?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checkins_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_initiatives: {
        Row: {
          created_at: string
          id: string
          initiative_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiative_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initiative_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_initiatives_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_initiatives_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_kpis: {
        Row: {
          created_at: string
          id: string
          kpi_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_kpis_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_kpis_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          assigner_id: string | null
          assigner_name: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          external_url: string | null
          id: string
          last_checkin_at: string | null
          org_id: string
          owner_id: string | null
          owner_name: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          progress_percent: number | null
          requires_exec_approval: boolean | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          assigner_id?: string | null
          assigner_name?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          external_url?: string | null
          id?: string
          last_checkin_at?: string | null
          org_id: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          progress_percent?: number | null
          requires_exec_approval?: boolean | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          assigner_id?: string | null
          assigner_name?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          external_url?: string | null
          id?: string
          last_checkin_at?: string | null
          org_id?: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          progress_percent?: number | null
          requires_exec_approval?: boolean | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_department: {
        Args: { _dept_id: string; _user_id: string }
        Returns: boolean
      }
      get_department_subtree: { Args: { _dept_id: string }; Returns: string[] }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_visible_departments: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_ceo: { Args: { _user_id: string }; Returns: boolean }
      is_cos_pmo_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_executive: { Args: { _user_id: string }; Returns: boolean }
      is_item_editor: {
        Args: { _item_id: string; _item_type: string; _user_id: string }
        Returns: boolean
      }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "executive"
        | "cos_pmo"
        | "owner"
        | "viewer"
        | "admin"
        | "ceo"
        | "editor"
      bsc_perspective: "financial" | "customer" | "process" | "learning"
      budget_type: "opex" | "capex"
      goal_status: "not_started" | "active" | "completed" | "on_hold"
      initiative_status: "not_started" | "in_progress" | "completed" | "blocked"
      kpi_status: "on_track" | "at_risk" | "off_track" | "na"
      notification_type:
        | "checkin_reminder"
        | "deadline_approaching"
        | "task_blocked"
        | "approval_pending"
        | "task_approved"
        | "task_reopened"
        | "escalation"
      task_priority: "high" | "medium" | "low"
      task_status:
        | "not_started"
        | "in_progress"
        | "blocked"
        | "done"
        | "executive_review"
        | "closed"
        | "cancelled"
      task_type: "kpi_action" | "todo"
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
      app_role: [
        "executive",
        "cos_pmo",
        "owner",
        "viewer",
        "admin",
        "ceo",
        "editor",
      ],
      bsc_perspective: ["financial", "customer", "process", "learning"],
      budget_type: ["opex", "capex"],
      goal_status: ["not_started", "active", "completed", "on_hold"],
      initiative_status: ["not_started", "in_progress", "completed", "blocked"],
      kpi_status: ["on_track", "at_risk", "off_track", "na"],
      notification_type: [
        "checkin_reminder",
        "deadline_approaching",
        "task_blocked",
        "approval_pending",
        "task_approved",
        "task_reopened",
        "escalation",
      ],
      task_priority: ["high", "medium", "low"],
      task_status: [
        "not_started",
        "in_progress",
        "blocked",
        "done",
        "executive_review",
        "closed",
        "cancelled",
      ],
      task_type: ["kpi_action", "todo"],
    },
  },
} as const
