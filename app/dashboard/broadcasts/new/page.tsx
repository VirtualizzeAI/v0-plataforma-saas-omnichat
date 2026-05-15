'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context/app-context'
import { WaTemplate, Contact } from '@/lib/types'
import { WhatsAppPreview } from '@/components/broadcasts/whatsapp-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  RefreshCw,
  Upload,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ArrowLeft,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

type Step = 'info' | 'template' | 'contacts' | 'review'

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: 'info', label: 'Campanha', description: 'Nome da campanha' },
  { id: 'template', label: 'Template', description: 'Selecionar e configurar' },
  { id: 'contacts', label: 'Contatos', description: 'Destinatarios' },
  { id: 'review', label: 'Revisar', description: 'Confirmar envio' },
]

// Campos fixos dos contatos disponiveis para mapeamento
const CONTACT_FIELDS = [
  { value: 'name', label: 'Nome' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Endereco' },
]

type SpreadsheetRow = Record<string, string>
type PlatformContact = Contact & { selected: boolean }
type VariableMapping = {
  source: 'fixed' | 'field' | 'column'
  value: string // fixed value, field name, or column name
}

export default function NewBroadcastPage() {
  const router = useRouter()
  const { member } = useApp()

  const [step, setStep] = useState<Step>('info')

  // Step 1 - Campanha
  const [campaignName, setCampaignName] = useState('')

  // Step 2 - Template
  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [variableMappings, setVariableMappings] = useState<Record<string, VariableMapping>>({})

  // Step 3 - Contatos
  const [contactSource, setContactSource] = useState<'platform' | 'spreadsheet'>('platform')
  const [platformContacts, setPlatformContacts] = useState<PlatformContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetRow[]>([])
  const [spreadsheetColumns, setSpreadsheetColumns] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 4 - Review / Sending
  const [sending, setSending] = useState(false)

  // Load templates and contacts on mount
  useEffect(() => {
    fetchTemplates()
    fetchPlatformContacts()
  }, [])

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
    // Initialize variable mappings
    const variables = extractVariables(tpl)
    const mappings: Record<string, VariableMapping> = {}
    variables.forEach((v) => {
      mappings[v] = { source: 'fixed', value: '' }
    })
    setVariableMappings(mappings)
  }

  function extractVariables(template: WaTemplate): string[] {
    const body = template.components.find((c) => c.type === 'BODY')?.text || ''
    const header = template.components.find((c) => c.type === 'HEADER')?.text || ''
    const all = body + ' ' + header
    const matches = all.match(/\{\{(\d+)\}\}/g) || []
    return [...new Set(matches)].sort()
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
        .select('*')
        .order('name')
      setPlatformContacts((data || []).map((c) => ({ ...c, selected: false })))
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

  const filteredPlatform = platformContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch)
  )
  const selectedPlatformContacts = platformContacts.filter((c) => c.selected)

  // ─── Spreadsheet ──────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: SpreadsheetRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (rows.length === 0) {
          toast.error('Planilha vazia')
          return
        }
        const cols = Object.keys(rows[0])
        setSpreadsheetColumns(cols)
        setSpreadsheetData(rows)
        toast.success(`${rows.length} linhas importadas`)
      } catch {
        toast.error('Erro ao ler planilha. Verifique o formato.')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function clearSpreadsheet() {
    setSpreadsheetData([])
    setSpreadsheetColumns([])
  }

  // ─── Variable mapping options ─────────────────────────────
  const mappingOptions = useMemo(() => {
    const options: { value: string; label: string; group: string }[] = []

    // Fixed value option
    options.push({ value: '__fixed__', label: 'Valor fixo', group: 'Geral' })

    // Platform contact fields
    if (contactSource === 'platform') {
      CONTACT_FIELDS.forEach((f) => {
        options.push({ value: `field:${f.value}`, label: f.label, group: 'Campos do contato' })
      })
    }

    // Spreadsheet columns
    if (contactSource === 'spreadsheet' && spreadsheetColumns.length > 0) {
      spreadsheetColumns.forEach((col) => {
        options.push({ value: `column:${col}`, label: col, group: 'Colunas da planilha' })
      })
    }

    return options
  }, [contactSource, spreadsheetColumns])

  function updateMapping(varKey: string, optionValue: string) {
    if (optionValue === '__fixed__') {
      setVariableMappings((prev) => ({
        ...prev,
        [varKey]: { source: 'fixed', value: '' },
      }))
    } else if (optionValue.startsWith('field:')) {
      setVariableMappings((prev) => ({
        ...prev,
        [varKey]: { source: 'field', value: optionValue.replace('field:', '') },
      }))
    } else if (optionValue.startsWith('column:')) {
      setVariableMappings((prev) => ({
        ...prev,
        [varKey]: { source: 'column', value: optionValue.replace('column:', '') },
      }))
    }
  }

  function updateFixedValue(varKey: string, value: string) {
    setVariableMappings((prev) => ({
      ...prev,
      [varKey]: { ...prev[varKey], value },
    }))
  }

  // Generate preview variables (using first contact/row as example)
  const previewVariables = useMemo(() => {
    const vars: Record<string, string> = {}
    const firstContact = selectedPlatformContacts[0]
    const firstRow = spreadsheetData[0]

    Object.entries(variableMappings).forEach(([key, mapping]) => {
      const idx = parseInt(key.replace(/[{}]/g, ''))
      if (mapping.source === 'fixed') {
        vars[`var${idx}`] = mapping.value || `{{${idx}}}`
      } else if (mapping.source === 'field' && firstContact) {
        vars[`var${idx}`] = (firstContact as Record<string, unknown>)[mapping.value] as string || `{{${idx}}}`
      } else if (mapping.source === 'column' && firstRow) {
        vars[`var${idx}`] = firstRow[mapping.value] || `{{${idx}}}`
      } else {
        vars[`var${idx}`] = `{{${idx}}}`
      }
    })

    return vars
  }, [variableMappings, selectedPlatformContacts, spreadsheetData])

  // ─── Final data ───────────────────────────────────────────
  const finalContacts =
    contactSource === 'spreadsheet'
      ? spreadsheetData.map((row) => ({
          phone: row['telefone'] || row['phone'] || row['Telefone'] || row['Phone'] || '',
          name: row['nome'] || row['name'] || row['Nome'] || row['Name'] || '',
          variables: buildRowVariables(row),
        }))
      : selectedPlatformContacts.map((c) => ({
          phone: c.phone,
          name: c.name,
          contact_id: c.id,
          variables: buildContactVariables(c),
        }))

  function buildRowVariables(row: SpreadsheetRow): Record<string, string> {
    const vars: Record<string, string> = {}
    Object.entries(variableMappings).forEach(([key, mapping]) => {
      const idx = key.replace(/[{}]/g, '')
      if (mapping.source === 'fixed') {
        vars[idx] = mapping.value
      } else if (mapping.source === 'column') {
        vars[idx] = row[mapping.value] || ''
      }
    })
    return vars
  }

  function buildContactVariables(contact: PlatformContact): Record<string, string> {
    const vars: Record<string, string> = {}
    Object.entries(variableMappings).forEach(([key, mapping]) => {
      const idx = key.replace(/[{}]/g, '')
      if (mapping.source === 'fixed') {
        vars[idx] = mapping.value
      } else if (mapping.source === 'field') {
        vars[idx] = (contact as Record<string, unknown>)[mapping.value] as string || ''
      }
    })
    return vars
  }

  const estimatedCost = finalContacts.length * 0.083

  // ─── Navigation ───────────────────────────────────────────
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  function canAdvance(): boolean {
    if (step === 'info') return campaignName.trim().length > 0
    if (step === 'template') return selectedTemplate !== null
    if (step === 'contacts') return finalContacts.filter((c) => c.phone).length > 0
    return true
  }

  function next() {
    const nextStep = STEPS[stepIndex + 1]
    if (nextStep) setStep(nextStep.id)
  }

  function prev() {
    const prevStep = STEPS[stepIndex - 1]
    if (prevStep) setStep(prevStep.id)
  }

  // ─── Send ─────────────────────────────────────────────────
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
          template_variables: variableMappings,
          source: contactSource === 'platform' ? 'contacts' : 'spreadsheet',
          contacts: finalContacts.filter((c) => c.phone),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Campanha enviada! ${data.sent} mensagens disparadas.`)
      router.push('/dashboard/broadcasts')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar campanha')
    } finally {
      setSending(false)
    }
  }

  const categoryColor: Record<string, string> = {
    MARKETING: 'bg-primary/10 text-primary',
    UTILITY: 'bg-accent/10 text-accent-foreground',
    AUTHENTICATION: 'bg-yellow-500/10 text-yellow-700',
  }

  const variables = selectedTemplate ? extractVariables(selectedTemplate) : []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/broadcasts')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Nova campanha</h1>
              <p className="text-sm text-muted-foreground">Configure e envie mensagens em massa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const done = i < stepIndex
              const active = s.id === step
              return (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => (done || i <= stepIndex) && setStep(s.id)}
                    disabled={i > stepIndex && !done}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : done
                        ? 'text-primary hover:bg-primary/5'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs border-2 ${
                        active
                          ? 'border-primary-foreground/40'
                          : done
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}
                    >
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* STEP 1: Info */}
        {step === 'info' && (
          <div className="max-w-lg mx-auto">
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Send className="w-7 h-7 text-primary" />
                </div>
                <CardTitle>Nome da campanha</CardTitle>
                <CardDescription>Identifique sua campanha para encontra-la depois</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Nome</Label>
                  <Input
                    id="campaign-name"
                    placeholder="Ex: Promocao de maio, Reativacao de clientes..."
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canAdvance() && next()}
                    autoFocus
                    className="text-base h-12"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: Template */}
        {step === 'template' && (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Template list + mapping */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Selecionar template</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTemplates(true)}
                      disabled={loadingTemplates}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingTemplates ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar template..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                        <AlertCircle className="w-8 h-8 opacity-30" />
                        <p className="text-sm text-center">
                          {templates.length === 0
                            ? 'Nenhum template encontrado. Conecte sua WABA e sincronize.'
                            : 'Nenhum template corresponde a busca'}
                        </p>
                      </div>
                    ) : (
                      filteredTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedTemplate?.id === tpl.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{tpl.name}</p>
                                {selectedTemplate?.id === tpl.id && (
                                  <Check className="w-4 h-4 text-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {tpl.components.find((c) => c.type === 'BODY')?.text?.substring(0, 100)}
                              </p>
                            </div>
                            <Badge className={categoryColor[tpl.category] || 'bg-muted'} variant="secondary">
                              {tpl.category}
                            </Badge>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Variable mapping */}
              {selectedTemplate && variables.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Mapear variaveis</CardTitle>
                    <CardDescription>
                      Defina de onde vem cada variavel do template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {variables.map((v) => {
                      const mapping = variableMappings[v]
                      const currentValue =
                        mapping?.source === 'fixed'
                          ? '__fixed__'
                          : mapping?.source === 'field'
                          ? `field:${mapping.value}`
                          : mapping?.source === 'column'
                          ? `column:${mapping.value}`
                          : '__fixed__'

                      return (
                        <div key={v} className="space-y-2">
                          <Label className="text-sm font-medium">
                            Variavel {v}
                          </Label>
                          <div className="flex gap-2">
                            <Select value={currentValue} onValueChange={(val) => updateMapping(v, val)}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {mappingOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {mapping?.source === 'fixed' && (
                              <Input
                                placeholder="Digite o valor..."
                                value={mapping.value}
                                onChange={(e) => updateFixedValue(v, e.target.value)}
                                className="flex-1"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <CardTitle className="text-base">Preview da mensagem</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-muted/10 min-h-[400px]">
                  <WhatsAppPreview template={selectedTemplate} variables={previewVariables} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* STEP 3: Contacts */}
        {step === 'contacts' && (
          <div className="space-y-6">
            {/* Source tabs */}
            <div className="flex gap-4">
              <button
                onClick={() => setContactSource('platform')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  contactSource === 'platform'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Users className={`w-8 h-8 mb-2 ${contactSource === 'platform' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium">Contatos da plataforma</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione contatos ja cadastrados
                </p>
              </button>
              <button
                onClick={() => setContactSource('spreadsheet')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  contactSource === 'spreadsheet'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <FileSpreadsheet className={`w-8 h-8 mb-2 ${contactSource === 'spreadsheet' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium">Importar planilha</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Importe contatos de um arquivo .xlsx ou .csv
                </p>
              </button>
            </div>

            {/* Platform contacts */}
            {contactSource === 'platform' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Selecionar contatos</CardTitle>
                      <CardDescription>
                        {selectedPlatformContacts.length} de {platformContacts.length} selecionados
                      </CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar contato..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : platformContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                      <Users className="w-10 h-10 opacity-30" />
                      <p className="text-sm">Nenhum contato cadastrado</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={filteredPlatform.length > 0 && filteredPlatform.every((c) => c.selected)}
                              onCheckedChange={toggleAll}
                            />
                          </TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlatform.slice(0, 100).map((c) => (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer"
                            onClick={() => toggleContact(c.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={c.selected}
                                onCheckedChange={() => toggleContact(c.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.phone}</TableCell>
                            <TableCell className="text-muted-foreground">{c.email || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Spreadsheet */}
            {contactSource === 'spreadsheet' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Importar planilha</CardTitle>
                      <CardDescription>
                        {spreadsheetData.length > 0
                          ? `${spreadsheetData.length} contatos importados`
                          : 'Arraste ou selecione um arquivo .xlsx ou .csv'}
                      </CardDescription>
                    </div>
                    {spreadsheetData.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearSpreadsheet}>
                        <X className="w-4 h-4 mr-2" />
                        Limpar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {spreadsheetData.length === 0 ? (
                    <div
                      className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-1">Clique para selecionar um arquivo</p>
                      <p className="text-sm text-muted-foreground">
                        Suporta .xlsx e .csv com colunas telefone/phone e nome/name
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFile}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">Colunas encontradas:</p>
                        <div className="flex flex-wrap gap-2">
                          {spreadsheetColumns.map((col) => (
                            <Badge key={col} variant="secondary">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {spreadsheetColumns.slice(0, 5).map((col) => (
                              <TableHead key={col}>{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {spreadsheetData.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              {spreadsheetColumns.slice(0, 5).map((col) => (
                                <TableCell key={col}>{row[col] || '-'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {spreadsheetData.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          E mais {spreadsheetData.length - 5} linhas...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 'review' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-primary" />
                </div>
                <CardTitle>Revisar campanha</CardTitle>
                <CardDescription>Confira os detalhes antes de enviar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome da campanha</p>
                    <p className="font-medium">{campaignName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="font-medium">{selectedTemplate?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de contatos</p>
                    <p className="font-medium">{finalContacts.filter((c) => c.phone).length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo estimado</p>
                    <p className="font-medium">R$ {estimatedCost.toFixed(2)}</p>
                  </div>
                </div>

                {variables.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Mapeamento de variaveis</p>
                      <div className="space-y-1">
                        {Object.entries(variableMappings).map(([key, mapping]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="font-mono bg-muted px-2 py-0.5 rounded">{key}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {mapping.source === 'fixed'
                                ? `Valor fixo: "${mapping.value}"`
                                : mapping.source === 'field'
                                ? `Campo: ${CONTACT_FIELDS.find((f) => f.value === mapping.value)?.label}`
                                : `Coluna: ${mapping.value}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Atencao</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Ao confirmar, as mensagens serao enviadas imediatamente para todos os
                        contatos selecionados. Esta acao nao pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={prev} disabled={stepIndex === 0}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {step === 'review' ? (
            <Button onClick={handleSend} disabled={sending || !canAdvance()} className="gap-2">
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Enviando...' : 'Iniciar envios'}
            </Button>
          ) : (
            <Button onClick={next} disabled={!canAdvance()}>
              Continuar
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Spacer for fixed footer */}
      <div className="h-20" />
    </div>
  )
}
