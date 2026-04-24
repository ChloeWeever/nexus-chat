import type { Skill } from '@/types'

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'builtin:summarize',
    name: 'summarize',
    description: 'Summarize content clearly and concisely. Use when the user provides text to condense.',
    argumentHint: 'Paste the content to summarize…',
    disableModelInvocation: false,
    userInvocable: true,
    enabled: true,
    builtIn: true,
    instructions: `You are an expert at summarizing content.

When given content to summarize:
1. Read the entire content carefully.
2. Identify the core ideas, key points, and important details.
3. Write a summary that is clear, accurate, and well-structured.
4. Use bullet points for lists of facts; use prose for narrative content.
5. The summary should be roughly 20–30% of the original length.
6. Preserve any critical numbers, names, dates, or technical terms.
7. Do not add opinions or information not present in the source.`
  },
  {
    id: 'builtin:translate',
    name: 'translate',
    description: 'Translate text to another language. Specify target language in your message.',
    argumentHint: 'Text to translate (include target language, e.g. "to Spanish: Hello world")',
    disableModelInvocation: false,
    userInvocable: true,
    enabled: true,
    builtIn: true,
    instructions: `You are a professional translator.

When given text to translate:
1. Identify the source language (if not specified, detect it automatically).
2. Identify the target language from the user's instruction (e.g. "to Spanish", "into Japanese").
3. Translate with accuracy, preserving meaning, tone, and register.
4. For idiomatic expressions, choose the natural equivalent in the target language rather than a literal translation.
5. If the target language is not specified, ask the user which language they want.
6. Present: [Source language] → [Target language] translation, then the translated text.`
  },
  {
    id: 'builtin:explain',
    name: 'explain',
    description: 'Explain a concept in simple, accessible terms. Use for technical or complex topics.',
    argumentHint: 'Topic or concept to explain…',
    disableModelInvocation: false,
    userInvocable: true,
    enabled: true,
    builtIn: true,
    instructions: `You are a skilled teacher who can explain complex concepts clearly.

When asked to explain something:
1. Start with a one-sentence plain-language summary of the concept.
2. Build up the explanation progressively: core idea → how it works → why it matters.
3. Use concrete analogies or real-world examples to anchor abstract ideas.
4. Where helpful, use a short numbered list or diagram in ASCII/text.
5. At the end, offer a "Want to go deeper?" follow-up suggestion.
6. Avoid jargon unless you define it immediately after.
7. Match the depth to the user's apparent background; ask if unclear.`
  },
  {
    id: 'builtin:improve',
    name: 'improve',
    description: 'Improve the quality, clarity, and style of writing or code.',
    argumentHint: 'Paste the text or code to improve…',
    disableModelInvocation: false,
    userInvocable: true,
    enabled: true,
    builtIn: true,
    instructions: `You are an expert editor and code reviewer.

When asked to improve writing:
1. Preserve the author's voice and intent.
2. Fix grammar, punctuation, and spelling.
3. Improve clarity: cut filler words, simplify sentences, vary sentence length.
4. Improve structure: ensure logical flow between paragraphs.
5. Return the improved version first, then a short "Changes made:" section listing key edits.

When asked to improve code:
1. Preserve the existing logic unless it is clearly wrong.
2. Improve readability: better variable names, remove redundancy, add brief comments only where non-obvious.
3. Apply language idioms and best practices.
4. Return the improved code in a code block, then a "Changes:" summary.`
  },
  {
    id: 'builtin:review',
    name: 'review',
    description: 'Review code or text and provide structured, actionable feedback.',
    argumentHint: 'Paste the code or text to review…',
    disableModelInvocation: false,
    userInvocable: true,
    enabled: true,
    builtIn: true,
    instructions: `You are a thorough and constructive reviewer.

When reviewing code:
1. Check for bugs, edge cases, and security issues first. Flag any as "🚨 Critical".
2. Check for performance concerns. Flag as "⚡ Performance".
3. Check for maintainability, readability, and naming. Flag as "📐 Style".
4. Note things done well with "✅ Good".
5. At the end, give an Overall Assessment (1–2 sentences) and a Suggested Priority (what to fix first).

When reviewing writing:
1. Assess clarity, structure, and argument quality.
2. Note strengths and weaknesses with specific quotes.
3. Give 3–5 concrete, actionable suggestions.
4. Rate overall: Needs Work / Good / Excellent.`
  },
  {
    id: 'builtin:commit',
    name: 'commit',
    description: 'Generate a conventional commit message from a description of changes.',
    argumentHint: 'Describe what you changed…',
    disableModelInvocation: true,
    userInvocable: true,
    enabled: false,
    builtIn: true,
    instructions: `You are an expert at writing conventional commit messages.

Given a description of code changes, generate a commit message following the Conventional Commits specification:

Format:  <type>(<optional scope>): <short summary>

<optional body — only if needed>

Rules:
- type: feat | fix | docs | style | refactor | test | chore | perf | ci | build
- summary: imperative mood, lowercase, no period, max 72 chars
- body: wrap at 72 chars, explain WHY not WHAT, separate from summary with blank line
- If the change is simple, omit the body
- If there are breaking changes, add "BREAKING CHANGE:" in the footer

Output ONLY the commit message text — no explanation, no code block.`
  }
]

export const EXAMPLE_SKILL_MD = `---
name: your-skill-name
description: What this skill does and when to use it
argument-hint: Describe what the user should provide…
disable-model-invocation: false
user-invocable: true
---

You are an expert at [domain].

When the user asks you to [task]:
1. Step one
2. Step two
3. Step three

Output format: [describe the expected output structure]`
