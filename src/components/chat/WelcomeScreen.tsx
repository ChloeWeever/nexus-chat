import { Bot, Sparkles, BarChart2, Table2, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store'

const EXAMPLE_PROMPTS = [
  {
    icon: <BarChart2 className="h-4 w-4" />,
    label: 'Visualize sales data',
    prompt: 'Show me a bar chart of monthly sales: Jan 1200, Feb 1800, Mar 1500, Apr 2100, May 1900, Jun 2400'
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: 'Growth trend',
    prompt: 'Create a line chart showing user growth over the past 6 months starting from 500 users'
  },
  {
    icon: <Table2 className="h-4 w-4" />,
    label: 'Compare data in a table',
    prompt: 'Make a comparison table of 5 programming languages with columns: name, typing, performance, use case'
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    label: 'Key metrics dashboard',
    prompt: 'Show key SaaS metrics: MRR $45K (+12%), Churn 2.3% (-0.5%), NPS 68 (+5), Active users 1240 (+8%)'
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
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
