import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(
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
    // Get member to delete
    const { data: memberToDelete } = await adminClient
      .from('members')
      .select('company_id')
      .eq('id', params.id)
      .maybeSingle()

    if (!memberToDelete) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
    }

    // Verify user has permission
    const { data: currentMember } = await adminClient
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', memberToDelete.company_id)
      .maybeSingle()

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Delete member
    const { error } = await adminClient
      .from('members')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error removing member:', error)
    return NextResponse.json(
      { error: 'Erro ao remover membro' },
      { status: 500 }
    )
  }
}
