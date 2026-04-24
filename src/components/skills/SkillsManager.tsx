import { useState } from 'react'
import * as Switch from '@radix-ui/react-switch'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Puzzle,
  Plus,
  Trash2,
  Upload,
  ChevronDown,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
  Terminal
} from 'lucide-react'
import { useAppStore } from '@/store'
import type { Skill } from '@/types'
import { parseSkillMd, buildSkillMd } from '@/lib/skill-parser'
import { EXAMPLE_SKILL_MD } from '@/lib/skills'
import { cn } from '@/lib/utils'

function SkillRow({
  skill,
  onToggle,
  onDelete
}: {
  skill: Skill
  onToggle: () => void
  onDelete?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        skill.enabled ? 'border-border bg-card' : 'border-border/40 bg-muted/10'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold',
            skill.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          /
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code
              className={cn(
                'text-sm font-mono font-semibold',
                skill.enabled ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              /{skill.name}
            </code>
            {skill.builtIn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">
                built-in
              </span>
            )}
            {skill.disableModelInvocation && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shrink-0">
                manual only
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{skill.description}</p>
          {skill.argumentHint && skill.enabled && (
            <p className="text-[10px] text-primary/70 mt-0.5 italic">Hint: {skill.argumentHint}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title={expanded ? 'Collapse' : 'View instructions'}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
              title="Delete skill"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <Switch.Root
            checked={skill.enabled}
            onCheckedChange={onToggle}
            className="h-5 w-9 rounded-full bg-muted data-[state=checked]:bg-primary transition-colors"
          >
            <Switch.Thumb className="block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 translate-x-0.5" />
          </Switch.Root>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Instructions (injected as system context)</p>
          <pre className="text-xs font-mono bg-muted/30 rounded-lg p-3 overflow-x-auto text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {skill.instructions}
          </pre>
        </div>
      )}
    </div>
  )
}

function ImportSkillDialog({ onAdd }: { onAdd: (skill: Omit<Skill, 'id'>) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleImportFile = async () => {
    const result = await window.api.skillImportFile()
    if (result.canceled) return
    if (result.error) { setError(result.error); return }
    if (result.data) { setText(result.data); setError(null) }
  }

  const handleAdd = () => {
    setError(null)
    const parsed = parseSkillMd(text.trim())
    if (!parsed) {
      setError('Invalid SKILL.md format. Make sure the file starts with a --- frontmatter block containing at least "name:" and "description:" fields.')
      return
    }
    onAdd({
      name: parsed.name,
      description: parsed.description,
      argumentHint: parsed.argumentHint,
      disableModelInvocation: parsed.disableModelInvocation,
      userInvocable: parsed.userInvocable,
      allowedTools: parsed.allowedTools,
      instructions: parsed.instructions,
      enabled: true,
      builtIn: false
    })
    setSuccess(true)
    setTimeout(() => { setOpen(false); setText(''); setSuccess(false) }, 900)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Import Skill
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[620px] max-w-[calc(100vw-2rem)] max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
            <Dialog.Title className="font-semibold text-base flex items-center gap-2">
              <Puzzle className="h-4 w-4 text-primary" />
              Import Skill (SKILL.md)
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Paste the contents of a <code className="text-xs bg-muted px-1 rounded">SKILL.md</code> file, or import one from disk.
              </p>
              <button
                onClick={handleImportFile}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-muted transition-colors shrink-0"
              >
                <Upload className="h-3 w-3" />
                Open file…
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setError(null) }}
              rows={18}
              placeholder={EXAMPLE_SKILL_MD}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs font-mono
                focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[200px]
                placeholder:text-muted-foreground/30"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Skill imported successfully!
              </div>
            )}

            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                SKILL.md format reference
              </summary>
              <div className="mt-2 rounded-xl bg-muted/20 border border-border/40 p-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Required fields</p>
                <p><code className="bg-muted px-1 rounded">name:</code> — kebab-case command name (e.g. <code className="bg-muted px-1 rounded">my-skill</code>)</p>
                <p><code className="bg-muted px-1 rounded">description:</code> — what the skill does and when to use it</p>
                <p className="font-medium text-foreground mt-2">Optional fields</p>
                <p><code className="bg-muted px-1 rounded">argument-hint:</code> — hint shown to user when they type /name</p>
                <p><code className="bg-muted px-1 rounded">disable-model-invocation: true</code> — manual only, user must type /name</p>
                <p><code className="bg-muted px-1 rounded">user-invocable: false</code> — hide from / menu</p>
                <p className="font-medium text-foreground mt-2">Body</p>
                <p>Everything after the closing <code className="bg-muted px-1 rounded">---</code> becomes the system prompt injected when the skill is used.</p>
              </div>
            </details>
          </div>

          <div className="border-t border-border/60 px-5 py-3 shrink-0 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-lg px-3 py-1.5 text-sm border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleAdd}
              disabled={!text.trim() || success}
              className="rounded-lg px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function SkillsManager(): JSX.Element {
  const { skills, addSkill, deleteSkill, toggleSkill } = useAppStore()

  const builtinSkills = skills.filter((s) => s.builtIn)
  const customSkills = skills.filter((s) => !s.builtIn)
  const enabledCount = skills.filter((s) => s.enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {enabledCount} of {skills.length} enabled · type{' '}
          <code className="bg-muted px-1 rounded">/</code> in the chat to invoke
        </p>
        <ImportSkillDialog onAdd={addSkill} />
      </div>

      {builtinSkills.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Built-in
          </h3>
          {builtinSkills.map((skill) => (
            <SkillRow key={skill.id} skill={skill} onToggle={() => toggleSkill(skill.id)} />
          ))}
        </section>
      )}

      {customSkills.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Custom
          </h3>
          {customSkills.map((skill) => (
            <SkillRow
              key={skill.id}
              skill={skill}
              onToggle={() => toggleSkill(skill.id)}
              onDelete={() => deleteSkill(skill.id)}
            />
          ))}
        </section>
      )}

      {customSkills.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
          <Terminal className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No custom skills yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Import a <code className="bg-muted px-1 rounded">SKILL.md</code> file to add one.
          </p>
        </div>
      )}
    </div>
  )
}
