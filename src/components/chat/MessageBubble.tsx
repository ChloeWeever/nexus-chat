import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, User, Bot, AlertTriangle, Globe, Puzzle, Code, RotateCcw, Loader2 } from 'lucide-react'
import { useState, useRef } from 'react'
import type { Message, TextBlock, ToolUseInfo } from '@/types'
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
      className="prose prose-sm dark:prose-invert max-w-none selectable"
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const codeStr = String(children).replace(/\n$/, '')
          const isBlock = codeStr.includes('\n') || match

          if (isBlock) {
            return (
              <div className="relative group my-2 rounded-lg overflow-hidden border border-border/40">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-mono">
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
                    background: 'transparent'
                  }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              </div>
            )
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[0.8125rem]"
              {...props}
            >
              {children}
            </code>
          )
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="border-collapse text-sm">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return (
            <th className="border border-border px-3 py-1.5 bg-muted/40 font-medium text-left">
              {children}
            </th>
          )
        },
        td({ children }) {
          return <td className="border border-border px-3 py-1.5">{children}</td>
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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

function ToolUseBadges({ toolUse, isStreaming }: { toolUse: ToolUseInfo[]; isStreaming: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2.5 border-b border-border/40">
      {toolUse.map((t) => {
        const isWeb = t.toolName === 'web_search'
        const isPending = t.isPending || (isStreaming && !t.sublabel)
        return (
          <div
            key={t.toolCallId}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
              t.error
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-primary/8 text-primary border border-primary/20'
            )}
          >
            {isWeb ? (
              <Globe className={cn('h-3 w-3 shrink-0', isPending && 'animate-pulse')} />
            ) : (
              <Puzzle className={cn('h-3 w-3 shrink-0', isPending && 'animate-pulse')} />
            )}
            <span className="font-medium truncate max-w-[200px]">{t.label}</span>
            {t.error ? (
              <span className="opacity-70">failed</span>
            ) : t.sublabel ? (
              <span className="opacity-70">{t.sublabel}</span>
            ) : null}
          </div>
        )
      })}
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
                {/* Tool use indicator */}
                {message.toolUse && message.toolUse.length > 0 && (
                  <ToolUseBadges toolUse={message.toolUse} isStreaming={!!message.isStreaming} />
                )}

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
