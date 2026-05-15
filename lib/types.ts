// Database types
export interface Company {
  id: string
  name: string
  slug: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  user_id: string
  company_id: string
  role: 'owner' | 'admin' | 'agent'
  name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Sector {
  id: string
  company_id: string
  name: string
  color: string
  created_at: string
}

export interface Tag {
  id: string
  company_id: string
  name: string
  color: string
  created_at: string
}

export interface Contact {
  id: string
  company_id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  avatar_url: string | null
  custom_fields: Record<string, unknown>
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface WabaConnection {
  id: string
  company_id: string
  waba_id: string
  phone_number_id: string
  phone_number: string
  display_name: string | null
  access_token: string | null
  webhook_verify_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  company_id: string
  contact_id: string
  waba_connection_id: string | null
  assigned_to: string | null
  sector_id: string | null
  status: 'open' | 'waiting' | 'closed'
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'webchat'
  last_message_at: string
  unread_count: number
  created_at: string
  updated_at: string
  // Relations
  contact?: Contact
  assigned_member?: Member
  sector?: Sector
  tags?: Tag[]
  last_message?: Message
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'contact' | 'agent' | 'system'
  sender_id: string | null
  content: string | null
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive'
  media_url: string | null
  metadata: Record<string, unknown>
  waba_message_id: string | null
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
}

export interface Note {
  id: string
  conversation_id: string
  member_id: string
  content: string
  created_at: string
  member?: Member
}

// Inbox filter types
export type InboxFilter = 'all' | 'mine' | 'unassigned' | 'waiting' | 'closed'

// Auth types
export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    name?: string
    avatar_url?: string
  }
}

// App context types
export interface AppContext {
  user: AuthUser | null
  member: Member | null
  company: Company | null
  isLoading: boolean
}
