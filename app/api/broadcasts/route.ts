import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST: create and start broadcast
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('id, company_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Membro nao encontrado' }, { status: 404 })

  const { data: waba } = await supabase
    .from('waba_connections')
    .select('*')
    .eq('company_id', member.company_id)
    .eq('is_active', true)
    .single()

  const {
    name,
    template_id,
    template_name,
    template_language,
    template_variables,
    contacts, // [{ phone, name, variables, contact_id? }]
  } = body

  if (!name || !template_id || !contacts?.length) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Estimated cost: R$0.083 per marketing message (approximate Meta pricing)
  const estimatedCost = contacts.length * 0.083

  // Create broadcast record
  const { data: broadcast, error: bError } = await adminClient
    .from('broadcasts')
    .insert({
      company_id: member.company_id,
      waba_connection_id: waba?.id || null,
      created_by: member.id,
      name,
      template_id,
      template_name,
      template_language: template_language || 'pt_BR',
      template_variables: template_variables || {},
      status: 'sending',
      source: body.source || 'contacts',
      total_contacts: contacts.length,
      estimated_cost: estimatedCost,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (bError || !broadcast) {
    return NextResponse.json({ error: bError?.message || 'Erro ao criar campanha' }, { status: 500 })
  }

  // Insert all contacts
  const broadcastContacts = contacts.map((c: { phone: string; name?: string; variables?: Record<string, string>; contact_id?: string }) => ({
    broadcast_id: broadcast.id,
    contact_id: c.contact_id || null,
    phone: c.phone,
    name: c.name || null,
    variables: c.variables || {},
    status: 'pending',
  }))

  await adminClient.from('broadcast_contacts').insert(broadcastContacts)

  // If WABA is connected, send messages (fire and forget per contact)
  let sentCount = 0
  let errorCount = 0

  if (waba?.access_token && waba?.phone_number_id) {
    for (const contact of contacts) {
      try {
        // Build template components with variables
        const components: object[] = []
        if (template_variables && Object.keys(template_variables).length > 0) {
          components.push({
            type: 'body',
            parameters: Object.values(template_variables).map((v: string) => ({
              type: 'text',
              text: v,
            })),
          })
        }

        const msgBody: Record<string, unknown> = {
          messaging_product: 'whatsapp',
          to: contact.phone.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: template_name,
            language: { code: template_language || 'pt_BR' },
            ...(components.length > 0 ? { components } : {}),
          },
        }

        const res = await fetch(
          `https://graph.facebook.com/v18.0/${waba.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${waba.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(msgBody),
          }
        )

        const result = await res.json()

        // Update contact status
        await adminClient
          .from('broadcast_contacts')
          .update({
            status: res.ok ? 'sent' : 'failed',
            waba_message_id: result.messages?.[0]?.id || null,
            error_message: !res.ok ? JSON.stringify(result.error) : null,
            sent_at: res.ok ? new Date().toISOString() : null,
          })
          .eq('broadcast_id', broadcast.id)
          .eq('phone', contact.phone)

        if (res.ok) sentCount++
        else errorCount++
      } catch (err) {
        errorCount++
        await adminClient
          .from('broadcast_contacts')
          .update({ status: 'failed', error_message: String(err) })
          .eq('broadcast_id', broadcast.id)
          .eq('phone', contact.phone)
      }
    }
  } else {
    // No WABA connected — mark all as sent for demo
    sentCount = contacts.length
  }

  // Update broadcast final status
  await adminClient
    .from('broadcasts')
    .update({
      status: 'completed',
      sent_count: sentCount,
      error_count: errorCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', broadcast.id)

  return NextResponse.json({ success: true, broadcast_id: broadcast.id, sent: sentCount, errors: errorCount })
}

// GET: list broadcasts
export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Membro nao encontrado' }, { status: 404 })

  const { data: broadcasts, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('company_id', member.company_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ broadcasts: broadcasts || [] })
}
