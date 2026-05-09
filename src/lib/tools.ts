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

export const GENERATE_ANIMATION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_animation',
    description:
      'Create a self-contained animated HTML visualization to explain a concept visually. ' +
      'Use this whenever an animation would genuinely help the user understand something: ' +
      'algorithms, data structures, network protocols, physics, math, biological processes, ' +
      'step-by-step workflows, etc. Always add clear labels and narration text inside the animation. ' +
      'Prefer a dark background. You may load GSAP from ' +
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js for complex motion.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short descriptive title, e.g. "How TCP Three-Way Handshake Works"'
        },
        html: {
          type: 'string',
          description:
            'Complete self-contained HTML document with all CSS and JavaScript inline. ' +
            'Will be rendered in a sandboxed iframe (allow-scripts only, no network from sandbox). ' +
            'External scripts must be loaded via <script src="..."> inside the HTML. ' +
            'Target 16:9 aspect ratio, designed for ~680×360 px.'
        }
      },
      required: ['title', 'html']
    }
  }
}


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
