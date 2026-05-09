import { Mail, Lightbulb, Code2, CalendarDays } from 'lucide-react'
import { useAppStore } from '@/store'
import { AppIcon } from '@/components/ui/AppIcon'

const EXAMPLE_PROMPTS = [
  {
    icon: <Mail className="h-4 w-4" />,
    label: 'Draft a work email',
    prompt: 'Write a professional email to postpone a meeting to next week due to a scheduling conflict. Keep it concise and polite.'
  },
  {
    icon: <Lightbulb className="h-4 w-4" />,
    label: 'Explain something clearly',
    prompt: 'Explain how large language models work in simple terms, as if I have no AI background.'
  },
  {
    icon: <Code2 className="h-4 w-4" />,
    label: 'Review my code',
    prompt: 'Review this Python function and suggest improvements for readability and performance:\n\ndef get_duplicates(lst):\n    seen = []\n    dups = []\n    for x in lst:\n        if x in seen: dups.append(x)\n        seen.append(x)\n    return dups'
  },
  {
    icon: <CalendarDays className="h-4 w-4" />,
    label: 'Make a learning plan',
    prompt: 'Create a 30-day plan to learn TypeScript, assuming I already know JavaScript. Include daily topics and mini-projects.'
  }
]

export default function WelcomeScreen(): JSX.Element {
  const { createConversation, setActiveConversation, setPendingPrompt } = useAppStore()

  const handlePrompt = (prompt: string) => {
    setPendingPrompt(prompt)
    const id = createConversation()
    setActiveConversation(id)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3">
        <AppIcon className="h-14 w-14 rounded-2xl" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nexus Chat</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI assistant with rich data visualization
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
        {EXAMPLE_PROMPTS.map((item) => (
          <button
            key={item.label}
            onClick={() => handlePrompt(item.prompt)}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left
              hover:bg-muted/40 hover:border-primary/30 transition-all group"
          >
            <span className="mt-0.5 text-primary/70 group-hover:text-primary transition-colors shrink-0">
              {item.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
