'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Member, Company } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface AppContextType {
  user: User | null
  member: Member | null
  company: Company | null
  isLoading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUserData = useCallback(async () => {
    try {
      const supabase = createClient()
      
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (!authUser) {
        setMember(null)
        setCompany(null)
        return
      }

      // Get member with company
      const { data: memberData } = await supabase
        .from('members')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('user_id', authUser.id)
        .single()

      if (memberData) {
        const { company: companyData, ...memberOnly } = memberData
        setMember(memberOnly as Member)
        setCompany(companyData as Company)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserData()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData()
      } else {
        setUser(null)
        setMember(null)
        setCompany(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserData])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setMember(null)
    setCompany(null)
  }, [])

  return (
    <AppContext.Provider 
      value={{ 
        user, 
        member, 
        company, 
        isLoading, 
        refresh: loadUserData,
        signOut 
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
