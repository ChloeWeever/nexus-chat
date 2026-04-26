import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { AppIcon } from '@/components/ui/AppIcon'

export default function ChatWindow() {
  const {
    conversations,
    activeConversationId,
    isStreaming,
    removeMessage,
    setPendingPrompt
  } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const conversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [conversation?.messages.length, conversation?.messages.at(-1)?.content])

  if (!conversation) return <></>

  const visibleMessages = conversation.messages.filter((m) => m.role !== 'system')

  // Find the index of the last assistant message for regenerate
  let lastAssistantIdx = -1
  for (let i = visibleMessages.length - 1; i >= 0; i--) {
    if (visibleMessages[i].role === 'assistant') {
      lastAssistantIdx = i
      break
    }
  }

  const handleRegenerate = () => {
    const msgs = conversation.messages.filter((m) => m.role !== 'system')
    // Last assistant message
    let lastAsstIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { lastAsstIdx = i; break }
    }
    if (lastAsstIdx === -1) return
    const lastAsst = msgs[lastAsstIdx]

    // Last user message before the assistant
    let lastUserMsg = null
    for (let i = lastAsstIdx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserMsg = msgs[i]; break }
    }
    if (!lastUserMsg) return

    // Remove both messages then re-submit via pendingPrompt
    removeMessage(conversation.id, lastAsst.id)
    removeMessage(conversation.id, lastUserMsg.id)
    setPendingPrompt(lastUserMsg.content)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/60 shrink-0">
        <AppIcon className="h-7 w-7 rounded-lg" />
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
        {visibleMessages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRegenerate={
              idx === lastAssistantIdx && !isStreaming && !message.isStreaming
                ? handleRegenerate
                : undefined
            }
          />
        ))}

        {conversation.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AppIcon className="h-10 w-10 rounded-xl opacity-30" />
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={conversation.id} />
    </div>
  )
}
