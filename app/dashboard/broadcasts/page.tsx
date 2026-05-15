'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/context/app-context'
import { WaTemplate, Broadcast } from '@/lib/types'
import { WhatsAppPreview } from '@/components/broadcasts/whatsapp-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Send,
  Plus,
  RefreshCw,
  Upload,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Step = 'info' | 'template' | 'contacts' | 'review'
const STEPS: { id: Step; label: string }[] = [
  { id: 'info', label: 'Campanha' },
  { id: 'template', label: 'Template' },
  { id: 'contacts', label: 'Contatos' },
  { id: 'review', label: 'Revisar' },
]

type SpreadsheetContact = { phone: string; name?: string }
type PlatformContact = { id: string; name: string; phone: string; selected: boolean }

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Rascunho',  className: 'bg-muted text-muted-foreground' },
  sending:   { label: 'Enviando',  className: 'bg-warning/15 text-warning-foreground' },
  completed: { label: 'Concluido', className: 'bg-success/15 text-success' },
  failed:    { label: 'Falhou',    className: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
}

export default function BroadcastsPage() {
  const { member } = useApp()

  // ─── List state ───────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loadingList, setLoadingList] = useState(true)

  // ─── Dialog state ─────────────────────────────────────────
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('info')

  // Step 1 - Info
  const [campaignName, setCampaignName] = useState('')

  // Step 2 - Template
  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})

  // Step 3 - Contacts
  const [contactSource, setContactSource] = useState<'contacts' | 'spreadsheet'>('contacts')
  const [platformContacts, setPlatformContacts] = useState<PlatformContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [spreadsheetContacts, setSpreadsheetContacts] = useState<SpreadsheetContact[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 4 - Review / Sending
  const [sending, setSending] = useState(false)

  // ─── Load broadcasts list ─────────────────────────────────
  useEffect(() => {
    fetchBroadcasts()
  }, [])

  async function fetchBroadcasts() {
    setLoadingList(true)
    try {
      const res = await fetch('/api/broadcasts')
      const data = await res.json()
      setBroadcasts(data.broadcasts || [])
    } finally {
      setLoadingList(false)
    }
  }

  // ─── Open dialog ──────────────────────────────────────────
  function openNew() {
    setCampaignName('')
    setStep('info')
    setSelectedTemplate(null)
    setVariables({})
    setSpreadsheetContacts([])
    setContactSearch('')
    setOpen(true)
    fetchTemplates()
    fetchPlatformContacts()
  }

  // ─── Templates ────────────────────────────────────────────
  async function fetchTemplates(sync = false) {
    setLoadingTemplates(true)
    try {
      const res = await fetch(`/api/templates${sync ? '?sync=true' : ''}`)
      const data = await res.json()
      setTemplates(data.templates || [])
      if (sync) toast.success('Templates sincronizados com a Meta')
    } catch {
      toast.error('Erro ao carregar templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  function selectTemplate(tpl: WaTemplate) {
    setSelectedTemplate(tpl)
    // Extract variable placeholders from body text
    const body = tpl.components.find((c) => c.type === 'BODY')?.text || ''
    const matches = body.match(/\{\{(\d+)\}\}/g) || []
    const vars: Record<string, string> = {}
    matches.forEach((_, i) => { vars[`var${i + 1}`] = '' })
    setVariables(vars)
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase())
  )

  // ─── Contacts ─────────────────────────────────────────────
  async function fetchPlatformContacts() {
    setLoadingContacts(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .order('name')
      setPlatformContacts(
        (data || []).map((c) => ({ ...c, selected: false }))
      )
    } finally {
      setLoadingContacts(false)
    }
  }

  function toggleContact(id: string) {
    setPlatformContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    )
  }

  function toggleAll() {
    const allSelected = filteredPlatform.every((c) => c.selected)
    const ids = new Set(filteredPlatform.map((c) => c.id))
    setPlatformContacts((prev) =>
      prev.map((c) => (ids.has(c.id) ? { ...c, selected: !allSelected } : c))
    )
  }

  const filteredPlatform = platformContacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch)
  )
  const selectedPlatformContacts = platformContacts.filter((c) => c.selected)

  // ─── Spreadsheet upload ───────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws)
        const parsed: SpreadsheetContact[] = rows
          .map((r) => ({
            phone: String(r['telefone'] || r['phone'] || r['Telefone'] || r['Phone'] || '').trim(),
            name: String(r['nome'] || r['name'] || r['Nome'] || r['Name'] || '').trim() || undefined,
          }))
          .filter((r) => r.phone)
        setSpreadsheetContacts(parsed)
        toast.success(`${parsed.length} contatos importados`)
      } catch {
        toast.error('Erro ao ler planilha. Verifique o formato.')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // ─── Final contacts list ──────────────────────────────────
  const finalContacts =
    contactSource === 'spreadsheet'
      ? spreadsheetContacts
      : selectedPlatformContacts.map((c) => ({ phone: c.phone, name: c.name, contact_id: c.id }))

  // ─── Estimated cost ───────────────────────────────────────
  const estimatedCost = finalContacts.length * 0.083

  // ─── Navigation ───────────────────────────────────────────
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  function canAdvance(): boolean {
    if (step === 'info') return campaignName.trim().length > 0
    if (step === 'template') return selectedTemplate !== null
    if (step === 'contacts') return finalContacts.length > 0
    return true
  }

  function next() {
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next.id)
  }

  function prev() {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev.id)
  }

  // ─── Send broadcast ───────────────────────────────────────
  async function handleSend() {
    if (!selectedTemplate || !member) return
    setSending(true)
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          template_id: selectedTemplate.template_id,
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language,
          template_variables: variables,
          source: contactSource,
          contacts: finalContacts,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Campanha enviada! ${data.sent} mensagens disparadas.`)
      setOpen(false)
      fetchBroadcasts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar campanha')
    } finally {
      setSending(false)
    }
  }

  // ─── Variable placeholders from body ──────────────────────
  function getVariablePlaceholders(template: WaTemplate) {
    const body = template.components.find((c) => c.type === 'BODY')?.text || ''
    return (body.match(/\{\{(\d+)\}\}/g) || []).map((m, i) => ({ key: `var${i + 1}`, index: parseInt(m.replace(/[{}]/g, '')) }))
  }

  const categoryColor: Record<string, string> = {
    MARKETING: 'bg-primary/10 text-primary',
    UTILITY: 'bg-accent/10 text-accent',
    AUTHENTICATION: 'bg-warning/10 text-warning-foreground',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Disparos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas campanhas de mensagens em massa</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova campanha
        </Button>
      </div>

      {/* Broadcasts list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historico de campanhas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Send className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhuma campanha criada ainda</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => {
                  const st = STATUS_MAP[b.status] || STATUS_MAP.draft
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{b.template_name}</TableCell>
                      <TableCell className="text-center">{b.total_contacts}</TableCell>
                      <TableCell className="text-center text-success">{b.sent_count}</TableCell>
                      <TableCell className="text-center text-destructive">{b.error_count}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(b.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Wizard Dialog ─────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Nova campanha de disparo</DialogTitle>
            <DialogDescription>Configure e envie mensagens em massa via WhatsApp</DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="px-6 py-3 border-b shrink-0">
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done = i < stepIndex
                const active = s.id === step
                return (
                  <div key={s.id} className="flex items-center">
                    <button
                      onClick={() => done && setStep(s.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : done
                          ? 'text-primary cursor-pointer hover:bg-primary/5'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs border ${
                        active ? 'border-primary-foreground/40 text-primary-foreground' :
                        done ? 'border-primary bg-primary text-primary-foreground' :
                        'border-border'
                      }`}>
                        {done ? <Check className="w-3 h-3" /> : i + 1}
                      </span>
                      {s.label}
                    </button>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-hidden">

            {/* STEP 1: Info */}
            {step === 'info' && (
              <div className="h-full flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Send className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Nome da campanha</h2>
                    <p className="text-sm text-muted-foreground mt-1">Identifique sua campanha para encontra-la depois</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Nome</Label>
                    <Input
                      id="campaign-name"
                      placeholder="Ex: Promocao de maio, Reativacao de clientes..."
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canAdvance() && next()}
                      autoFocus
                      className="text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Template */}
            {step === 'template' && (
              <div className="h-full flex overflow-hidden">
                {/* Template list */}
                <div className="w-1/2 flex flex-col border-r">
                  <div className="p-4 border-b flex items-center gap-2 shrink-0">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar template..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fetchTemplates(true)}
                      disabled={loadingTemplates}
                      title="Sincronizar com a Meta"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingTemplates ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                        <AlertCircle className="w-8 h-8 opacity-30" />
                        <p className="text-sm text-center text-balance">
                          {templates.length === 0
                            ? 'Nenhum template encontrado. Conecte sua WABA e sincronize.'
                            : 'Nenhum template corresponde a busca'}
                        </p>
                        {templates.length === 0 && (
                          <Button variant="outline" size="sm" onClick={() => fetchTemplates(true)} className="mt-1">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Sincronizar agora
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedTemplate?.id === tpl.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{tpl.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {tpl.components.find((c) => c.type === 'BODY')?.text?.substring(0, 60)}...
                              </p>
                            </div>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${categoryColor[tpl.category] || 'bg-muted text-muted-foreground'}`}>
                              {tpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">{tpl.language}</p>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Variable inputs */}
                  {selectedTemplate && Object.keys(variables).length > 0 && (
                    <div className="border-t p-4 space-y-3 shrink-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Variaveis do template</p>
                      {getVariablePlaceholders(selectedTemplate).map(({ key, index }) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{`{{${index}}}`}</Label>
                          <Input
                            placeholder={`Valor para {{${index}}}`}
                            value={variables[key] || ''}
                            onChange={(e) => setVariables((v) => ({ ...v, [key]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="w-1/2 flex flex-col">
                  <div className="p-4 border-b shrink-0">
                    <p className="text-sm font-medium">Preview</p>
                    <p className="text-xs text-muted-foreground">Como o contato vai receber</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
                    <WhatsAppPreview template={selectedTemplate} variables={variables} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Contacts */}
            {step === 'contacts' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b shrink-0">
                  <Tabs value={contactSource} onValueChange={(v) => setContactSource(v as 'contacts' | 'spreadsheet')}>
                    <TabsList>
                      <TabsTrigger value="contacts" className="gap-2">
                        <Users className="w-4 h-4" />
                        Contatos da plataforma
                      </TabsTrigger>
                      <TabsTrigger value="spreadsheet" className="gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Importar planilha
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {contactSource === 'contacts' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar contato..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <button onClick={toggleAll} className="text-xs text-primary hover:underline whitespace-nowrap">
                        {filteredPlatform.every((c) => c.selected) ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {selectedPlatformContacts.length} selecionados
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {loadingContacts ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredPlatform.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                          <Users className="w-8 h-8 opacity-30" />
                          <p className="text-sm">Nenhum contato encontrado</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredPlatform.map((c) => (
                            <label key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={c.selected}
                                onChange={() => toggleContact(c.id)}
                                className="rounded border-border w-4 h-4 accent-primary"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{c.phone}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {contactSource === 'spreadsheet' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFile}
                    />
                    {spreadsheetContacts.length === 0 ? (
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors w-full max-w-md"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Upload className="w-7 h-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Clique para importar planilha</p>
                          <p className="text-sm text-muted-foreground mt-1">Suporta .xlsx, .xls e .csv</p>
                          <p className="text-xs text-muted-foreground mt-3 text-balance">
                            A planilha deve ter colunas <strong>telefone</strong> (obrigatorio) e <strong>nome</strong> (opcional)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">{spreadsheetContacts.length} contatos importados</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSpreadsheetContacts([])}>
                            <X className="w-4 h-4 mr-1" /> Remover
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Telefone</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {spreadsheetContacts.slice(0, 50).map((c, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">{c.name || '—'}</TableCell>
                                  <TableCell className="text-sm font-mono">{c.phone}</TableCell>
                                </TableRow>
                              ))}
                              {spreadsheetContacts.length > 50 && (
                                <TableRow>
                                  <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-2">
                                    + {spreadsheetContacts.length - 50} contatos adicionais
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
                          <Upload className="w-4 h-4 mr-2" /> Substituir planilha
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Review */}
            {step === 'review' && (
              <div className="h-full overflow-y-auto p-8">
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <h2 className="text-lg font-semibold">Tudo pronto!</h2>
                    <p className="text-sm text-muted-foreground mt-1">Revise os detalhes antes de disparar</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Campanha</span>
                      <span className="font-medium text-sm">{campaignName}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Template</span>
                      <span className="font-medium text-sm">{selectedTemplate?.name}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Fonte</span>
                      <span className="font-medium text-sm">{contactSource === 'contacts' ? 'Plataforma' : 'Planilha'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Total de contatos</span>
                      <Badge variant="secondary" className="font-semibold">{finalContacts.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">Custo estimado</span>
                        <span className="text-[10px] text-muted-foreground">(aprox. R$0,083/msg)</span>
                      </div>
                      <span className="font-semibold text-sm">
                        R$ {estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {Object.keys(variables).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Variaveis configuradas</p>
                      {Object.entries(variables).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                          <span className="text-muted-foreground font-mono text-xs">
                            {`{{${key.replace('var', '')}}}`}
                          </span>
                          <span className="font-medium">{value || <span className="text-muted-foreground italic">vazio</span>}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-4 rounded-lg border border-warning/30 bg-warning/5 text-sm">
                    <Clock className="w-4 h-4 text-warning-foreground shrink-0 mt-0.5" />
                    <p className="text-warning-foreground">
                      Ao confirmar, as mensagens serao enviadas imediatamente para todos os {finalContacts.length} contatos.
                      Esta acao nao pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="border-t px-6 py-4 flex items-center justify-between shrink-0">
            <Button variant="outline" onClick={prev} disabled={stepIndex === 0 || sending}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            <div className="flex items-center gap-3">
              {step !== 'review' ? (
                <Button onClick={next} disabled={!canAdvance()}>
                  Continuar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSend} disabled={sending} className="min-w-32 gap-2">
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Iniciar disparo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
