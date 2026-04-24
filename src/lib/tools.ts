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

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}
