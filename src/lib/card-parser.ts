import type { CardType, ContentBlock, CardData } from '@/types'

const CARD_PATTERN = /<card\s+([^>]+)>([\s\S]*?)<\/card>/g

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrPattern = /(\w+)="([^"]*)"/g
  let match: RegExpExecArray | null

  while ((match = attrPattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

export function parseContentBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  let lastIndex = 0

  CARD_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = CARD_PATTERN.exec(text)) !== null) {
    // Text before this card
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim()
      if (textContent) {
        blocks.push({ type: 'text', content: textContent })
      }
    }

    // Parse the card
    try {
      const attrs = parseAttributes(match[1])
      const rawJson = match[2].trim()
      const data = JSON.parse(rawJson) as CardData

      blocks.push({
        type: 'card',
        cardType: attrs.type as CardType,
        title: attrs.title,
        data
      })
    } catch {
      // If parsing fails, treat as text
      blocks.push({ type: 'text', content: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last card
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex).trim()
    if (textContent) {
      blocks.push({ type: 'text', content: textContent })
    }
  }

  // If no blocks were created, return the full text as a single text block
  if (blocks.length === 0) {
    return [{ type: 'text', content: text }]
  }

  return blocks
}

export function hasCards(text: string): boolean {
  CARD_PATTERN.lastIndex = 0
  return CARD_PATTERN.test(text)
}
