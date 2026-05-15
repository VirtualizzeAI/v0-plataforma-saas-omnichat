'use client'

import { useState, useEffect } from 'react'
import { Broadcast } from '@/lib/types'
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
import { Send, Plus, Loader2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  sending: { label: 'Enviando', className: 'bg-yellow-500/15 text-yellow-700' },
  completed: { label: 'Concluido', className: 'bg-green-500/15 text-green-700' },
  failed: { label: 'Falhou', className: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBroadcasts()
  }, [])

  async function fetchBroadcasts() {
    setLoading(true)
    try {
      const res = await fetch('/api/broadcasts')
      const data = await res.json()
      setBroadcasts(data.broadcasts || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Disparos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie suas campanhas de mensagens em massa
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/broadcasts/new" className="gap-2">
            <Plus className="w-4 h-4" />
            Nova campanha
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historico de campanhas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Send className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhuma campanha criada ainda</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/broadcasts/new">Criar primeira campanha</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead className="text-center">Erros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => {
                  const st = STATUS_MAP[b.status] || STATUS_MAP.draft
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {b.template_name}
                      </TableCell>
                      <TableCell className="text-center">{b.total_contacts}</TableCell>
                      <TableCell className="text-center text-green-600">
                        {b.sent_count}
                      </TableCell>
                      <TableCell className="text-center text-destructive">
                        {b.error_count}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(b.created_at), 'dd/MM/yy HH:mm', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/broadcasts/${b.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
