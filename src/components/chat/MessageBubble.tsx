import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, User, Bot, AlertTriangle, Globe, Puzzle, Code, RotateCcw, Loader2, Terminal, ChevronDown, CheckCircle2, Circle, XCircle, BrainCircuit } from 'lucide-react'
import { useState, useRef } from 'react'
import type { Message, TextBlock, ToolUseInfo, PlanStep } from '@/types'
import { cn, formatTime } from '@/lib/utils'
import CardRenderer from '@/components/cards/CardRenderer'
import { useAppStore } from '@/store'

interface MessageBubbleProps {
  message: Message
  onRegenerate?: () => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// Convert a Recharts SVG to a PNG data URL, resolving CSS variables so the
// chart renders correctly outside the app's style context.
async function svgToPng(svgEl: SVGSVGElement): Promise<string> {
  const bbox = svgEl.getBoundingClientRect()
  const w = Math.round(bbox.width)
  const h = Math.round(bbox.height)
  if (w === 0 || h === 0) throw new Error('empty svg')

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))

  // Resolve Tailwind CSS-variable classes used by Recharts
  const cs = getComputedStyle(document.documentElement)
  const border = cs.getPropertyValue('--border').trim()
  const muted = cs.getPropertyValue('--muted-foreground').trim()
  const card = cs.getPropertyValue('--card').trim()

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.textContent =
    `.stroke-border\\/40{stroke:hsl(${border}/0.4)}` +
    `.fill-muted-foreground{fill:hsl(${muted})}`
  clone.prepend(styleEl)

  // White/card-colored background so the chart isn't transparent
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', '100%')
  bg.setAttribute('height', '100%')
  bg.setAttribute('fill', `hsl(${card})`)
  styleEl.insertAdjacentElement('afterend', bg)

  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))

  return new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.fillStyle = `hsl(${card})`
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

// Build the final HTML: markdown text is kept as-is; Recharts SVGs are
// replaced with inline PNG <img> tags so the charts survive outside the app.
async function buildCopyHtml(container: HTMLElement): Promise<string> {
  const clone = container.cloneNode(true) as HTMLElement

  const origSvgs = Array.from(
    container.querySelectorAll<SVGSVGElement>('svg.recharts-surface')
  )
  const clonedContainers = Array.from(
    clone.querySelectorAll('.recharts-responsive-container, .recharts-wrapper')
  )

  await Promise.all(
    origSvgs.map(async (svg, i) => {
      try {
        const png = await svgToPng(svg)
        const imgEl = document.createElement('img')
        imgEl.src = png
        imgEl.style.cssText = 'max-width:100%;display:block;border-radius:8px'
        // Replace the outermost Recharts wrapper div in the clone
        const target = clonedContainers[i * 2] ?? clonedContainers[i]
        target?.parentNode?.replaceChild(imgEl, target)
      } catch {
        // SVG stays as-is on error
      }
    })
  )

  return clone.innerHTML
}

function CopyHtmlButton({ contentRef }: { contentRef: React.RefObject<HTMLDivElement | null> }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied'>('idle')

  const handleCopy = async () => {
    if (!contentRef.current || state === 'copying') return
    setState('copying')
    try {
      const html = await buildCopyHtml(contentRef.current)
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([contentRef.current.innerText ?? ''], { type: 'text/plain' })
          })
        ])
      } catch {
        navigator.clipboard.writeText(contentRef.current.innerText ?? '')
      }
    } finally {
      setState('copied')
      setTimeout(() => setState('idle'), 1500)
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={state === 'copying'}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-50'
      )}
      title="Copy as HTML (charts included)"
    >
      {state === 'copied' ? (
        <><Check className="h-3 w-3" /><span>Copied</span></>
      ) : state === 'copying' ? (
        <><Loader2 className="h-3 w-3 animate-spin" /><span>Copying…</span></>
      ) : (
        <><Code className="h-3 w-3" /><span>Copy HTML</span></>
      )}
    </button>
  )
}

function MarkdownContent({ content, isDark }: { content: string; isDark: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="selectable text-sm leading-relaxed text-foreground"
      components={{
        // ── Headings ──────────────────────────────────────────────────────
        h1({ children }) {
          return <h1 className="text-xl font-bold mt-5 mb-2 text-foreground border-b border-border/60 pb-1.5">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground">{children}</h3>
        },
        h4({ children }) {
          return <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h4>
        },

        // ── Paragraph ─────────────────────────────────────────────────────
        p({ children }) {
          return <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
        },

        // ── Lists ─────────────────────────────────────────────────────────
        ul({ children }) {
          return <ul className="my-2 pl-5 space-y-0.5 list-disc marker:text-muted-foreground/60">{children}</ul>
        },
        ol({ children }) {
          return <ol className="my-2 pl-5 space-y-0.5 list-decimal marker:text-muted-foreground/60">{children}</ol>
        },
        li({ children }) {
          return <li className="leading-relaxed pl-0.5">{children}</li>
        },

        // ── Blockquote ────────────────────────────────────────────────────
        blockquote({ children }) {
          return (
            <blockquote className="my-3 pl-3.5 border-l-2 border-primary/50 text-muted-foreground italic">
              {children}
            </blockquote>
          )
        },

        // ── Horizontal rule ───────────────────────────────────────────────
        hr() {
          return <hr className="my-4 border-border/60" />
        },

        // ── Strong / Em ───────────────────────────────────────────────────
        strong({ children }) {
          return <strong className="font-semibold text-foreground">{children}</strong>
        },
        em({ children }) {
          return <em className="italic text-foreground/90">{children}</em>
        },

        // ── Code ──────────────────────────────────────────────────────────
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const codeStr = String(children).replace(/\n$/, '')
          const isBlock = codeStr.includes('\n') || match

          if (isBlock) {
            return (
              <div className="relative group my-3 rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                <div className="flex items-center justify-between px-3.5 py-2 bg-muted/50 border-b border-border/40">
                  <span className="text-[11px] text-muted-foreground font-mono font-medium tracking-wide uppercase">
                    {match ? match[1] : 'code'}
                  </span>
                  <CopyButton text={codeStr} />
                </div>
                <SyntaxHighlighter
                  style={isDark ? oneDark : oneLight}
                  language={match ? match[1] : 'text'}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '0.8125rem',
                    lineHeight: '1.6',
                    background: 'transparent',
                    padding: '0.875rem 1rem'
                  }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              </div>
            )
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-muted/70 text-foreground font-mono text-[0.8rem] border border-border/30"
              {...props}
            >
              {children}
            </code>
          )
        },

        // ── Table ─────────────────────────────────────────────────────────
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-lg border border-border/60">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className="bg-muted/50">{children}</thead>
        },
        th({ children }) {
          return (
            <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/60">
              {children}
            </th>
          )
        },
        tr({ children }) {
          return <tr className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">{children}</tr>
        },
        td({ children }) {
          return <td className="px-3.5 py-2.5 text-sm align-top">{children}</td>
        },

        // ── Link ──────────────────────────────────────────────────────────
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors"
            >
              {children}
            </a>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const [open, setOpen] = useState(false)
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="mb-3 pb-3 border-b border-border/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left group/think"
      >
        <BrainCircuit className={cn(
          'h-4 w-4 shrink-0 text-violet-400',
          isStreaming && !open && 'animate-pulse'
        )} />
        <span className="text-xs font-medium text-violet-400/80">
          {isStreaming ? 'Thinking…' : `Thought for ${wordCount} words`}
        </span>
        <ChevronDown className={cn(
          'h-3.5 w-3.5 ml-auto text-muted-foreground/40 transition-transform',
          'opacity-0 group-hover/think:opacity-100',
          open && 'rotate-180 opacity-100'
        )} />
      </button>
      {open && (
        <div className="mt-2 pl-6">
          <pre className={cn(
            'text-xs font-mono text-muted-foreground/70 whitespace-pre-wrap leading-relaxed',
            'max-h-72 overflow-y-auto'
          )}>
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}

function StepIcon({ step }: { step: PlanStep }) {
  const { status, toolName } = step

  if (status === 'error') return <XCircle className="h-[18px] w-[18px] text-destructive" />

  // Done: show tool icon in muted green, or generic checkmark for non-tool steps
  if (status === 'done') {
    if (toolName === 'web_search') return <Globe className="h-[18px] w-[18px] text-emerald-500" />
    if (toolName === 'run_code') return <Terminal className="h-[18px] w-[18px] text-emerald-500" />
    if (toolName === 'use_skill') return <Puzzle className="h-[18px] w-[18px] text-emerald-500" />
    return <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
  }

  // In progress: tool icon with pulse, or spinner for generic steps
  if (status === 'in_progress') {
    if (toolName === 'web_search') return <Globe className="h-[18px] w-[18px] text-primary animate-pulse" />
    if (toolName === 'run_code') return <Terminal className="h-[18px] w-[18px] text-primary animate-pulse" />
    if (toolName === 'use_skill') return <Puzzle className="h-[18px] w-[18px] text-primary animate-pulse" />
    return <Loader2 className="h-[18px] w-[18px] text-primary animate-spin" />
  }

  // Pending: tool icon faint, or empty circle
  if (toolName === 'web_search') return <Globe className="h-[18px] w-[18px] text-muted-foreground/30" />
  if (toolName === 'run_code') return <Terminal className="h-[18px] w-[18px] text-muted-foreground/30" />
  if (toolName === 'use_skill') return <Puzzle className="h-[18px] w-[18px] text-muted-foreground/30" />
  return <Circle className="h-[18px] w-[18px] text-muted-foreground/30" />
}

function PlanTimeline({ steps }: { steps: PlanStep[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="mb-3 pb-3 border-b border-border/40">
      <ol className="flex flex-col">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1
          const isDone = step.status === 'done'
          const isActive = step.status === 'in_progress'
          const isError = step.status === 'error'
          const canExpand = !!(step.input || step.output)
          const isExpanded = expanded.has(step.id)

          return (
            <li key={step.id} className="flex gap-3 min-w-0">
              {/* Left: icon + connector line */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 18 }}>
                <div className="shrink-0 mt-0.5">
                  <StepIcon step={step} />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-px flex-1 mt-1 mb-1 min-h-[12px]',
                      isDone ? 'bg-emerald-500/40' : isActive ? 'bg-primary/30' : 'bg-border/50'
                    )}
                  />
                )}
              </div>

              {/* Right: text + expandable detail */}
              <div className={cn('flex-1 min-w-0 pb-2', isLast && 'pb-0')}>
                {/* Header row — clickable if there's content to expand */}
                <div
                  className={cn(
                    'flex items-center gap-2 flex-wrap',
                    canExpand && 'cursor-pointer select-none group/step'
                  )}
                  onClick={canExpand ? () => toggle(step.id) : undefined}
                >
                  <span
                    className={cn(
                      'text-sm leading-snug',
                      isDone && 'text-muted-foreground',
                      isActive && 'text-foreground font-medium',
                      isError && 'text-destructive',
                      !isDone && !isActive && !isError && 'text-foreground/50'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.sublabel && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                        isDone && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        isError && 'bg-destructive/10 text-destructive',
                        isActive && 'bg-primary/10 text-primary'
                      )}
                    >
                      {step.sublabel}
                    </span>
                  )}
                  {canExpand && (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform',
                        'opacity-0 group-hover/step:opacity-100',
                        isExpanded && 'rotate-180 opacity-100'
                      )}
                    />
                  )}
                </div>

                {/* Expandable body */}
                {isExpanded && (
                  <div className="mt-2 flex flex-col gap-2">
                    {step.input && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-1">
                          {step.toolName === 'run_code' ? 'Code' : 'Input'}
                        </p>
                        <pre className={cn(
                          'text-xs font-mono rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap',
                          'bg-muted/50 border border-border/50 text-foreground/80'
                        )}>
                          {step.input}
                        </pre>
                      </div>
                    )}
                    {step.output && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-1">
                          Output
                        </p>
                        <pre className={cn(
                          'text-xs font-mono rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap max-h-48',
                          'bg-muted/50 border border-border/50 text-foreground/80'
                        )}>
                          {step.output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ToolUseBadges({ toolUse, isStreaming }: { toolUse: ToolUseInfo[]; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandedItems = toolUse.filter((t) => t.code && expanded.has(t.toolCallId))

  return (
    <div className="mb-2.5 pb-2.5 border-b border-border/40">
      <div className="flex flex-wrap gap-1.5">
        {toolUse.map((t) => {
          const isWeb = t.toolName === 'web_search'
          const isCode = t.toolName === 'run_code'
          const isPending = t.isPending || (isStreaming && !t.sublabel)
          const isExpanded = expanded.has(t.toolCallId)
          return (
            <div
              key={t.toolCallId}
              onClick={isCode && t.code ? () => toggle(t.toolCallId) : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
                t.error
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-primary/8 text-primary border border-primary/20',
                isCode && t.code && 'cursor-pointer hover:bg-primary/15 transition-colors select-none'
              )}
            >
              {isWeb ? (
                <Globe className={cn('h-3 w-3 shrink-0', isPending && 'animate-pulse')} />
              ) : isCode ? (
                <Terminal className={cn('h-3 w-3 shrink-0', isPending && 'animate-pulse')} />
              ) : (
                <Puzzle className={cn('h-3 w-3 shrink-0', isPending && 'animate-pulse')} />
              )}
              <span className="font-medium truncate max-w-[200px]">{t.label}</span>
              {t.error ? (
                <span className="opacity-70">failed</span>
              ) : t.sublabel ? (
                <span className="opacity-70">{t.sublabel}</span>
              ) : null}
              {isCode && t.code && (
                <ChevronDown
                  className={cn('h-3 w-3 shrink-0 transition-transform', isExpanded && 'rotate-180')}
                />
              )}
            </div>
          )
        })}
      </div>
      {expandedItems.length > 0 && (
        <div className="mt-2 space-y-2">
          {expandedItems.map((t) => (
            <pre
              key={t.toolCallId}
              className="text-xs font-mono bg-muted/50 border border-border/60 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-foreground/80"
            >
              {t.code}
            </pre>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const { settings } = useAppStore()
  const isDark = settings.appearance.theme !== 'light'
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const contentRef = useRef<HTMLDivElement>(null)

  if (isUser) {
    const imageAttachments = (message.attachments ?? []).filter(
      (a) => a.type === 'image' && a.dataUrl
    )
    return (
      <div className="flex justify-end mb-3 animate-fade-in">
        <div className="flex items-end gap-2 max-w-[78%]">
          <div className="flex flex-col items-end gap-1">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 selectable">
              {message.skillUsed && (
                <div className="flex items-center gap-1 mb-1.5 opacity-80">
                  <Puzzle className="h-3 w-3 shrink-0" />
                  <code className="text-[11px] font-mono font-medium">/{message.skillUsed}</code>
                </div>
              )}
              {imageAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {imageAttachments.map((a, i) => (
                    <img
                      key={i}
                      src={a.dataUrl}
                      alt={a.name}
                      className="max-h-48 max-w-full rounded-lg object-contain border border-primary-foreground/20"
                    />
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
            <span className="text-[10px] text-muted-foreground px-1">
              {formatTime(message.timestamp)}
            </span>
          </div>
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/20 shrink-0 mb-5">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      </div>
    )
  }

  if (isAssistant) {
    const hasContent = !!(message.content || message.blocks?.length)
    return (
      <div className="flex justify-start mb-3 animate-fade-in group/msg">
        <div className="flex items-start gap-2 max-w-[84%]">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted shrink-0 mt-1">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {message.error ? (
              <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-sm">{message.error}</p>
              </div>
            ) : (
              <div
                className={cn(
                  'bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3',
                  'min-w-0 overflow-hidden'
                )}
              >
                {/* Thinking block */}
                {message.thinking && (
                  <ThinkingBlock content={message.thinking} isStreaming={!!message.isStreaming} />
                )}

                {/* Plan timeline — covers both model-plan steps and bare tool calls */}
                {message.planSteps && message.planSteps.length > 0 ? (
                  <PlanTimeline steps={message.planSteps} />
                ) : message.toolUse && message.toolUse.length > 0 ? (
                  <ToolUseBadges toolUse={message.toolUse} isStreaming={!!message.isStreaming} />
                ) : null}

                {/* Streaming: show status text or raw content with cursor */}
                {message.isStreaming && message.statusText && !message.content && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="flex gap-0.5">
                      <span className="animate-bounce [animation-delay:0ms] h-1.5 w-1.5 rounded-full bg-muted-foreground/60 inline-block" />
                      <span className="animate-bounce [animation-delay:150ms] h-1.5 w-1.5 rounded-full bg-muted-foreground/60 inline-block" />
                      <span className="animate-bounce [animation-delay:300ms] h-1.5 w-1.5 rounded-full bg-muted-foreground/60 inline-block" />
                    </span>
                    <span className="text-xs">{message.statusText}</span>
                  </div>
                )}
                {message.isStreaming && (
                  <p className={cn('text-sm leading-relaxed whitespace-pre-wrap selectable', message.content && 'streaming-cursor')}>
                    {message.content || (message.statusText ? null : ' ')}
                  </p>
                )}

                {/* Finalized: render blocks (markdown + cards) */}
                {!message.isStreaming && message.blocks && (
                  <div ref={contentRef} className="flex flex-col gap-1">
                    {message.blocks.map((block, i) => {
                      if (block.type === 'text') {
                        const textBlock = block as TextBlock
                        return textBlock.content ? (
                          <MarkdownContent
                            key={i}
                            content={textBlock.content}
                            isDark={isDark}
                          />
                        ) : null
                      }
                      return <CardRenderer key={i} block={block} />
                    })}
                  </div>
                )}

                {/* Fallback: no blocks yet */}
                {!message.isStreaming && !message.blocks && message.content && (
                  <div ref={contentRef}>
                    <MarkdownContent content={message.content} isDark={isDark} />
                  </div>
                )}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground">
                {formatTime(message.timestamp)}
              </span>
              {!message.isStreaming && !message.error && hasContent && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  <CopyHtmlButton contentRef={contentRef} />
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                        'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                      title="Regenerate response"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <></>
}
