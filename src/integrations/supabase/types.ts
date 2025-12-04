export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          source: string | null
          custom_prompt: string | null
          personalization_strategy: string | null
          instantly_campaign_id: string | null
          lead_count: number
          completed_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          source?: string | null
          custom_prompt?: string | null
          personalization_strategy?: string | null
          instantly_campaign_id?: string | null
          lead_count?: number
          completed_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          source?: string | null
          custom_prompt?: string | null
          personalization_strategy?: string | null
          instantly_campaign_id?: string | null
          lead_count?: number
          completed_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      campaign_runs: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          status: string
          source: string | null
          lead_count: number | null
          processed_count: number
          success_count: number
          error_count: number
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          status?: string
          source?: string | null
          lead_count?: number | null
          processed_count?: number
          success_count?: number
          error_count?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          status?: string
          source?: string | null
          lead_count?: number | null
          processed_count?: number
          success_count?: number
          error_count?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_runs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      campaign_leads: {
        Row: {
          id: string
          campaign_id: string
          lead_data: Json
          csv_cache: Json | null
          status: string | null
          processed_count: number
          total_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          lead_data?: Json
          csv_cache?: Json | null
          status?: string | null
          processed_count?: number
          total_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          lead_data?: Json
          csv_cache?: Json | null
          status?: string | null
          processed_count?: number
          total_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      user_metrics: {
        Row: {
          id: string
          user_id: string
          total_campaigns: number
          total_leads_processed: number
          total_leads_enriched: number
          hours_saved: number
          money_saved: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_campaigns?: number
          total_leads_processed?: number
          total_leads_enriched?: number
          hours_saved?: number
          money_saved?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_campaigns?: number
          total_leads_processed?: number
          total_leads_enriched?: number
          hours_saved?: number
          money_saved?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_metrics_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_campaign_metrics: {
        Args: {
          p_campaign_id: string
        }
        Returns: void
      }
      update_user_metrics: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
