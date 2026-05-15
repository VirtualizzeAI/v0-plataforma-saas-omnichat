'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/app-context'
import type { Conversation, Contact, Member, Sector, Tag, Message } from '@/lib/types'

export interface ConversationWithRelations extends Conversation {
  contact: Contact
  assigned_member: Member | null
  sector: Sector | null
  tags: Tag[]
  last_message: Message | null
}

export function useConversations() {
  const { company } = useApp()
  const [conversations, setConversations] = useState<ConversationWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!company?.id) return

    try {
      const supabase = createClient()
      
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*),
          assigned_member:members(*),
          sector:sectors(*),
          conversation_tags(tag:tags(*))
        `)
        .eq('company_id', company.id)
        .order('last_message_at', { ascending: false })

      if (fetchError) throw fetchError

      // Fetch last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...conv,
            tags: conv.conversation_tags?.map((ct: { tag: Tag }) => ct.tag) || [],
            last_message: lastMessage || null,
          } as ConversationWithRelations
        })
      )

      setConversations(conversationsWithMessages)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError('Erro ao carregar conversas')
    } finally {
      setIsLoading(false)
    }
  }, [company?.id])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return

    const supabase = createClient()

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [company?.id, fetchConversations])

  return {
    conversations,
    isLoading,
    error,
    refresh: fetchConversations,
  }
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Erro ao carregar mensagens')
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const sendMessage = useCallback(async (content: string, memberId: string) => {
    if (!conversationId || !content.trim()) return

    const supabase = createClient()

    const { error: sendError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: memberId,
        content: content.trim(),
        message_type: 'text',
        status: 'sent',
      })

    if (sendError) {
      console.error('Error sending message:', sendError)
      throw sendError
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
  }, [conversationId])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refresh: fetchMessages,
  }
}
