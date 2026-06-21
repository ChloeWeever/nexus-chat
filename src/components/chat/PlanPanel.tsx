import { CheckCircle2, Circle, Loader2, XCircle, X, ListTodo, Globe, Terminal, Puzzle, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanStep } from '@/types'

interface PlanPanelProps {
  steps: PlanStep[]
  onClose: () => void
}

function StepIcon({ step }: { step: PlanStep }) {
  if (step.status === 'done') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  }
  if (step.status === 'error') {
    return <XCircle className="h-4 w-4 shrink-0 text-destructive" />
  }
  if (step.status === 'in_progress') {
    // Show tool-specific animated icon
    if (step.toolName === 'web_search') {
      return <Globe className="h-4 w-4 shrink-0 text-primary animate-pulse" />
    }
    if (step.toolName === 'run_code') {
      return <Terminal className="h-4 w-4 shrink-0 text-primary animate-pulse" />
    }
    if (step.toolName === 'use_skill') {
      return <Puzzle className="h-4 w-4 shrink-0 text-primary animate-pulse" />
    }
    return <Loader2 className="h-4 w-4 shrink-0 text-primary animate-spin" />
  }
  // pending — show faint tool icon if known, else circle
  if (step.toolName === 'web_search') {
    return <Globe className="h-4 w-4 shrink-0 text-muted-foreground/30" />
  }
  if (step.toolName === 'run_code') {
    return <Terminal className="h-4 w-4 shrink-0 text-muted-foreground/30" />
  }
  if (step.toolName === 'use_skill') {
    return <Puzzle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
}

export default function PlanPanel({ steps, onClose }: PlanPanelProps) {
  const doneCount = steps.filter((s) => s.status === 'done' || s.status === 'error').length
  const total = steps.length

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">Steps</span>
          {total > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {doneCount}/{total}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Close steps panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 py-2 shrink-0">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 px-1 py-2">Waiting for steps…</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {steps.map((step, idx) => (
              <li
                key={step.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-300',
                  step.status === 'in_progress' && 'bg-primary/5 border border-primary/15',
                  step.status === 'error' && 'bg-destructive/5 border border-destructive/15',
                  (step.status === 'done' || step.status === 'pending') && 'border border-transparent'
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <StepIcon step={step} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-muted-foreground/40 shrink-0">
                      {idx + 1}.
                    </span>
                    <span
                      className={cn(
                        'text-sm leading-snug',
                        step.status === 'done' && 'text-muted-foreground',
                        step.status === 'in_progress' && 'text-foreground font-medium',
                        step.status === 'pending' && 'text-foreground/60',
                        step.status === 'error' && 'text-destructive'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.sublabel && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          step.status === 'done' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                          step.status === 'error' && 'bg-destructive/10 text-destructive',
                          step.status === 'in_progress' && 'bg-primary/10 text-primary'
                        )}
                      >
                        {step.sublabel}
                      </span>
                    )}
                  </div>
                  {step.detail && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/50 leading-snug pl-4 truncate">
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}

            {/* Writing response step is added dynamically, but show a hint while streaming */}
          </ol>
        )}
      </div>
    </div>
  )
}
