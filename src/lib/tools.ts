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

export const PLAN_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_plan',
    description:
      'For complex multi-step tasks, call this FIRST to outline your plan before executing. ' +
      'Each step will be shown to the user with a live status indicator. ' +
      'Do NOT call this for simple questions or single-step tasks.',
    parameters: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          description: 'Ordered list of steps to complete the task',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Short step label (max ~60 chars) shown in the plan panel'
              },
              detail: {
                type: 'string',
                description: 'Optional one-sentence description of what this step does'
              }
            },
            required: ['title']
          }
        }
      },
      required: ['steps']
    }
  }
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
