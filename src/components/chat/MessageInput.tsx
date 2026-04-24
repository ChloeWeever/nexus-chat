import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Square, Globe, Puzzle, Paperclip, X, FileText, Loader2, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, generateId } from '@/lib/utils'
import {
  WEB_SEARCH_TOOL,
  buildUseSkillTool,
  buildSkillsSystemMessage,
  type OpenAIMessage,
  type OpenAIContentPart,
  type OpenAIToolCall
} from '@/lib/tools'
import type { ToolUseInfo, Skill } from '@/types'

interface MessageInputProps {
  conversationId: string
}

interface AttachedFileState {
  id: string
  name: string
  type: 'text' | 'image'
  content?: string
  dataUrl?: string
  mimeType?: string
  parsing?: boolean
  parseError?: string
}

const BINARY_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'xls', 'pptx'])

// ─── Slash-command helpers ────────────────────────────────────────────────────

function parseSlashCommand(text: string): { name: string; args: string } | null {
  if (!text.startsWith('/')) return null
  const spaceIdx = text.indexOf(' ')
  if (spaceIdx === -1) return { name: text.slice(1), args: '' }
  return { name: text.slice(1, spaceIdx), args: text.slice(spaceIdx + 1).trim() }
}

function SlashMenu({
  query,
  skills,
  onSelect
}: {
  query: string
  skills: Skill[]
  onSelect: (skill: Skill) => void
}) {
  const matches = skills.filter(
    (s) => s.enabled && s.userInvocable && s.name.startsWith(query.toLowerCase())
  )
  if (!matches.length) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-20">
      <div className="px-3 py-1.5 border-b border-border/40">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Skills
        </span>
      </div>
      {matches.map((skill) => (
        <button
          key={skill.id}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(skill)
          }}
          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
        >
          <code className="text-xs font-mono font-semibold text-primary mt-0.5 shrink-0 w-32 truncate">
            /{skill.name}
          </code>
          <div className="min-w-0">
            <p className="text-xs text-foreground truncate">{skill.description}</p>
            {skill.argumentHint && (
              <p className="text-[10px] text-muted-foreground/70 italic mt-0.5">
                {skill.argumentHint}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const [input, setInput] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileState[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const {
    settings,
    conversations,
    skills,
    pendingPrompt,
    setPendingPrompt,
    addMessage,
    appendToMessage,
    finalizeMessage,
    setMessageError,
    setMessageToolUse,
    setMessageStatus,
    isStreaming,
    setIsStreaming
  } = useAppStore()

  const autoSubmitRef = useRef(false)
  const handleSubmitRef = useRef<(() => void) | null>(null)
  const conversation = conversations.find((c) => c.id === conversationId)

  useEffect(() => {
    if (pendingPrompt) {
      setInput(pendingPrompt)
      setPendingPrompt(null)
      autoSubmitRef.current = true
    }
  }, [pendingPrompt, setPendingPrompt])

  useEffect(() => {
    if (autoSubmitRef.current && input && handleSubmitRef.current) {
      autoSubmitRef.current = false
      handleSubmitRef.current()
    }
  }, [input])

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    adjustHeight()
    if (value.startsWith('/') && !value.includes(' ')) {
      setShowSlashMenu(true)
    } else {
      setShowSlashMenu(false)
    }
  }

  const handleSelectSkill = (skill: Skill) => {
    setInput(`/${skill.name} `)
    setShowSlashMenu(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setShowSlashMenu(false)
      return
    }
    if (e.key === 'Tab' && showSlashMenu) {
      e.preventDefault()
      const matches = skills.filter(
        (s) => s.enabled && s.userInvocable && s.name.startsWith(input.slice(1).toLowerCase())
      )
      if (matches[0]) handleSelectSkill(matches[0])
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleStop = () => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setIsStreaming(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataURL(file)
        setAttachedFiles((prev) => [
          ...prev,
          { id: generateId(), name: file.name, type: 'image', dataUrl, mimeType: file.type }
        ])
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        if (BINARY_EXTENSIONS.has(ext)) {
          const id = generateId()
          setAttachedFiles((prev) => [...prev, { id, name: file.name, type: 'text', parsing: true }])
          const buffer = await file.arrayBuffer()
          const result = await window.api.parseFile({ name: file.name, buffer })
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id !== id
                ? f
                : result.error
                  ? { ...f, parsing: false, parseError: result.error }
                  : { ...f, parsing: false, content: result.text }
            )
          )
        } else {
          const content = await file.text()
          setAttachedFiles((prev) => [
            ...prev,
            { id: generateId(), name: file.name, type: 'text', content }
          ])
        }
      }
    }
    e.target.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const streamInto = (
    messages: OpenAIMessage[],
    assistantMsgId: string,
    req: { baseUrl: string; apiKey: string }
  ): void => {
    const cleanup = window.api.llmStream(
      {
        ...req,
        body: {
          model: settings.litellm.model,
          messages,
          stream: true,
          max_tokens: settings.litellm.maxTokens,
          temperature: settings.litellm.temperature
        },
        requestId: assistantMsgId
      },
      (delta) => appendToMessage(conversationId, assistantMsgId, delta),
      () => {
        finalizeMessage(conversationId, assistantMsgId)
        setIsStreaming(false)
        cleanupRef.current = null
      },
      (errMsg) => {
        setMessageError(conversationId, assistantMsgId, errMsg)
        setIsStreaming(false)
        cleanupRef.current = null
      }
    )
    cleanupRef.current = cleanup
  }

  const handleSubmit = useCallback(async () => {
    const text = input.trim()
    const isParsing = attachedFiles.some((f) => f.parsing)
    if ((!text && attachedFiles.length === 0) || isStreaming || isParsing || !conversation) return

    setInput('')
    setAttachedFiles([])
    setShowSlashMenu(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const req = { baseUrl: settings.litellm.baseUrl, apiKey: settings.litellm.apiKey }

    // ── Detect explicit /skill-name command ───────────────────────────────────
    const slashCmd = parseSlashCommand(text)
    const explicitSkill = slashCmd
      ? skills.find((s) => s.name === slashCmd.name && s.enabled)
      : null

    const baseText = explicitSkill ? (slashCmd!.args || `/${explicitSkill.name}`) : text

    // ── Build display content (labels only, no file bodies) ──────────────────
    const attachmentLabels = attachedFiles.map((f) =>
      f.type === 'text' ? `[File: ${f.name}]` : `[Image: ${f.name}]`
    )
    const displayContent = [baseText, ...attachmentLabels].filter(Boolean).join('\n')

    // ── Build API content (includes file bodies and/or multimodal) ───────────
    const textFiles = attachedFiles.filter((f) => f.type === 'text' && f.content && !f.parseError)
    const imageFiles = attachedFiles.filter((f) => f.type === 'image')

    let apiText = baseText
    for (const f of textFiles) {
      const ext = f.name.split('.').pop() ?? 'text'
      apiText += `\n\n**File: ${f.name}**\n\`\`\`${ext}\n${f.content}\n\`\`\``
    }

    const apiUserContent: string | OpenAIContentPart[] =
      imageFiles.length > 0
        ? [
            { type: 'text', text: apiText },
            ...imageFiles.map((f) => ({
              type: 'image_url' as const,
              image_url: { url: f.dataUrl! }
            }))
          ]
        : apiText

    addMessage(conversationId, {
      role: 'user',
      content: displayContent,
      skillUsed: explicitSkill?.name,
      attachments: attachedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        dataUrl: f.type === 'image' ? f.dataUrl : undefined
      }))
    })

    // ── Build system messages ─────────────────────────────────────────────────
    const systemMsgs: OpenAIMessage[] = []
    if (settings.chat.systemPrompt) {
      systemMsgs.push({ role: 'system', content: settings.chat.systemPrompt })
    }

    const autoSkills = skills.filter((s) => s.enabled && !s.disableModelInvocation)

    if (explicitSkill) {
      systemMsgs.push({ role: 'system', content: explicitSkill.instructions })
    } else if (autoSkills.length > 0) {
      systemMsgs.push({ role: 'system', content: buildSkillsSystemMessage(autoSkills) })
    }

    const historyMessages = conversation.messages
      .filter((m) => m.role !== 'system' && m.content.trim() !== '' && !m.error)
      .map((m) => ({ role: m.role as OpenAIMessage['role'], content: m.content }))

    const historyMsgs: OpenAIMessage[] = [
      ...historyMessages,
      { role: 'user' as const, content: apiUserContent }
    ]

    const messages: OpenAIMessage[] = [...systemMsgs, ...historyMsgs]

    const assistantMsgId = addMessage(conversationId, {
      role: 'assistant',
      content: '',
      isStreaming: true
    })

    setIsStreaming(true)

    const webSearchEnabled = settings.chat.webSearchEnabled && !!settings.chat.ollamaApiKey

    // ── Agentic tool loop ─────────────────────────────────────────────────────
    const tools = [
      ...(webSearchEnabled ? [WEB_SEARCH_TOOL] : []),
      ...(!explicitSkill && autoSkills.length > 0
        ? [buildUseSkillTool(autoSkills.map((s) => s.name))]
        : [])
    ]

    if (tools.length > 0) {
      setMessageStatus(conversationId, assistantMsgId, 'Thinking…')

      const firstResult = await window.api.llmFetch({
        ...req,
        body: {
          model: settings.litellm.model,
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: settings.litellm.maxTokens,
          temperature: settings.litellm.temperature,
          stream: false
        }
      })

      if (firstResult.error) {
        setMessageError(conversationId, assistantMsgId, firstResult.error)
        setIsStreaming(false)
        return
      }

      const firstData = firstResult.data as {
        choices: Array<{
          finish_reason: string
          message: { role: string; content: string | null; tool_calls?: OpenAIToolCall[] }
        }>
      }
      const choice = firstData.choices?.[0]

      if (choice?.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
        appendToMessage(conversationId, assistantMsgId, choice?.message?.content ?? '')
        finalizeMessage(conversationId, assistantMsgId)
        setIsStreaming(false)
        return
      }

      // ── Execute tool calls ────────────────────────────────────────────────
      const toolCallResults: OpenAIMessage[] = []
      const toolUseInfo: ToolUseInfo[] = []

      for (const call of choice.message.tool_calls) {
        let args: Record<string, unknown>
        try {
          args = JSON.parse(call.function.arguments)
        } catch {
          continue
        }

        if (call.function.name === 'web_search') {
          const query = String(args.query ?? '')
          setMessageStatus(conversationId, assistantMsgId, `Searching "${query}"…`)

          const searchResult = await window.api.webSearch({
            query,
            maxResults: (args.max_results as number) ?? 5,
            apiKey: settings.chat.ollamaApiKey
          })

          let toolContent: string
          let sublabel: string
          if (searchResult.error) {
            toolContent = `Web search failed: ${searchResult.error}`
            sublabel = 'failed'
          } else {
            const data = searchResult.data as {
              results: Array<{ title: string; url: string; content: string }>
            }
            const count = data.results?.length ?? 0
            sublabel = `${count} result${count !== 1 ? 's' : ''}`
            toolContent = data.results
              .map((r) => `### ${r.title}\nURL: ${r.url}\n${r.content}`)
              .join('\n\n---\n\n')
          }

          toolCallResults.push({ role: 'tool', tool_call_id: call.id, content: toolContent })
          toolUseInfo.push({
            toolCallId: call.id,
            toolName: 'web_search',
            label: query,
            sublabel,
            error: searchResult.error
          })
        } else if (call.function.name === 'use_skill') {
          const skillName = String(args.skill_name ?? '')
          const skill = autoSkills.find((s) => s.name === skillName)

          if (skill) {
            setMessageStatus(conversationId, assistantMsgId, `Reading /${skill.name}…`)
            toolCallResults.push({
              role: 'tool',
              tool_call_id: call.id,
              content: skill.instructions
            })
            toolUseInfo.push({
              toolCallId: call.id,
              toolName: 'use_skill',
              label: skill.name,
              sublabel: 'loaded'
            })
          } else {
            toolCallResults.push({
              role: 'tool',
              tool_call_id: call.id,
              content: `Skill "${skillName}" not found.`
            })
          }
        }
      }

      setMessageToolUse(conversationId, assistantMsgId, toolUseInfo)

      const augmented: OpenAIMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: choice.message.content,
          tool_calls: choice.message.tool_calls
        },
        ...toolCallResults
      ]
      streamInto(augmented, assistantMsgId, req)
      return
    }

    // ── Direct streaming: explicit skill (already injected) or plain chat ───
    if (settings.chat.streamingEnabled) {
      if (explicitSkill) setMessageStatus(conversationId, assistantMsgId, `Using /${explicitSkill.name}…`)
      streamInto(messages, assistantMsgId, req)
    } else {
      if (explicitSkill) setMessageStatus(conversationId, assistantMsgId, `Using /${explicitSkill.name}…`)
      try {
        const result = await window.api.llmFetch({
          ...req,
          body: {
            model: settings.litellm.model,
            messages,
            max_tokens: settings.litellm.maxTokens,
            temperature: settings.litellm.temperature
          }
        })
        if (result.error) {
          setMessageError(conversationId, assistantMsgId, result.error)
        } else {
          const data = result.data as { choices?: { message?: { content?: string } }[] }
          appendToMessage(
            conversationId,
            assistantMsgId,
            data?.choices?.[0]?.message?.content ?? ''
          )
          finalizeMessage(conversationId, assistantMsgId)
        }
      } catch (err) {
        setMessageError(
          conversationId,
          assistantMsgId,
          err instanceof Error ? err.message : String(err)
        )
      } finally {
        setIsStreaming(false)
      }
    }
  }, [
    input,
    attachedFiles,
    isStreaming,
    conversation,
    conversationId,
    settings,
    skills,
    addMessage,
    appendToMessage,
    finalizeMessage,
    setMessageError,
    setMessageToolUse,
    setMessageStatus,
    setIsStreaming
  ])

  handleSubmitRef.current = handleSubmit

  const slashCmd = input.startsWith('/') && input.includes(' ') ? parseSlashCommand(input) : null
  const activeSkill = slashCmd ? skills.find((s) => s.name === slashCmd.name && s.enabled) : null
  const webSearchActive = settings.chat.webSearchEnabled && !!settings.chat.ollamaApiKey
  const autoSkillCount = skills.filter((s) => s.enabled && !s.disableModelInvocation).length
  const isParsing = attachedFiles.some((f) => f.parsing)
  const canSend = !!(input.trim() || attachedFiles.length > 0) && !isParsing

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      {(webSearchActive || activeSkill || autoSkillCount > 0) && (
        <div className="flex items-center gap-3 mb-2 px-1">
          {webSearchActive && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[11px] text-primary font-medium">Web search</span>
            </div>
          )}
          {activeSkill ? (
            <div className="flex items-center gap-1.5">
              <Puzzle className="h-3 w-3 text-primary" />
              <span className="text-[11px] text-primary font-medium">/{activeSkill.name}</span>
              {activeSkill.argumentHint && (
                <span className="text-[11px] text-muted-foreground italic">
                  — {activeSkill.argumentHint}
                </span>
              )}
            </div>
          ) : autoSkillCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <Puzzle className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                {autoSkillCount} skill{autoSkillCount !== 1 ? 's' : ''} available
              </span>
            </div>
          ) : null}
        </div>
      )}

      <div className="relative">
        {showSlashMenu && (
          <SlashMenu query={input.slice(1)} skills={skills} onSelect={handleSelectSkill} />
        )}

        <div
          className={cn(
            'rounded-2xl border border-border/80 bg-card',
            'shadow-sm transition-colors',
            'focus-within:border-primary/50 focus-within:shadow-primary/5 focus-within:shadow-md',
            activeSkill && 'border-primary/30 bg-primary/[0.02]'
          )}
        >
          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachedFiles.map((f) => (
                <div key={f.id} className="relative group">
                  {f.type === 'image' ? (
                    <div className="relative">
                      <img
                        src={f.dataUrl}
                        alt={f.name}
                        className="h-16 w-16 object-cover rounded-lg border border-border/60"
                      />
                      <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ) : f.parsing ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/40 max-w-[160px]">
                      <Loader2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 animate-spin" />
                      <span className="text-xs text-muted-foreground truncate">{f.name}</span>
                    </div>
                  ) : f.parseError ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 max-w-[160px]" title={f.parseError}>
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      <span className="text-xs text-destructive truncate">{f.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/40 max-w-[160px]">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate">{f.name}</span>
                    </div>
                  )}
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      removeAttachment(f.id)
                    }}
                    className={cn(
                      'absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full',
                      'bg-muted border border-border/60 text-muted-foreground',
                      'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive',
                      'flex items-center justify-center transition-colors'
                    )}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.js,.ts,.tsx,.jsx,.py,.json,.yaml,.yml,.xml,.html,.css,.rs,.go,.java,.c,.cpp,.h,.sh,.csv,.sql,.pdf,.docx,.xlsx,.xls,.pptx"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Attach button */}
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                fileInputRef.current?.click()
              }}
              disabled={isStreaming}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-xl ml-2 mb-2 shrink-0 transition-colors',
                isStreaming
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowSlashMenu(false), 150)}
              placeholder="Message… (type / for skills)"
              rows={1}
              disabled={isStreaming}
              className={cn(
                'flex-1 resize-none bg-transparent px-2 py-3.5 text-sm',
                'placeholder:text-muted-foreground/60 focus:outline-none',
                'min-h-[52px] max-h-[200px] leading-relaxed selectable',
                isStreaming && 'opacity-50'
              )}
            />

            <div className="flex items-center gap-1 pr-2 pb-2">
              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-xl',
                    'bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors'
                  )}
                  title="Stop generation"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSend}
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-xl transition-all',
                    canSend
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                  )}
                  title="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
        {settings.litellm.model} · LiteLLM
      </p>
    </div>
  )
}
