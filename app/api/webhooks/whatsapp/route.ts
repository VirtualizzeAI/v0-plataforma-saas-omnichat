import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe') {
    // Verify the token matches any of our connections
    const { data: connection } = await supabaseAdmin
      .from('waba_connections')
      .select('id')
      .eq('webhook_verify_token', token)
      .single()

    if (connection) {
      console.log('Webhook verified successfully')
      return new NextResponse(challenge, { status: 200 })
    }
  }

  console.log('Webhook verification failed')
  return new NextResponse('Forbidden', { status: 403 })
}

// Receive messages (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log incoming webhook for debugging
    console.log('Webhook received:', JSON.stringify(body, null, 2))

    // Validate WhatsApp webhook structure
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []

      for (const change of changes) {
        if (change.field !== 'messages') continue

        const value = change.value
        const metadata = value.metadata
        const phoneNumberId = metadata?.phone_number_id

        // Find the connection for this phone number
        const { data: connection } = await supabaseAdmin
          .from('waba_connections')
          .select('*, company_id')
          .eq('phone_number_id', phoneNumberId)
          .eq('is_active', true)
          .single()

        if (!connection) {
          console.log(`No active connection found for phone_number_id: ${phoneNumberId}`)
          continue
        }

        // Process messages
        const messages = value.messages || []
        for (const message of messages) {
          await processIncomingMessage(connection, message, value.contacts)
        }

        // Process status updates
        const statuses = value.statuses || []
        for (const status of statuses) {
          await processStatusUpdate(status)
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function processIncomingMessage(
  connection: { id: string; company_id: string },
  message: {
    id: string
    from: string
    timestamp: string
    type: string
    text?: { body: string }
    image?: { id: string; mime_type: string; sha256: string; caption?: string }
    document?: { id: string; mime_type: string; sha256: string; filename: string; caption?: string }
    audio?: { id: string; mime_type: string; sha256: string }
    video?: { id: string; mime_type: string; sha256: string; caption?: string }
  },
  contacts?: { profile: { name: string }; wa_id: string }[]
) {
  const contactPhone = message.from
  const contactInfo = contacts?.find(c => c.wa_id === contactPhone)
  const contactName = contactInfo?.profile?.name || contactPhone

  // Find or create contact
  let { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('company_id', connection.company_id)
    .eq('phone', contactPhone)
    .single()

  if (!contact) {
    // Create new contact
    const { data: newContact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        company_id: connection.company_id,
        name: contactName,
        phone: contactPhone,
      })
      .select('id')
      .single()

    if (contactError) {
      console.error('Error creating contact:', contactError)
      return
    }
    contact = newContact
  }

  // Find or create conversation
  let { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('company_id', connection.company_id)
    .eq('contact_id', contact.id)
    .eq('waba_connection_id', connection.id)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    // Create new conversation
    const { data: newConversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        company_id: connection.company_id,
        contact_id: contact.id,
        waba_connection_id: connection.id,
        status: 'open',
        channel: 'whatsapp',
        last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      return
    }
    conversation = newConversation
  }

  // Determine message type and content
  let messageType: string = 'text'
  let content: string | null = null
  let mediaUrl: string | null = null

  switch (message.type) {
    case 'text':
      messageType = 'text'
      content = message.text?.body || null
      break
    case 'image':
      messageType = 'image'
      content = message.image?.caption || null
      // Media URL would need to be fetched from WhatsApp API using message.image.id
      break
    case 'document':
      messageType = 'document'
      content = message.document?.caption || message.document?.filename || null
      break
    case 'audio':
      messageType = 'audio'
      break
    case 'video':
      messageType = 'video'
      content = message.video?.caption || null
      break
    default:
      messageType = message.type
  }

  // Insert message
  const { error: messageError } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_type: 'contact',
      content,
      message_type: messageType,
      media_url: mediaUrl,
      waba_message_id: message.id,
      status: 'delivered',
      created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })

  if (messageError) {
    console.error('Error inserting message:', messageError)
    return
  }

  // Update conversation last_message_at and increment unread_count
  await supabaseAdmin.rpc('increment_unread', { conversation_uuid: conversation.id })
  
  await supabaseAdmin
    .from('conversations')
    .update({
      last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      status: 'open', // Reopen if it was waiting
    })
    .eq('id', conversation.id)

  console.log(`Message ${message.id} processed for conversation ${conversation.id}`)
}

async function processStatusUpdate(status: {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  errors?: { code: number; title: string }[]
}) {
  const newStatus = status.status === 'failed' ? 'failed' : status.status

  const { error } = await supabaseAdmin
    .from('messages')
    .update({ status: newStatus })
    .eq('waba_message_id', status.id)

  if (error) {
    console.error('Error updating message status:', error)
  } else {
    console.log(`Message ${status.id} status updated to ${newStatus}`)
  }
}
