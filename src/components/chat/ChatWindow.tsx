import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { Bot } from 'lucide-react'

export default function ChatWindow(): JSX.Element {
  const { conversations, activeConversationId } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const conversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [conversation?.messages.length, conversation?.messages.at(-1)?.content])

  if (!conversation) return <></>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/60 shrink-0">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium text-sm text-foreground truncate flex-1">
          {conversation.title}
        </span>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {conversation.messages
          .filter((m) => m.role !== 'system')
          .map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

        {conversation.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Bot className="h-10 w-10 opacity-20" />
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={conversation.id} />
    </div>
  )
}
