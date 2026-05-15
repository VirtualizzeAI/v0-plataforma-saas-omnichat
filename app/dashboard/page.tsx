'use client'

import { useState } from 'react'
import { useConversations, type ConversationWithRelations } from '@/hooks/use-conversations'
import { ConversationList } from '@/components/inbox/conversation-list'
import { ChatHeader } from '@/components/inbox/chat-header'
import { ChatView } from '@/components/inbox/chat-view'
import { MessageSquare } from 'lucide-react'

export default function InboxPage() {
  const { conversations, isLoading, refresh } = useConversations()
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithRelations | null>(null)

  const handleSelectConversation = (conversation: ConversationWithRelations) => {
    setSelectedConversation(conversation)
  }

  const handleUpdate = () => {
    refresh()
    // Also refresh the selected conversation
    if (selectedConversation) {
      const updated = conversations.find((c) => c.id === selectedConversation.id)
      if (updated) {
        setSelectedConversation(updated)
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Conversation list */}
      <div className="w-80 lg:w-96 border-r flex-shrink-0 bg-card">
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          selectedId={selectedConversation?.id || null}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              onUpdate={handleUpdate}
            />
            <div className="flex-1 overflow-hidden">
              <ChatView conversation={selectedConversation} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
            <p className="text-sm">Escolha uma conversa da lista para comecar</p>
          </div>
        )}
      </div>
    </div>
  )
}
