import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { email, name, role, company_id } = await request.json()

    // Verify user has permission to add members
    const { data: member } = await adminClient
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .maybeSingle()

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Check if user already exists in company
    const { data: existingMember } = await adminClient
      .from('members')
      .select('id')
      .eq('company_id', company_id)
      .eq('email', email)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ error: 'Este membro já existe nesta empresa' }, { status: 400 })
    }

    // Create member (without user account - just a record)
    const { data: newMember, error } = await adminClient
      .from('members')
      .insert({
        company_id,
        name,
        email,
        role,
        user_id: null, // Allow null for invited members without accounts
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Insert error details:', error)
      throw error
    }

    return NextResponse.json({ member: newMember })
  } catch (error) {
    console.error('[v0] Error adding member:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar membro' },
      { status: 500 }
    )
  }
}
