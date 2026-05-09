import type { CardType, ContentBlock, CardData, AnimationBlock } from '@/types'

const CARD_PATTERN = /<card\s+([^>]+)>([\s\S]*?)<\/card>/g
const ANIM_PATTERN = /<animation(?:\s+([^>]*?))?>([\s\S]*?)<\/animation>/g

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrPattern = /(\w+)="([^"]*)"/g
  let match: RegExpExecArray | null

  while ((match = attrPattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

interface RawBlock {
  index: number
  length: number
  block: ContentBlock
}

export function parseContentBlocks(text: string): ContentBlock[] {
  const raw: RawBlock[] = []

  // Collect <card> blocks
  CARD_PATTERN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CARD_PATTERN.exec(text)) !== null) {
    try {
      const attrs = parseAttributes(m[1])
      const data = JSON.parse(m[2].trim()) as CardData
      raw.push({
        index: m.index,
        length: m[0].length,
        block: { type: 'card', cardType: attrs.type as CardType, title: attrs.title, data }
      })
    } catch {
      // fall through: leave unparseable card as text
    }
  }

  // Collect <animation> blocks
  ANIM_PATTERN.lastIndex = 0
  while ((m = ANIM_PATTERN.exec(text)) !== null) {
    const attrs = m[1] ? parseAttributes(m[1]) : {}
    const block: AnimationBlock = { type: 'animation', html: m[2], title: attrs.title }
    raw.push({ index: m.index, length: m[0].length, block })
  }

  // Sort all blocks by position in the source text
  raw.sort((a, b) => a.index - b.index)

  // Interleave with text segments between blocks
  const blocks: ContentBlock[] = []
  let lastIndex = 0

  for (const r of raw) {
    if (r.index > lastIndex) {
      const txt = text.slice(lastIndex, r.index).trim()
      if (txt) blocks.push({ type: 'text', content: txt })
    }
    blocks.push(r.block)
    lastIndex = r.index + r.length
  }

  if (lastIndex < text.length) {
    const txt = text.slice(lastIndex).trim()
    if (txt) blocks.push({ type: 'text', content: txt })
  }

  if (blocks.length === 0) {
    return [{ type: 'text', content: text }]
  }

  return blocks
}

export function hasCards(text: string): boolean {
  CARD_PATTERN.lastIndex = 0
  ANIM_PATTERN.lastIndex = 0
  return CARD_PATTERN.test(text) || ANIM_PATTERN.test(text)
}
