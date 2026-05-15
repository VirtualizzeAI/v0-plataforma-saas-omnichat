'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, ArrowLeft, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface Broadcast {
  id: string
  name: string
  template_name: string
  status: string
  total_contacts: number
  sent_count: number
  delivered_count: number
  read_count: number
  error_count: number
  created_at: string
  started_at?: string
  completed_at?: string
}

interface BroadcastContact {
  id: string
  phone: string
  name?: string
  status: string
  error_message?: string
  sent_at?: string
}

const STATUS_MAP: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: 'Rascunho', icon: Clock, className: 'bg-muted text-muted-foreground' },
  sending: {
    label: 'Enviando',
    icon: Send,
    className: 'bg-yellow-500/15 text-yellow-700',
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle2,
    className: 'bg-green-500/15 text-green-700',
  },
  failed: {
    label: 'Falhou',
    icon: AlertCircle,
    className: 'bg-destructive/15 text-destructive',
  },
  cancelled: {
    label: 'Cancelado',
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground',
  },
}

export default function BroadcastDetailPage() {
  const router = useRouter()
  const params = useParams()
  const broadcastId = params.id as string

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [contacts, setContacts] = useState<BroadcastContact[]>([])
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(false)

  useEffect(() => {
    fetchBroadcast()
  }, [broadcastId])

  async function fetchBroadcast() {
    setLoading(true)
    try {
      const res = await fetch(`/api/broadcasts/${broadcastId}`)
      if (!res.ok) {
        toast.error('Campanha não encontrada')
        router.push('/dashboard/broadcasts')
        return
      }
      const data = await res.json()
      setBroadcast(data.broadcast)

      // Fetch contacts
      await fetchContacts()
    } catch (error) {
      console.error('Error fetching broadcast:', error)
      toast.error('Erro ao carregar campanha')
    } finally {
      setLoading(false)
    }
  }

  async function fetchContacts() {
    setContactsLoading(true)
    try {
      const res = await fetch(`/api/broadcasts/${broadcastId}/contacts`)
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setContactsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Campanha não encontrada</p>
      </div>
    )
  }

  const statusInfo = STATUS_MAP[broadcast.status]
  const successRate =
    broadcast.total_contacts > 0 ? (broadcast.sent_count / broadcast.total_contacts) * 100 : 0
  const deliveryRate =
    broadcast.sent_count > 0 ? (broadcast.delivered_count / broadcast.sent_count) * 100 : 0
  const readRate =
    broadcast.delivered_count > 0 ? (broadcast.read_count / broadcast.delivered_count) * 100 : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{broadcast.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Template: {broadcast.template_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Criada em</span>
              <span className="text-sm font-medium">
                {format(new Date(broadcast.created_at), 'dd/MM/yy HH:mm', {
                  locale: ptBR,
                })}
              </span>
            </div>
            {broadcast.started_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Iniciada em</span>
                <span className="text-sm font-medium">
                  {format(new Date(broadcast.started_at), 'dd/MM/yy HH:mm', {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
            {broadcast.completed_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concluída em</span>
                <span className="text-sm font-medium">
                  {format(new Date(broadcast.completed_at), 'dd/MM/yy HH:mm', {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-primary">{broadcast.total_contacts}</p>
                <p className="text-xs text-muted-foreground">Total de contatos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{broadcast.sent_count}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{broadcast.delivered_count}</p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{broadcast.error_count}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Progresso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de envio</span>
              <span className="text-sm text-muted-foreground">{Math.round(successRate)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de entrega</span>
              <span className="text-sm text-muted-foreground">{Math.round(deliveryRate)}%</span>
            </div>
            <Progress value={deliveryRate} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de leitura</span>
              <span className="text-sm text-muted-foreground">{Math.round(readRate)}%</span>
            </div>
            <Progress value={readRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes dos contatos</CardTitle>
          <CardDescription>
            {contacts.length} contato{contacts.length !== 1 ? 's' : ''} nesta campanha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum contato nesta campanha
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de envio</TableHead>
                    <TableHead>Mensagem de erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                      <TableCell className="text-sm">
                        {contact.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contact.status === 'sent'
                              ? 'default'
                              : contact.status === 'delivered'
                                ? 'secondary'
                                : contact.status === 'failed'
                                  ? 'destructive'
                                  : 'outline'
                          }
                        >
                          {contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.sent_at
                          ? format(new Date(contact.sent_at), 'dd/MM/yy HH:mm', {
                              locale: ptBR,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-destructive">
                        {contact.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
