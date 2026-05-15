'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context/app-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface WATemplate {
  id: string
  name: string
  language: string
  category: string
  status: string
  synced_at: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Aprovado', className: 'bg-green-500/15 text-green-700' },
  PENDING: { label: 'Pendente', className: 'bg-yellow-500/15 text-yellow-700' },
  REJECTED: { label: 'Rejeitado', className: 'bg-destructive/15 text-destructive' },
  PAUSED: { label: 'Pausado', className: 'bg-muted text-muted-foreground' },
}

export default function TemplatesPage() {
  const { company } = useApp()
  const [templates, setTemplates] = useState<WATemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<WATemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredTemplates(filtered)
  }, [templates, searchTerm])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    if (!company?.id) {
      toast.error('Empresa nao identificada')
      return
    }

    setSyncing(true)
    try {
      const res = await fetch('/api/templates?sync=true')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar')
      }

      setTemplates(data.templates || [])
      toast.success('Templates sincronizados com sucesso')
    } catch (error) {
      console.error('Error syncing templates:', error)
      toast.error('Erro ao sincronizar templates')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize e sincronize seus templates WhatsApp aprovados
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Templates WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Pesquisar templates por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                {templates.length === 0
                  ? 'Nenhum template sincronizado ainda'
                  : 'Nenhum template encontrado'}
              </p>
              {templates.length === 0 && (
                <Button onClick={handleSync} variant="outline" size="sm">
                  Sincronizar templates
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Idioma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sincronizado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const statusInfo =
                      STATUS_BADGE[template.status] || STATUS_BADGE.PENDING
                    return (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {template.category.toLowerCase()}
                        </TableCell>
                        <TableCell className="text-sm uppercase">
                          {template.language}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(template.synced_at), 'dd/MM/yy HH:mm', {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
