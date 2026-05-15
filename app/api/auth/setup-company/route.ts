import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, companyName } = await request.json()

    if (!userId || !userEmail || !userName || !companyName) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Generate slug from company name
    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        slug,
      })
      .select()
      .single()

    if (companyError) {
      console.error('[v0] Error creating company:', companyError)
      return NextResponse.json(
        { error: 'Erro ao criar empresa: ' + companyError.message },
        { status: 500 }
      )
    }

    // Create member (owner)
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: userId,
        company_id: company.id,
        name: userName,
        email: userEmail,
        role: 'owner',
      })

    if (memberError) {
      // Rollback company creation
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      console.error('[v0] Error creating member:', memberError)
      return NextResponse.json(
        { error: 'Erro ao criar membro: ' + memberError.message },
        { status: 500 }
      )
    }

    // Create default sectors
    const defaultSectors = [
      { company_id: company.id, name: 'Vendas', color: '#3b82f6' },
      { company_id: company.id, name: 'Suporte', color: '#10b981' },
      { company_id: company.id, name: 'Financeiro', color: '#f59e0b' },
    ]

    await supabaseAdmin.from('sectors').insert(defaultSectors)

    // Create default tags
    const defaultTags = [
      { company_id: company.id, name: 'Novo', color: '#6366f1' },
      { company_id: company.id, name: 'VIP', color: '#f59e0b' },
      { company_id: company.id, name: 'Urgente', color: '#ef4444' },
    ]

    await supabaseAdmin.from('tags').insert(defaultTags)

    return NextResponse.json({ success: true, companyId: company.id })
  } catch (error) {
    console.error('[v0] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
