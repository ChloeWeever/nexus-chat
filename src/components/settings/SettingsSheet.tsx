import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Switch from '@radix-ui/react-switch'
import * as Slider from '@radix-ui/react-slider'
import * as Select from '@radix-ui/react-select'
import {
  X,
  Bot,
  Palette,
  Cpu,
  Globe,
  Check,
  ExternalLink,
  RotateCcw,
  Puzzle
} from 'lucide-react'
import { useAppStore } from '@/store'
import { DEFAULT_SETTINGS } from '@/types'
import { cn } from '@/lib/utils'
import SkillsManager from '@/components/skills/SkillsManager'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground block mb-1.5">
      {children}
    </label>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
        'placeholder:text-muted-foreground/60 transition-colors',
        className
      )}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function SettingsSheet({ open, onClose }: SettingsSheetProps): JSX.Element {
  const { settings, updateSettings } = useAppStore()
  const [tab, setTab] = useState('api')

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      updateSettings(DEFAULT_SETTINGS)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 h-screen w-[520px] max-w-full
            bg-background border-l border-border shadow-2xl
            data-[state=open]:animate-fade-in overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Dialog.Title className="font-semibold text-base">Settings</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <Tabs.List className="flex px-6 pt-4 gap-1 shrink-0 flex-wrap">
              {[
                { id: 'api', label: 'LiteLLM', icon: <Cpu className="h-3.5 w-3.5" /> },
                { id: 'model', label: 'Model', icon: <Bot className="h-3.5 w-3.5" /> },
                { id: 'skills', label: 'Skills', icon: <Puzzle className="h-3.5 w-3.5" /> },
                { id: 'websearch', label: 'Web Search', icon: <Globe className="h-3.5 w-3.5" /> },
                { id: 'appearance', label: 'Appearance', icon: <Palette className="h-3.5 w-3.5" /> }
              ].map((t) => (
                <Tabs.Trigger
                  key={t.id}
                  value={t.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    'data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium',
                    'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground',
                    'data-[state=inactive]:hover:bg-muted/50'
                  )}
                >
                  {t.icon}
                  {t.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* API Settings */}
              <Tabs.Content value="api" className="space-y-6">
                <Section title="Connection">
                  <div>
                    <Label>Base URL</Label>
                    <Input
                      value={settings.litellm.baseUrl}
                      onChange={(v) => updateSettings({ litellm: { ...settings.litellm, baseUrl: v } })}
                      placeholder="http://localhost:4000"
                    />
                    <Hint>
                      Your LiteLLM proxy URL.{' '}
                      <a
                        href="https://docs.litellm.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-0.5 hover:underline"
                      >
                        Docs <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </Hint>
                  </div>

                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={settings.litellm.apiKey}
                      onChange={(v) => updateSettings({ litellm: { ...settings.litellm, apiKey: v } })}
                      placeholder="sk-... (leave blank if not required)"
                    />
                    <Hint>Optional if your LiteLLM instance doesn't require authentication.</Hint>
                  </div>
                </Section>

                <Section title="Chat">
                  <div>
                    <Label>System Prompt</Label>
                    <textarea
                      value={settings.chat.systemPrompt}
                      onChange={(e) =>
                        updateSettings({ chat: { ...settings.chat, systemPrompt: e.target.value } })
                      }
                      rows={10}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                        placeholder:text-muted-foreground/60 font-mono resize-y min-h-[120px]"
                    />
                    <Hint>
                      The system prompt is sent at the start of every conversation. It includes instructions for card rendering.
                    </Hint>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Streaming</Label>
                      <Hint>Stream responses token by token.</Hint>
                    </div>
                    <Switch.Root
                      checked={settings.chat.streamingEnabled}
                      onCheckedChange={(v) =>
                        updateSettings({ chat: { ...settings.chat, streamingEnabled: v } })
                      }
                      className="h-5 w-9 rounded-full bg-muted data-[state=checked]:bg-primary transition-colors"
                    >
                      <Switch.Thumb className="block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 translate-x-0.5" />
                    </Switch.Root>
                  </div>
                </Section>
              </Tabs.Content>

              {/* Model Settings */}
              <Tabs.Content value="model" className="space-y-6">
                <Section title="Model">
                  <div>
                    <Label>Model Name</Label>
                    <Input
                      value={settings.litellm.model}
                      onChange={(v) => updateSettings({ litellm: { ...settings.litellm, model: v } })}
                      placeholder="gpt-4o-mini, claude-3-haiku, ollama/llama3..."
                    />
                    <Hint>
                      Any model supported by your LiteLLM proxy. Examples: gpt-4o, claude-3-5-sonnet, gemini/gemini-pro
                    </Hint>
                  </div>
                </Section>

                <Section title="Parameters">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label>Temperature</Label>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {settings.litellm.temperature.toFixed(1)}
                      </span>
                    </div>
                    <Slider.Root
                      min={0}
                      max={2}
                      step={0.1}
                      value={[settings.litellm.temperature]}
                      onValueChange={([v]) =>
                        updateSettings({ litellm: { ...settings.litellm, temperature: v } })
                      }
                      className="relative flex items-center w-full h-5"
                    >
                      <Slider.Track className="relative h-1.5 flex-1 rounded-full bg-muted">
                        <Slider.Range className="absolute h-full rounded-full bg-primary" />
                      </Slider.Track>
                      <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow focus:outline-none focus:ring-2 focus:ring-ring" />
                    </Slider.Root>
                    <Hint>Higher = more creative, lower = more deterministic.</Hint>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label>Max Tokens</Label>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {settings.litellm.maxTokens}
                      </span>
                    </div>
                    <Slider.Root
                      min={256}
                      max={16384}
                      step={256}
                      value={[settings.litellm.maxTokens]}
                      onValueChange={([v]) =>
                        updateSettings({ litellm: { ...settings.litellm, maxTokens: v } })
                      }
                      className="relative flex items-center w-full h-5"
                    >
                      <Slider.Track className="relative h-1.5 flex-1 rounded-full bg-muted">
                        <Slider.Range className="absolute h-full rounded-full bg-primary" />
                      </Slider.Track>
                      <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow focus:outline-none focus:ring-2 focus:ring-ring" />
                    </Slider.Root>
                    <Hint>Maximum number of tokens in the response.</Hint>
                  </div>
                </Section>
              </Tabs.Content>

              {/* Skills */}
              <Tabs.Content value="skills" className="space-y-6">
                <Section title="Skills">
                  <SkillsManager />
                </Section>
              </Tabs.Content>

              {/* Web Search */}
              <Tabs.Content value="websearch" className="space-y-6">
                <Section title="Ollama Web Search">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label>Enable Web Search</Label>
                      <Hint>
                        Allow the AI to search the web for current information using{' '}
                        <a
                          href="https://ollama.com/api/web_search"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-0.5 hover:underline"
                        >
                          Ollama Web Search API <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </Hint>
                    </div>
                    <Switch.Root
                      checked={settings.chat.webSearchEnabled}
                      onCheckedChange={(v) =>
                        updateSettings({ chat: { ...settings.chat, webSearchEnabled: v } })
                      }
                      className="h-5 w-9 rounded-full bg-muted data-[state=checked]:bg-primary transition-colors shrink-0 mt-1"
                    >
                      <Switch.Thumb className="block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 translate-x-0.5" />
                    </Switch.Root>
                  </div>

                  <div>
                    <Label>Ollama API Key</Label>
                    <Input
                      type="password"
                      value={settings.chat.ollamaApiKey}
                      onChange={(v) =>
                        updateSettings({ chat: { ...settings.chat, ollamaApiKey: v } })
                      }
                      placeholder="ollama_..."
                    />
                    <Hint>
                      Create a free API key at{' '}
                      <a
                        href="https://ollama.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        ollama.com
                      </a>
                      . Required for web search.
                    </Hint>
                  </div>
                </Section>

                <Section title="How it works">
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-2">
                    {[
                      'You send a message',
                      'AI decides whether a web search is needed',
                      'If yes, it searches via Ollama\'s Web Search API',
                      'Results are injected as context',
                      'AI generates a grounded, up-to-date answer'
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </Tabs.Content>

              {/* Appearance */}
              <Tabs.Content value="appearance" className="space-y-6">
                <Section title="Theme">
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateSettings({ appearance: { theme: t } })}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border p-3 transition-all',
                          settings.appearance.theme === t
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                        )}
                      >
                        <div
                          className={cn(
                            'h-10 w-full rounded-lg border',
                            t === 'light' && 'bg-white border-gray-200',
                            t === 'dark' && 'bg-gray-900 border-gray-700',
                            t === 'system' && 'bg-gradient-to-r from-white to-gray-900 border-gray-400'
                          )}
                        />
                        <span className="text-xs font-medium capitalize">{t}</span>
                        {settings.appearance.theme === t && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </Section>
              </Tabs.Content>
            </div>

            {/* Footer */}
            <div className="border-t border-border/60 px-6 py-3 shrink-0">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to defaults
              </button>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
