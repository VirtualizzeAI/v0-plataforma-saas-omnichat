'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/context/app-context'
import { useMessages } from '@/hooks/use-conversations'
import type { ConversationWithRelations } from '@/hooks/use-conversations'
import type { Message } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ImageIcon,
  FileText,
  Mic,
  Video,
} from 'lucide-react'

interface ChatViewProps {
  conversation: ConversationWithRelations
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'sent':
        return <Check className="h-3 w-3" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  const getMessageTypeIcon = () => {
    switch (message.message_type) {
      case 'image':
        return <ImageIcon className="h-4 w-4 mr-2" />
      case 'document':
        return <FileText className="h-4 w-4 mr-2" />
      case 'audio':
        return <Mic className="h-4 w-4 mr-2" />
      case 'video':
        return <Video className="h-4 w-4 mr-2" />
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[80%]',
        isOwn ? 'ml-auto flex-row-reverse' : ''
      )}
    >
      <div
        className={cn(
          'rounded-2xl px-4 py-2 text-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {message.message_type !== 'text' && (
          <div className="flex items-center text-xs opacity-70 mb-1">
            {getMessageTypeIcon()}
            <span className="capitalize">{message.message_type}</span>
          </div>
        )}
        
        {message.media_url && (
          <div className="mb-2">
            {message.message_type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.media_url}
                alt="Imagem"
                className="rounded-lg max-w-full h-auto"
              />
            ) : (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver arquivo
              </a>
            )}
          </div>
        )}
        
        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        
        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-[10px]',
            isOwn ? 'justify-end opacity-70' : 'opacity-50'
          )}
        >
          <span>
            {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
          </span>
          {isOwn && getStatusIcon()}
        </div>
      </div>
    </div>
  )
}

export function ChatView({ conversation }: ChatViewProps) {
  const { member } = useApp()
  const { messages, isLoading, sendMessage } = useMessages(conversation.id)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !member?.id) return

    setIsSending(true)
    try {
      await sendMessage(newMessage, member.id)
      setNewMessage('')
      textareaRef.current?.focus()
    } catch {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-end' : '')}>
              <Skeleton className={cn('h-16 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-64')} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              <div className="flex items-center justify-center my-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {format(new Date(date), "d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <div className="space-y-3">
                {dayMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender_type === 'agent'}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs">Envie a primeira mensagem!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="min-h-[44px] max-h-32 resize-none pr-12"
              rows={1}
              disabled={isSending}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="h-11 w-11"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
