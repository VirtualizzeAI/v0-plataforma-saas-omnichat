'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context/app-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Building2, User, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { company, member, refresh } = useApp()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false)
  const [profileData, setProfileData] = useState({
    name: member?.name || '',
  })
  const [companyData, setCompanyData] = useState({
    name: company?.name || '',
  })

  const handleUpdateProfile = async () => {
    if (!member?.id || !profileData.name.trim()) {
      toast.error('Nome e obrigatorio')
      return
    }

    setIsUpdatingProfile(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('members')
        .update({ name: profileData.name.trim() })
        .eq('id', member.id)

      if (error) throw error

      toast.success('Perfil atualizado com sucesso')
      await refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdateCompany = async () => {
    if (!company?.id || !companyData.name.trim()) {
      toast.error('Nome da empresa e obrigatorio')
      return
    }

    if (member?.role !== 'owner' && member?.role !== 'admin') {
      toast.error('Voce nao tem permissao para alterar os dados da empresa')
      return
    }

    setIsUpdatingCompany(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('companies')
        .update({ name: companyData.name.trim() })
        .eq('id', company.id)

      if (error) throw error

      toast.success('Empresa atualizada com sucesso')
      await refresh()
    } catch (error) {
      console.error('Error updating company:', error)
      toast.error('Erro ao atualizar empresa')
    } finally {
      setIsUpdatingCompany(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const isAdmin = member?.role === 'owner' || member?.role === 'admin'

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e configuracoes da empresa
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu perfil
            </CardTitle>
            <CardDescription>
              Atualize suas informacoes pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member?.avatar_url || undefined} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {member?.name ? getInitials(member.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member?.name}</p>
                <p className="text-sm text-muted-foreground">{member?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {member?.role === 'owner' ? 'Proprietario' :
                   member?.role === 'admin' ? 'Administrador' : 'Atendente'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={member?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email nao pode ser alterado
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alteracoes'
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Company Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresa
            </CardTitle>
            <CardDescription>
              Configuracoes da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da empresa</Label>
              <Input
                id="company-name"
                value={companyData.name}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                placeholder="Nome da empresa"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-slug">Identificador (slug)</Label>
              <Input
                id="company-slug"
                value={company?.slug || ''}
                disabled
                className="bg-muted font-mono"
              />
              <p className="text-xs text-muted-foreground">
                O identificador nao pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label>Plano atual</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary capitalize">
                  {company?.plan || 'free'}
                </span>
              </div>
            </div>
          </CardContent>
          {isAdmin && (
            <CardFooter>
              <Button onClick={handleUpdateCompany} disabled={isUpdatingCompany}>
                {isUpdatingCompany ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alteracoes'
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
