'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/app-context'
import type { ConversationWithRelations } from '@/hooks/use-conversations'
import type { Member, Sector, Tag } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  User,
  Users,
  Tag as TagIcon,
  StickyNote,
  CheckCircle2,
  Clock,
  X,
  Plus,
  Phone,
  Mail,
} from 'lucide-react'

interface ChatHeaderProps {
  conversation: ConversationWithRelations
  onUpdate: () => void
}

interface Note {
  id: string
  content: string
  created_at: string
  member: Member
}

export function ChatHeader({ conversation, onUpdate }: ChatHeaderProps) {
  const { company, member: currentMember } = useApp()
  const [members, setMembers] = useState<Member[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)

  // Fetch members, sectors, and tags
  useEffect(() => {
    if (!company?.id) return

    const supabase = createClient()

    const fetchData = async () => {
      const [membersRes, sectorsRes, tagsRes] = await Promise.all([
        supabase.from('members').select('*').eq('company_id', company.id).eq('is_active', true),
        supabase.from('sectors').select('*').eq('company_id', company.id),
        supabase.from('tags').select('*').eq('company_id', company.id),
      ])

      if (membersRes.data) setMembers(membersRes.data)
      if (sectorsRes.data) setSectors(sectorsRes.data)
      if (tagsRes.data) setTags(tagsRes.data)
    }

    fetchData()
  }, [company?.id])

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('notes')
        .select('*, member:members(*)')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })

      if (data) setNotes(data as Note[])
    }

    fetchNotes()
  }, [conversation.id])

  const handleAssignMember = async (memberId: string | null) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to: memberId })
      .eq('id', conversation.id)

    if (error) {
      toast.error('Erro ao atribuir atendente')
      return
    }

    toast.success(memberId ? 'Atendente atribuido' : 'Atendente removido')
    onUpdate()
  }

  const handleAssignSector = async (sectorId: string | null) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('conversations')
      .update({ sector_id: sectorId })
      .eq('id', conversation.id)

    if (error) {
      toast.error('Erro ao atribuir setor')
      return
    }

    toast.success(sectorId ? 'Setor atribuido' : 'Setor removido')
    onUpdate()
  }

  const handleToggleTag = async (tagId: string, isSelected: boolean) => {
    const supabase = createClient()

    if (isSelected) {
      const { error } = await supabase
        .from('conversation_tags')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('tag_id', tagId)

      if (error) {
        toast.error('Erro ao remover tag')
        return
      }
    } else {
      const { error } = await supabase
        .from('conversation_tags')
        .insert({ conversation_id: conversation.id, tag_id: tagId })

      if (error) {
        toast.error('Erro ao adicionar tag')
        return
      }
    }

    onUpdate()
  }

  const handleStatusChange = async (status: 'open' | 'waiting' | 'closed') => {
    const supabase = createClient()
    const { error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversation.id)

    if (error) {
      toast.error('Erro ao alterar status')
      return
    }

    toast.success(
      status === 'closed' ? 'Conversa finalizada' :
      status === 'waiting' ? 'Aguardando resposta' :
      'Conversa reaberta'
    )
    onUpdate()
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentMember?.id) return

    setIsAddingNote(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('notes')
      .insert({
        conversation_id: conversation.id,
        member_id: currentMember.id,
        content: newNote.trim(),
      })
      .select('*, member:members(*)')
      .single()

    if (error) {
      toast.error('Erro ao adicionar nota')
      setIsAddingNote(false)
      return
    }

    setNotes([data as Note, ...notes])
    setNewNote('')
    setIsAddingNote(false)
    toast.success('Nota adicionada')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const selectedTagIds = conversation.tags?.map((t) => t.id) || []

  return (
    <div className="border-b bg-card">
      <div className="flex items-center justify-between p-4">
        {/* Contact info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contact?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.contact?.name ? getInitials(conversation.contact.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">
              {conversation.contact?.name || conversation.contact?.phone}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {conversation.contact?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {conversation.contact.phone}
                </span>
              )}
              {conversation.contact?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {conversation.contact.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Assign member */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                {conversation.assigned_member?.name.split(' ')[0] || 'Atribuir'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Atribuir atendente</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAssignMember(null)}>
                <X className="h-4 w-4 mr-2" />
                Remover atribuicao
              </DropdownMenuItem>
              {members.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => handleAssignMember(m.id)}
                >
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  {m.name}
                  {conversation.assigned_to === m.id && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign sector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                {conversation.sector?.name || 'Setor'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Atribuir setor</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAssignSector(null)}>
                <X className="h-4 w-4 mr-2" />
                Remover setor
              </DropdownMenuItem>
              {sectors.map((sector) => (
                <DropdownMenuItem
                  key={sector.id}
                  onClick={() => handleAssignSector(sector.id)}
                >
                  <span
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: sector.color }}
                  />
                  {sector.name}
                  {conversation.sector_id === sector.id && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tags */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <TagIcon className="h-4 w-4 mr-2" />
                Tags
                {selectedTagIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {selectedTagIds.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Etiquetas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => handleToggleTag(tag.id, selectedTagIds.includes(tag.id))}
                >
                  <span
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notes */}
          <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <StickyNote className="h-4 w-4 mr-2" />
                Notas
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {notes.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notas internas</DialogTitle>
                <DialogDescription>
                  Notas visiveis apenas para a equipe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar nota..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAddingNote}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar nota
                </Button>
                
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg bg-muted text-sm">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{note.member?.name}</span>
                          <span>
                            {new Date(note.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma nota ainda
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={conversation.status === 'closed' ? 'secondary' : 'default'}
                size="sm"
              >
                {conversation.status === 'closed' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizado
                  </>
                ) : conversation.status === 'waiting' ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Aguardando
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizar
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('open')}>
                Aberta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('waiting')}>
                Aguardando
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                Finalizada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tags display */}
      {conversation.tags && conversation.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {conversation.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
