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
      documents: {
        Row: {
          id: string
          name: string
          content: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          content: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          content?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          content: string
          page_number: number
          section_title: string | null
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          page_number: number
          section_title?: string | null
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          page_number?: number
          section_title?: string | null
          embedding?: number[]
          created_at?: string
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