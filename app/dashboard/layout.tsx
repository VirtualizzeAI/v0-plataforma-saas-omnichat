import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/lib/context/app-context'
import { AppShell } from '@/components/app-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log('[v0] No user found, redirecting to login')
    redirect('/auth/login')
  }

  console.log('[v0] User found:', user.id)

  // Check if user has a member record
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, company_id')
    .eq('user_id', user.id)
    .maybeSingle() // Use maybeSingle instead of single to avoid errors

  console.log('[v0] Member query result:', { member, memberError })

  if (memberError) {
    console.error('[v0] Error fetching member:', memberError)
    redirect('/auth/signup')
  }

  if (!member) {
    console.log('[v0] No member record found for user, redirecting to signup')
    // No member record - redirect to create company
    redirect('/auth/signup')
  }

  console.log('[v0] Member found, loading dashboard')

  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
