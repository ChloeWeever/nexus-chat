import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Settings, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store'
import type { Conversation } from '@/types'
import { cn } from '@/lib/utils'
import SettingsSheet from '@/components/settings/SettingsSheet'
import { AppIcon } from '@/components/ui/AppIcon'

export default function Sidebar(): JSX.Element {
  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    setActiveConversation
  } = useAppStore()

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleNew = () => {
    const id = createConversation()
    setActiveConversation(id)
  }

  const grouped = groupByDate(conversations)

  return (
    <>
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-muted/20">
        {/* Logo / title bar */}
        <div className="flex items-center gap-2.5 px-4 py-4 drag-region">
          <AppIcon className="h-7 w-7 rounded-lg shrink-0 no-drag" />
          <span className="font-semibold text-sm tracking-tight">Nexus Chat</span>
        </div>

        {/* New chat button */}
        <div className="px-3 pb-2">
          <button
            onClick={handleNew}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/80
              px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40
              hover:bg-primary/5 transition-all"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pt-8 text-muted-foreground/60">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p className="text-xs text-center">No conversations yet</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, convs]) => (
              <div key={group} className="mb-3">
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {group}
                </p>
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setActiveConversation(conv.id)}
                    className={cn(
                      'group relative flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                      activeConversationId === conv.id
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        activeConversationId === conv.id && 'text-primary'
                      )}
                    />
                    <span className="flex-1 truncate text-xs">{conv.title}</span>

                    {/* Actions on hover */}
                    {hoveredId === conv.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="shrink-0 rounded p-0.5 hover:text-destructive transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Settings button */}
        <div className="border-t border-border/60 p-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5
              text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </button>
        </div>
      </aside>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

function groupByDate(convs: Conversation[]) {
  const now = Date.now()
  const groups: Record<string, typeof convs> = {}

  for (const conv of convs) {
    const diff = now - conv.updatedAt
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    let group: string

    if (days === 0) group = 'Today'
    else if (days === 1) group = 'Yesterday'
    else if (days < 7) group = 'This week'
    else if (days < 30) group = 'This month'
    else group = 'Older'

    if (!groups[group]) groups[group] = []
    groups[group].push(conv)
  }

  return groups
}
