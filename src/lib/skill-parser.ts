export interface SkillFrontmatter {
  name: string
  description: string
  'argument-hint'?: string
  'disable-model-invocation'?: boolean
  'user-invocable'?: boolean
  'allowed-tools'?: string[]
  model?: string
  context?: 'main' | 'fork'
  agent?: string
}

export interface ParsedSkillMd {
  name: string
  description: string
  argumentHint?: string
  disableModelInvocation: boolean
  userInvocable: boolean
  allowedTools?: string[]
  instructions: string  // SKILL.md body without frontmatter
}

// Minimal YAML parser for the SKILL.md frontmatter subset.
// Handles: string scalars, boolean scalars, and simple block sequences.
function parseYamlFrontmatter(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lines = yaml.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const kvMatch = line.match(/^([a-zA-Z][a-zA-Z0-9-]*):\s*(.*)$/)
    if (!kvMatch) { i++; continue }

    const key = kvMatch[1]
    const rest = kvMatch[2].trim()

    if (rest === '') {
      // Block sequence: following lines are `  - item`
      const items: string[] = []
      i++
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        items.push(lines[i].replace(/^\s+-\s+/, '').trim())
        i++
      }
      out[key] = items
    } else if (rest === 'true') {
      out[key] = true
      i++
    } else if (rest === 'false') {
      out[key] = false
      i++
    } else {
      // Strip surrounding quotes if present
      out[key] = rest.replace(/^["']|["']$/g, '')
      i++
    }
  }

  return out
}

export function parseSkillMd(markdown: string): ParsedSkillMd | null {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null

  try {
    const fm = parseYamlFrontmatter(match[1])
    const name = fm.name as string | undefined
    if (!name || typeof name !== 'string' || !name.trim()) return null

    return {
      name: name.trim(),
      description: ((fm.description as string) ?? '').trim(),
      argumentHint: fm['argument-hint'] as string | undefined,
      disableModelInvocation: (fm['disable-model-invocation'] as boolean) ?? false,
      userInvocable: (fm['user-invocable'] as boolean) ?? true,
      allowedTools: fm['allowed-tools'] as string[] | undefined,
      instructions: match[2].trim()
    }
  } catch {
    return null
  }
}

export function buildSkillMd(skill: ParsedSkillMd): string {
  const lines = [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.description}`
  ]
  if (skill.argumentHint) lines.push(`argument-hint: ${skill.argumentHint}`)
  if (skill.disableModelInvocation) lines.push(`disable-model-invocation: true`)
  if (!skill.userInvocable) lines.push(`user-invocable: false`)
  if (skill.allowedTools?.length) {
    lines.push('allowed-tools:')
    skill.allowedTools.forEach((t) => lines.push(`  - ${t}`))
  }
  lines.push('---', '', skill.instructions)
  return lines.join('\n')
}
