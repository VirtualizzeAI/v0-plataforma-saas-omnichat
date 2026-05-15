import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, companyName } = await request.json()

    if (!email || !password || !name || !companyName) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 1. Create user directly with admin (no email sent, auto-confirmed)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        company_name: companyName,
      },
    })

    if (userError) {
      if (userError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Este email ja esta cadastrado' },
          { status: 400 }
        )
      }
      console.error('[v0] Error creating user:', userError)
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      )
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuario' },
        { status: 500 }
      )
    }

    // 2. Generate slug from company name
    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    // 3. Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        slug,
      })
      .select()
      .single()

    if (companyError) {
      // Rollback: delete the user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      console.error('[v0] Error creating company:', companyError)
      return NextResponse.json(
        { error: 'Erro ao criar empresa: ' + companyError.message },
        { status: 500 }
      )
    }

    // 4. Create member (owner)
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: userData.user.id,
        company_id: company.id,
        name: name,
        email: email,
        role: 'owner',
      })

    if (memberError) {
      // Rollback: delete company and user
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      console.error('[v0] Error creating member:', memberError)
      return NextResponse.json(
        { error: 'Erro ao criar membro: ' + memberError.message },
        { status: 500 }
      )
    }

    // 5. Create default sectors
    const defaultSectors = [
      { company_id: company.id, name: 'Vendas', color: '#3b82f6' },
      { company_id: company.id, name: 'Suporte', color: '#10b981' },
      { company_id: company.id, name: 'Financeiro', color: '#f59e0b' },
    ]
    await supabaseAdmin.from('sectors').insert(defaultSectors)

    // 6. Create default tags
    const defaultTags = [
      { company_id: company.id, name: 'Novo', color: '#6366f1' },
      { company_id: company.id, name: 'VIP', color: '#f59e0b' },
      { company_id: company.id, name: 'Urgente', color: '#ef4444' },
    ]
    await supabaseAdmin.from('tags').insert(defaultTags)

    return NextResponse.json({ 
      success: true, 
      userId: userData.user.id,
      companyId: company.id 
    })
  } catch (error) {
    console.error('[v0] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
