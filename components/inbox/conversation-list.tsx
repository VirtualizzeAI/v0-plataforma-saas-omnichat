'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/context/app-context'
import type { ConversationWithRelations } from '@/hooks/use-conversations'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  User,
  Users,
} from 'lucide-react'

type FilterType = 'all' | 'mine' | 'unassigned' | 'waiting' | 'closed'

interface ConversationListProps {
  conversations: ConversationWithRelations[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (conversation: ConversationWithRelations) => void
}

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const { member } = useApp()
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesName = conv.contact?.name?.toLowerCase().includes(searchLower)
      const matchesPhone = conv.contact?.phone?.includes(search)
      if (!matchesName && !matchesPhone) return false
    }

    // Status filter
    switch (filter) {
      case 'mine':
        return conv.assigned_to === member?.id && conv.status !== 'closed'
      case 'unassigned':
        return !conv.assigned_to && conv.status !== 'closed'
      case 'waiting':
        return conv.status === 'waiting'
      case 'closed':
        return conv.status === 'closed'
      default:
        return conv.status !== 'closed'
    }
  })

  const getStatusCounts = () => {
    const counts = {
      all: 0,
      mine: 0,
      unassigned: 0,
      waiting: 0,
      closed: 0,
    }

    conversations.forEach((conv) => {
      if (conv.status === 'closed') {
        counts.closed++
      } else {
        counts.all++
        if (conv.assigned_to === member?.id) counts.mine++
        if (!conv.assigned_to) counts.unassigned++
        if (conv.status === 'waiting') counts.waiting++
      }
    })

    return counts
  }

  const counts = getStatusCounts()

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="w-full grid grid-cols-5 h-auto p-1">
            <TabsTrigger value="all" className="text-xs px-2 py-1.5">
              <Users className="h-3 w-3 mr-1" />
              {counts.all}
            </TabsTrigger>
            <TabsTrigger value="mine" className="text-xs px-2 py-1.5">
              <User className="h-3 w-3 mr-1" />
              {counts.mine}
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="text-xs px-2 py-1.5">
              <MessageSquare className="h-3 w-3 mr-1" />
              {counts.unassigned}
            </TabsTrigger>
            <TabsTrigger value="waiting" className="text-xs px-2 py-1.5">
              <Clock className="h-3 w-3 mr-1" />
              {counts.waiting}
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-xs px-2 py-1.5">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {counts.closed}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={cn(
                  'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                  selectedId === conversation.id && 'bg-muted'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.contact?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {conversation.contact?.name ? getInitials(conversation.contact.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {conversation.contact?.name || conversation.contact?.phone}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {conversation.last_message?.content || 'Sem mensagens'}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {conversation.channel && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {conversation.channel === 'whatsapp' ? 'WhatsApp' : conversation.channel}
                        </Badge>
                      )}
                      {conversation.sector && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5"
                          style={{ backgroundColor: conversation.sector.color + '20', color: conversation.sector.color }}
                        >
                          {conversation.sector.name}
                        </Badge>
                      )}
                      {conversation.assigned_member && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {conversation.assigned_member.name.split(' ')[0]}
                        </Badge>
                      )}
                      {conversation.tags?.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-[10px] h-5"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
