import type { Skill } from '@/types'

export const WEB_SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description:
      'Search the web for current information, recent news, and real-time facts. Use this when you need up-to-date information that may not be in your training data.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up'
        },
        max_results: {
          type: 'integer',
          description: 'Number of results to return (1–10, default 5)',
          default: 5
        }
      },
      required: ['query']
    }
  }
}

export const RUN_CODE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'run_code',
    description:
      'Execute JavaScript code and capture its output. Use this to perform calculations, transform data, solve math problems, generate formatted output, or verify logic. Use console.log() to print results.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute. Use console.log() to print results. No require() or file system access available.'
        }
      },
      required: ['code']
    }
  }
}

// System message injected when animation generation is enabled.
// Teaches the LLM to embed <animation> XML tags using inline-only HTML/CSS/JS.
export const ANIMATION_SYSTEM_MESSAGE = `## Animated Explanations

When explaining a concept that benefits from visual animation — algorithms, data structures, network protocols, sorting, math, physics, step-by-step processes — embed a self-contained HTML animation using this syntax:

<animation title="Short descriptive title">
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 680px; height: 360px; overflow: hidden; background: #0f0f1a; color: #e2e8f0; font-family: system-ui, sans-serif; }
</style>
</head>
<body>
<!-- your animated content -->
<script>
// use requestAnimationFrame or setInterval for JS-driven animation
// use CSS @keyframes with animation-iteration-count:infinite for CSS animation
// NO external scripts — everything must be inline
</script>
</body>
</html>
</animation>

Important rules:
- ONLY inline CSS and vanilla JavaScript — absolutely no <script src="...">, no CDN, no imports
- Set body to exactly 680×360 px with overflow:hidden
- CSS animations MUST include animation-iteration-count or loop manually — a one-shot animation looks broken
- Use requestAnimationFrame loops or setInterval for JavaScript-driven animation
- Dark background (#0f0f1a or similar); include a visible title and step labels inside the animation
- Place the <animation> block before your text explanation`


// Build a `use_skill` tool whose enum is the list of invocable skill names.
// The agent calls this to load a skill's full instructions on demand.
export function buildUseSkillTool(skillNames: string[]) {
  return {
    type: 'function' as const,
    function: {
      name: 'use_skill',
      description:
        "Load a skill's full instructions to guide your response. Call this once when the user's request clearly matches a skill. Do not call it if no skill fits.",
      parameters: {
        type: 'object',
        properties: {
          skill_name: {
            type: 'string',
            enum: skillNames,
            description: 'Name of the skill to load'
          }
        },
        required: ['skill_name']
      }
    }
  }
}

// Builds the system message that lists available skills for the agent to read.
export function buildSkillsSystemMessage(skills: Pick<Skill, 'name' | 'description'>[]): string {
  const list = skills.map((s) => `- **${s.name}**: ${s.description}`).join('\n')
  return (
    `## Available Skills\n` +
    `You have access to the following skills. When the user's request matches one, ` +
    `call \`use_skill\` with its name to load the full instructions before responding.\n\n` +
    list
  )
}

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | OpenAIContentPart[] | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}
