// types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          booking_code: string | null
          created_at: string
          updated_at: string
          customer_name: string
          customer_email: string
          customer_phone: string
          session_date: string
          start_time: string
          end_time: string
          duration_hours: number
          studio: string
          equipment: string[]
          notes: string | null
          amount_ghs: number
          currency: string

          hubtel_reference: string | null
          hubtel_status: string
          status: string
          customer_notified: boolean
          owner_notified: boolean
          processed_events: string[]
          is_paid: boolean
          admin_notes: string | null
          status_received: boolean | null
          status_received_at: string | null
          status_payment: boolean | null
          status_payment_at: string | null
          status_reviewed: boolean | null
          status_reviewed_at: string | null
          status_confirmed: boolean | null
          status_confirmed_at: string | null
        }
        Insert: {
          id?: string
          booking_code?: string | null
          created_at?: string
          updated_at?: string
          customer_name: string
          customer_email: string
          customer_phone: string
          session_date: string
          start_time: string
          end_time: string
          duration_hours: number
          studio?: string
          equipment?: string[]
          notes?: string | null
          amount_ghs: number
          currency?: string

          hubtel_reference?: string | null
          hubtel_status?: string
          status?: string
          customer_notified?: boolean
          owner_notified?: boolean
          processed_events?: string[]
          is_paid?: boolean
          admin_notes?: string | null
          status_received?: boolean | null
          status_received_at?: string | null
          status_payment?: boolean | null
          status_payment_at?: string | null
          status_reviewed?: boolean | null
          status_reviewed_at?: string | null
          status_confirmed?: boolean | null
          status_confirmed_at?: string | null
        }
        Update: {
          id?: string
          booking_code?: string | null
          created_at?: string
          updated_at?: string
          customer_name?: string
          customer_email?: string
          customer_phone?: string
          session_date?: string
          start_time?: string
          end_time?: string
          duration_hours?: number
          studio?: string
          equipment?: string[]
          notes?: string | null
          amount_ghs?: number
          currency?: string

          hubtel_reference?: string | null
          hubtel_status?: string
          status?: string
          customer_notified?: boolean
          owner_notified?: boolean
          processed_events?: string[]
          is_paid?: boolean
          admin_notes?: string | null
          status_received?: boolean | null
          status_received_at?: string | null
          status_payment?: boolean | null
          status_payment_at?: string | null
          status_reviewed?: boolean | null
          status_reviewed_at?: string | null
          status_confirmed?: boolean | null
          status_confirmed_at?: string | null
        }
      }
      booking_status_history: {
        Row: {
          id: string
          booking_id: string
          created_at: string
          status: string
          notes: string | null
          label: string | null
          is_admin_message: boolean
        }
        Insert: {
          id?: string
          booking_id: string
          created_at?: string
          status: string
          notes?: string | null
          label?: string | null
          is_admin_message?: boolean
        }
        Update: {
          id?: string
          booking_id?: string
          created_at?: string
          status?: string
          notes?: string | null
          label?: string | null
          is_admin_message?: boolean
        }
      }
      blocked_slots: {
        Row: {
          id: string
          date: string
          start_time: string
          end_time: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          start_time: string
          end_time: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          start_time?: string
          end_time?: string
          notes?: string | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          created_at: string
          name: string
          social_handle: string | null
          rating: number
          text: string
          approved: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          social_handle?: string | null
          rating: number
          text: string
          approved?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          social_handle?: string | null
          rating?: number
          text?: string
          approved?: boolean
        }
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          source: string
          event_id: string
          event_type: string
          payload: Json
          processed_at: string
        }
        Insert: {
          id?: string
          source: string
          event_id: string
          event_type: string
          payload: Json
          processed_at?: string
        }
        Update: {
          id?: string
          source?: string
          event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
