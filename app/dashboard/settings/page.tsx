'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context/app-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Building2, User, Users, Loader2, Plus, Trash2 } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'agent'
  is_active: boolean
}

export default function SettingsPage() {
  const { company, member, refresh } = useApp()
  const [members, setMembers] = useState<Member[]>([])
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const [profileData, setProfileData] = useState({
    name: member?.name || '',
  })
  const [companyData, setCompanyData] = useState({
    name: company?.name || '',
  })
  const [newMemberData, setNewMemberData] = useState({
    email: '',
    name: '',
    role: 'agent' as const,
  })

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    setLoadingMembers(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('company_id', company?.id)
        .order('created_at')

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Erro ao carregar membros')
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!member?.id || !profileData.name.trim()) {
      toast.error('Nome é obrigatório')
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
      toast.error('Nome da empresa é obrigatório')
      return
    }

    if (member?.role !== 'owner' && member?.role !== 'admin') {
      toast.error('Você não tem permissão para alterar os dados da empresa')
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

  const handleAddMember = async () => {
    if (!newMemberData.email.trim() || !newMemberData.name.trim()) {
      toast.error('Email e nome são obrigatórios')
      return
    }

    if (member?.role !== 'owner' && member?.role !== 'admin') {
      toast.error('Você não tem permissão para adicionar membros')
      return
    }

    setIsAddingMember(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberData.email,
          name: newMemberData.name,
          role: newMemberData.role,
          company_id: company?.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar membro')
      }

      toast.success('Membro adicionado com sucesso')
      setNewMemberData({ email: '', name: '', role: 'agent' })
      setShowAddMember(false)
      await fetchMembers()
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar membro')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) {
      return
    }

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover membro')
      }

      toast.success('Membro removido com sucesso')
      await fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao remover membro')
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
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil, empresa e membros da equipe
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Membros</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meu perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
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
                    {member?.role === 'owner' ? 'Proprietário' :
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
                  O email não pode ser alterado
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
                  'Salvar alterações'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empresa</CardTitle>
              <CardDescription>
                Configurações da sua empresa
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
                  O identificador não pode ser alterado
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
                    'Salvar alterações'
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Membros da equipe</CardTitle>
                <CardDescription>
                  Gerencie os membros da sua empresa
                </CardDescription>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar membro
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum membro adicionado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm bg-muted">
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{m.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                          {m.role === 'owner' ? 'Proprietário' :
                           m.role === 'admin' ? 'Admin' : 'Atendente'}
                        </span>
                        {isAdmin && m.id !== member?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar novo membro</DialogTitle>
            <DialogDescription>
              Convide um novo membro para sua equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome</Label>
              <Input
                id="member-name"
                placeholder="Nome completo"
                value={newMemberData.name}
                onChange={(e) =>
                  setNewMemberData({ ...newMemberData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newMemberData.email}
                onChange={(e) =>
                  setNewMemberData({ ...newMemberData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Função</Label>
              <Select value={newMemberData.role} onValueChange={(role: any) =>
                setNewMemberData({ ...newMemberData, role })
              }>
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="agent">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={isAddingMember}>
              {isAddingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
