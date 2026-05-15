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
    redirect('/auth/login')
  }

  // Check if user has a member record
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    redirect('/auth/signup')
  }

  if (!member) {
    // No member record - redirect to create company
    redirect('/auth/signup')
  }

  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
