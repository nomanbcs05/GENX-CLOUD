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
      products: {
        Row: {
          id: string
          name: string
          sku: string
          price: number
          cost: number
          stock: number
          category: string
          image: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sku: string
          price: number
          cost: number
          stock?: number
          category: string
          image?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          price?: number
          cost?: number
          stock?: number
          category?: string
          image?: string | null
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          loyalty_points: number
          total_spent: number
          visit_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          loyalty_points?: number
          total_spent?: number
          visit_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          loyalty_points?: number
          total_spent?: number
          visit_count?: number
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          total_amount: number
          status: string
          payment_method: string
          order_type: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          total_amount: number
          status?: string
          payment_method: string
          order_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          total_amount?: number
          status?: string
          payment_method?: string
          order_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity: number
          price: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
