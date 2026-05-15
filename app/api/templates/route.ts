import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET: list templates (from DB cache, optionally sync from Meta first)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const sync = searchParams.get('sync') === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  // Get member + company (use admin to bypass RLS)
  const adminClient = createAdminClient()
  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError || !member) return NextResponse.json({ error: 'Membro nao encontrado' }, { status: 404 })

  // Get active WABA connection
  const { data: waba } = await adminClient
    .from('waba_connections')
    .select('*')
    .eq('company_id', member.company_id)
    .eq('is_active', true)
    .maybeSingle()

  // If sync requested and WABA exists, fetch from Meta API
  if (sync && waba?.access_token && waba?.waba_id) {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v18.0/${waba.waba_id}/message_templates?fields=name,status,category,language,components&limit=100`,
        { headers: { Authorization: `Bearer ${waba.access_token}` } }
      )
      if (metaRes.ok) {
        const metaData = await metaRes.json()
        const templates = metaData.data || []

        // Upsert all templates
        for (const tpl of templates) {
          await adminClient.from('wa_templates').upsert(
            {
              company_id: member.company_id,
              waba_connection_id: waba.id,
              template_id: tpl.id,
              name: tpl.name,
              language: tpl.language,
              category: tpl.category,
              status: tpl.status,
              components: tpl.components || [],
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'template_id' }
          )
        }
      }
    } catch (err) {
      console.error('[v0] Erro ao sincronizar templates:', err)
    }
  }

  // Return from DB
  const { data: templates, error } = await adminClient
    .from('wa_templates')
    .select('*')
    .eq('company_id', member.company_id)
    .eq('status', 'APPROVED')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ templates: templates || [], waba_connected: !!waba })
}
