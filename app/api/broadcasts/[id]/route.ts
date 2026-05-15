import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Get broadcast with permission check
    const { data: broadcast, error } = await adminClient
      .from('broadcasts')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error || !broadcast) {
      return NextResponse.json({ error: 'Broadcast não encontrado' }, { status: 404 })
    }

    // Verify user has access to this broadcast's company
    const { data: member } = await adminClient
      .from('members')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member || member.company_id !== broadcast.company_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json({ broadcast })
  } catch (error) {
    console.error('[v0] Error fetching broadcast:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar broadcast' },
      { status: 500 }
    )
  }
}
