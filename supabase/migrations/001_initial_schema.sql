-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members table (connections between users and companies)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Sectors table
CREATE TABLE IF NOT EXISTS public.sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  avatar_url TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WABA Connections table (WhatsApp Business Account)
CREATE TABLE IF NOT EXISTS public.waba_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT,
  webhook_verify_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  waba_connection_id UUID REFERENCES public.waba_connections(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.members(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'closed')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'messenger', 'webchat')),
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'template', 'interactive')),
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  waba_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Tags junction table
CREATE TABLE IF NOT EXISTS public.contact_tags (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- Conversation Tags junction table
CREATE TABLE IF NOT EXISTS public.conversation_tags (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

-- WhatsApp Templates table
CREATE TABLE IF NOT EXISTS public.wa_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  waba_connection_id UUID REFERENCES public.waba_connections(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED')),
  components JSONB NOT NULL DEFAULT '[]',
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broadcasts table
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  waba_connection_id UUID REFERENCES public.waba_connections(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL,
  template_variables JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')),
  source TEXT NOT NULL CHECK (source IN ('contacts', 'spreadsheet')),
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 2) DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broadcast Contacts table
CREATE TABLE IF NOT EXISTS public.broadcast_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  name TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  waba_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_company_id ON public.members(company_id);
CREATE INDEX IF NOT EXISTS idx_sectors_company_id ON public.sectors(company_id);
CREATE INDEX IF NOT EXISTS idx_tags_company_id ON public.tags(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON public.conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notes_conversation_id ON public.notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notes_member_id ON public.notes(member_id);
CREATE INDEX IF NOT EXISTS idx_waba_connections_company_id ON public.waba_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_company_id ON public.broadcasts(company_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON public.broadcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_broadcast_contacts_broadcast_id ON public.broadcast_contacts(broadcast_id);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waba_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Companies: Users can only see their own companies (through members)
CREATE POLICY "Users can view their companies" 
ON public.companies FOR SELECT
USING (id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Members: Users can only see members of their companies
CREATE POLICY "Users can view members of their companies"
ON public.members FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own member record"
ON public.members FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Sectors: Users can only see sectors of their companies
CREATE POLICY "Users can view sectors of their companies"
ON public.sectors FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Tags: Users can only see tags of their companies
CREATE POLICY "Users can view tags of their companies"
ON public.tags FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Contacts: Users can only see contacts of their companies
CREATE POLICY "Users can view contacts of their companies"
ON public.contacts FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Conversations: Users can only see conversations of their companies
CREATE POLICY "Users can view conversations of their companies"
ON public.conversations FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Messages: Users can only see messages of their company conversations
CREATE POLICY "Users can view messages of their conversations"
ON public.messages FOR SELECT
USING (conversation_id IN (
  SELECT id FROM public.conversations 
  WHERE company_id IN (
    SELECT company_id FROM public.members WHERE user_id = auth.uid()
  )
));

-- Notes: Users can only see notes of their company conversations
CREATE POLICY "Users can view notes of their conversations"
ON public.notes FOR SELECT
USING (conversation_id IN (
  SELECT id FROM public.conversations 
  WHERE company_id IN (
    SELECT company_id FROM public.members WHERE user_id = auth.uid()
  )
));

-- WABA Connections: Users can only see connections of their companies
CREATE POLICY "Users can view waba connections of their companies"
ON public.waba_connections FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- WhatsApp Templates: Users can only see templates of their companies
CREATE POLICY "Users can view wa templates of their companies"
ON public.wa_templates FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Broadcasts: Users can only see broadcasts of their companies
CREATE POLICY "Users can view broadcasts of their companies"
ON public.broadcasts FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.members WHERE user_id = auth.uid()
));

-- Broadcast Contacts: Users can only see broadcast contacts of their broadcasts
CREATE POLICY "Users can view broadcast contacts of their broadcasts"
ON public.broadcast_contacts FOR SELECT
USING (broadcast_id IN (
  SELECT id FROM public.broadcasts 
  WHERE company_id IN (
    SELECT company_id FROM public.members WHERE user_id = auth.uid()
  )
));
