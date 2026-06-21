import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/store'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import PlanPanel from './PlanPanel'
import { AppIcon } from '@/components/ui/AppIcon'

const MIN_CHAT_PCT = 40
const MAX_CHAT_PCT = 85
const DEFAULT_CHAT_PCT = 65

export default function ChatWindow() {
  const {
    conversations,
    activeConversationId,
    isStreaming,
    removeMessage,
    setPendingPrompt
  } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chatWidthPct, setChatWidthPct] = useState(DEFAULT_CHAT_PCT)
  const [planClosed, setPlanClosed] = useState(false)
  const dragRef = useRef<{ startX: number; startPct: number } | null>(null)

  const conversation = conversations.find((c) => c.id === activeConversationId)

  // Auto-open plan panel whenever a new plan appears; reset closed state per conversation
  useEffect(() => {
    setPlanClosed(false)
  }, [activeConversationId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [conversation?.messages.length, conversation?.messages.at(-1)?.content])

  // Drag-to-resize divider
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startPct: chatWidthPct }

    const onMove = (ev: MouseEvent) => {
      const container = containerRef.current
      if (!container || !dragRef.current) return
      const totalWidth = container.clientWidth
      const dx = ev.clientX - dragRef.current.startX
      const deltaPct = (dx / totalWidth) * 100
      const newPct = Math.min(MAX_CHAT_PCT, Math.max(MIN_CHAT_PCT, dragRef.current.startPct + deltaPct))
      setChatWidthPct(newPct)
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [chatWidthPct])

  if (!conversation) return <></>

  const visibleMessages = conversation.messages.filter((m) => m.role !== 'system')

  // Find last assistant message that has planSteps (active plan)
  let activePlanSteps = null
  for (let i = visibleMessages.length - 1; i >= 0; i--) {
    const msg = visibleMessages[i]
    if (msg.role === 'assistant' && msg.planSteps && msg.planSteps.length > 0) {
      activePlanSteps = msg.planSteps
      break
    }
  }

  const showPanel = !planClosed && activePlanSteps !== null

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
    let lastAsstIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { lastAsstIdx = i; break }
    }
    if (lastAsstIdx === -1) return
    const lastAsst = msgs[lastAsstIdx]

    let lastUserMsg = null
    for (let i = lastAsstIdx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserMsg = msgs[i]; break }
    }
    if (!lastUserMsg) return

    removeMessage(conversation.id, lastAsst.id)
    removeMessage(conversation.id, lastUserMsg.id)
    setPendingPrompt(lastUserMsg.content)
  }

  const handleClosePanel = () => {
    setPlanClosed(true)
    setChatWidthPct(DEFAULT_CHAT_PCT)
  }

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Chat column */}
      <div
        className="flex flex-col min-w-0 h-full"
        style={{ width: showPanel ? `${chatWidthPct}%` : '100%' }}
      >
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

      {/* Drag divider */}
      {showPanel && (
        <div
          className="w-1 cursor-col-resize shrink-0 bg-border/40 hover:bg-primary/40 active:bg-primary/60 transition-colors"
          onMouseDown={startDrag}
        />
      )}

      {/* Plan panel */}
      {showPanel && activePlanSteps && (
        <div
          className="flex flex-col min-w-0 h-full border-l border-border/60 overflow-hidden"
          style={{ width: `${100 - chatWidthPct}%` }}
        >
          <PlanPanel steps={activePlanSteps} onClose={handleClosePanel} />
        </div>
      )}
    </div>
  )
}
