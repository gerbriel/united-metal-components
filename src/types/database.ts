export type UserRole = 'customer' | 'employee' | 'admin'
export type EmployeeRole = 'office' | 'warehouse'
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'loading'
  | 'completed'
  | 'cancelled'
  | 'ready' // legacy — treated as ready_for_pickup in UI
export type NotificationType = 'order_update' | 'newsletter' | 'system'
export type SubscriberStatus = 'active' | 'unsubscribed'
export type CampaignStatus = 'draft' | 'scheduled' | 'sent'
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          employee_role: EmployeeRole | null
          first_name: string | null
          last_name: string | null
          full_name: string | null
          phone: string | null
          company: string | null
          company_name: string | null
          mailing_address: string | null
          business_address: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          notes: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>>
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      product_categories: {
        Row: { id: number; name: string; slug: string }
        Insert: Omit<Database['public']['Tables']['product_categories']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>
      }
      products: {
        Row: {
          id: number
          sku: string | null
          name: string
          category_id: number | null
          description: string | null
          unit: string | null
          weight_lbs: number | null
          price: number
          stock_qty: number
          image_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      orders: {
        Row: {
          id: number
          customer_id: string
          status: OrderStatus
          subtotal: number
          tax: number
          total: number
          shipping_name: string | null
          shipping_phone: string | null
          shipping_addr: string | null
          notes: string | null
          customer_no_defects_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          product_id: number
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      order_status_history: {
        Row: {
          id: number
          order_id: number
          old_status: OrderStatus | null
          new_status: OrderStatus
          changed_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_status_history']['Row'], 'id' | 'created_at'>
        Update: never
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          type: NotificationType
          title: string
          message: string
          order_id: number | null
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      order_item_staging: {
        Row: {
          id: number
          order_id: number
          order_item_id: number
          staged_by: string | null
          staged_at: string
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['order_item_staging']['Row'], 'id' | 'staged_at'>
        Update: Partial<Database['public']['Tables']['order_item_staging']['Insert']>
      }
      order_item_loading: {
        Row: {
          id: number
          order_id: number
          order_item_id: number
          employee_confirmed_at: string | null
          employee_confirmed_by: string | null
          customer_confirmed_at: string | null
          customer_confirmed_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['order_item_loading']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['order_item_loading']['Insert']>
      }
      inventory_log: {
        Row: {
          id: number
          product_id: number
          change_qty: number
          reason: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
      newsletter_subscribers: {
        Row: {
          id: number
          email: string
          name: string | null
          status: SubscriberStatus
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'subscribed_at'>
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
      }
      newsletter_campaigns: {
        Row: {
          id: number
          subject: string
          preview_text: string | null
          body_html: string
          body_text: string | null
          status: CampaignStatus
          scheduled_at: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_campaigns']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['newsletter_campaigns']['Insert']>
      }
      crm_notes: {
        Row: {
          id: number
          customer_id: string
          author_id: string | null
          body: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['crm_notes']['Row'], 'id' | 'created_at'>
        Update: never
      }
      social_posts: {
        Row: {
          id: number
          content: string
          image_url: string | null
          platforms: string[]
          status: PostStatus
          scheduled_at: string | null
          published_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['social_posts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['social_posts']['Insert']>
      }
      analytics_events: {
        Row: {
          id: number
          session_id: string | null
          event: string
          page: string
          referrer: string | null
          country: string | null
          device: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['analytics_events']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      employee_role: EmployeeRole
      order_status: OrderStatus
      notification_type: NotificationType
      subscriber_status: SubscriberStatus
      campaign_status: CampaignStatus
      post_status: PostStatus
    }
  }
}

// Convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderStatusHistory = Database['public']['Tables']['order_status_history']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type OrderItemStaging = Database['public']['Tables']['order_item_staging']['Row']
export type OrderItemLoading = Database['public']['Tables']['order_item_loading']['Row']
export type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row']
export type NewsletterCampaign = Database['public']['Tables']['newsletter_campaigns']['Row']
export type CrmNote = Database['public']['Tables']['crm_notes']['Row']
export type SocialPost = Database['public']['Tables']['social_posts']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']

// Status display helpers
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  processing:       'Processing',
  ready_for_pickup: 'Ready for Pickup',
  ready:            'Ready for Pickup',
  loading:          'Loading',
  completed:        'Completed',
  cancelled:        'Cancelled',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'loading',
  'completed',
]
