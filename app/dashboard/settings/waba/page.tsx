'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/app-context'
import type { WabaConnection } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Plus,
  Phone,
  Plug,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

export default function WabaSettingsPage() {
  const { company, member } = useApp()
  const [connections, setConnections] = useState<WabaConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<WabaConnection | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    waba_id: '',
    phone_number_id: '',
    phone_number: '',
    display_name: '',
    access_token: '',
  })

  const fetchConnections = useCallback(async () => {
    if (!company?.id) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('waba_connections')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setConnections(data || [])
    } catch (error) {
      console.error('Error fetching connections:', error)
      toast.error('Erro ao carregar conexoes')
    } finally {
      setIsLoading(false)
    }
  }, [company?.id])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const resetForm = () => {
    setFormData({
      waba_id: '',
      phone_number_id: '',
      phone_number: '',
      display_name: '',
      access_token: '',
    })
  }

  const handleCreate = async () => {
    if (!company?.id || !formData.waba_id || !formData.phone_number_id || !formData.phone_number) {
      toast.error('Preencha todos os campos obrigatorios')
      return
    }

    setIsSaving(true)
    try {
      // Generate a random webhook verify token
      const webhookVerifyToken = Math.random().toString(36).substring(2, 15) + 
                                  Math.random().toString(36).substring(2, 15)
      
      const supabase = createClient()
      const { error } = await supabase.from('waba_connections').insert({
        company_id: company.id,
        waba_id: formData.waba_id,
        phone_number_id: formData.phone_number_id,
        phone_number: formData.phone_number,
        display_name: formData.display_name || null,
        access_token: formData.access_token || null,
        webhook_verify_token: webhookVerifyToken,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta conexao ja existe')
        } else {
          throw error
        }
        return
      }

      toast.success('Conexao criada com sucesso')
      setIsCreateOpen(false)
      resetForm()
      fetchConnections()
    } catch (error) {
      console.error('Error creating connection:', error)
      toast.error('Erro ao criar conexao')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedConnection?.id) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('waba_connections')
        .delete()
        .eq('id', selectedConnection.id)

      if (error) throw error

      toast.success('Conexao excluida com sucesso')
      setIsDeleteOpen(false)
      setSelectedConnection(null)
      fetchConnections()
    } catch (error) {
      console.error('Error deleting connection:', error)
      toast.error('Erro ao excluir conexao')
    }
  }

  const handleToggleActive = async (connection: WabaConnection) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('waba_connections')
        .update({ is_active: !connection.is_active })
        .eq('id', connection.id)

      if (error) throw error

      toast.success(connection.is_active ? 'Conexao desativada' : 'Conexao ativada')
      fetchConnections()
    } catch (error) {
      console.error('Error toggling connection:', error)
      toast.error('Erro ao alterar status')
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Copiado para a area de transferencia')
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : ''

  const isAdmin = member?.role === 'owner' || member?.role === 'admin'

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Conexao WhatsApp</h1>
        <p className="text-muted-foreground">
          Configure sua conexao com a API oficial do WhatsApp Business
        </p>
      </div>

      {/* Webhook Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Configuracao do Webhook
          </CardTitle>
          <CardDescription>
            Configure o webhook no Meta Business Suite para receber mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl, 'webhook_url')}
              >
                {copiedField === 'webhook_url' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {connections.length > 0 && connections[0].webhook_verify_token && (
            <div className="space-y-2">
              <Label>Token de Verificacao</Label>
              <div className="flex gap-2">
                <Input
                  value={connections[0].webhook_verify_token}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(connections[0].webhook_verify_token, 'verify_token')}
                >
                  {copiedField === 'verify_token' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Campos de assinatura do Webhook:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>messages</li>
              <li>message_deliveries</li>
              <li>message_reads</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/set-up-webhooks"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentacao Meta
            </a>
          </Button>
        </CardFooter>
      </Card>

      {/* Connections */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Conexoes</h2>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova conexao
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar conexao WhatsApp</DialogTitle>
                <DialogDescription>
                  Preencha os dados da sua conta WhatsApp Business API
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="waba_id">WABA ID *</Label>
                  <Input
                    id="waba_id"
                    value={formData.waba_id}
                    onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                    placeholder="ID da sua conta WhatsApp Business"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                  <Input
                    id="phone_number_id"
                    value={formData.phone_number_id}
                    onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                    placeholder="ID do numero de telefone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Numero de telefone *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="5511999999999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Nome de exibicao</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_token">Access Token</Label>
                  <Input
                    id="access_token"
                    type="password"
                    value={formData.access_token}
                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    placeholder="Token de acesso permanente"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Adicionar conexao'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="font-medium mb-1">Nenhuma conexao configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione sua primeira conexao WhatsApp Business
              </p>
              {isAdmin && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar conexao
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          connections.map((connection) => (
            <Card key={connection.id}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-success/10">
                    <Phone className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {connection.display_name || connection.phone_number}
                      </h3>
                      <Badge variant={connection.is_active ? 'default' : 'secondary'}>
                        {connection.is_active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.phone_number} | WABA: {connection.waba_id}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(connection)}
                      >
                        {connection.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedConnection(connection)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conexao? Todas as conversas
              associadas a ela serao mantidas, mas nao sera possivel enviar ou
              receber novas mensagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
