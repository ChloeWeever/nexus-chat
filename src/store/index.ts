import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Conversation, Message, AppSettings, ToolUseInfo, Skill } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { generateId } from '@/lib/utils'
import { parseContentBlocks } from '@/lib/card-parser'
import { BUILTIN_SKILLS } from '@/lib/skills'

interface AppStore {
  // State
  conversations: Conversation[]
  activeConversationId: string | null
  isStreaming: boolean
  settings: AppSettings
  pendingPrompt: string | null
  skills: Skill[]

  // Conversation actions
  createConversation: () => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void
  updateConversationTitle: (id: string, title: string) => void

  // Message actions
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => string
  appendToMessage: (conversationId: string, messageId: string, delta: string) => void
  finalizeMessage: (conversationId: string, messageId: string) => void
  setMessageError: (conversationId: string, messageId: string, error: string) => void
  setMessageToolUse: (conversationId: string, messageId: string, toolUse: ToolUseInfo[]) => void
  setMessageStatus: (conversationId: string, messageId: string, statusText: string) => void
  removeMessage: (conversationId: string, messageId: string) => void

  // Streaming state
  setIsStreaming: (value: boolean) => void

  // Pending prompt (from WelcomeScreen quick-prompts)
  setPendingPrompt: (prompt: string | null) => void

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void
  updateLiteLLM: (config: Partial<AppSettings['litellm']>) => void

  // Skill actions
  addSkill: (skill: Omit<Skill, 'id'>) => string
  updateSkill: (id: string, updates: Partial<Omit<Skill, 'id' | 'builtIn'>>) => void
  deleteSkill: (id: string) => void
  toggleSkill: (id: string) => void
}

function mergeBuiltinSkills(persisted: Skill[]): Skill[] {
  // Ensure all built-in skills exist; preserve user's enabled/disabled choice
  const result = [...persisted]
  for (const builtin of BUILTIN_SKILLS) {
    const existing = result.find((s) => s.id === builtin.id)
    if (!existing) {
      result.unshift(builtin)
    } else {
      // Keep user's enabled state but update the rest from source
      const idx = result.indexOf(existing)
      result[idx] = { ...builtin, enabled: existing.enabled }
    }
  }
  return result
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      settings: DEFAULT_SETTINGS,
      pendingPrompt: null,
      skills: BUILTIN_SKILLS,

      createConversation: () => {
        const id = generateId()
        const now = Date.now()
        const conversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: now,
          updatedAt: now
        }
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id
        }))
        return id
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id)
          const newActiveId =
            state.activeConversationId === id
              ? (filtered[0]?.id ?? null)
              : state.activeConversationId
          return {
            conversations: filtered,
            activeConversationId: newActiveId
          }
        })
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id })
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          )
        }))
      },

      addMessage: (conversationId, messageData) => {
        const id = generateId()
        const message: Message = {
          ...messageData,
          id,
          timestamp: Date.now()
        }
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            // Auto-title from first user message
            const isFirst = c.messages.length === 0 && message.role === 'user'
            const title = isFirst
              ? message.content.slice(0, 50) + (message.content.length > 50 ? '…' : '')
              : c.title
            return {
              ...c,
              title,
              messages: [...c.messages, message],
              updatedAt: Date.now()
            }
          })
        }))
        return id
      },

      appendToMessage: (conversationId, messageId, delta) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m
                // Clear statusText on first real content
                return { ...m, content: m.content + delta, statusText: undefined }
              })
            }
          })
        }))
      },

      finalizeMessage: (conversationId, messageId) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m
                const blocks = parseContentBlocks(m.content)
                return { ...m, blocks, isStreaming: false }
              }),
              updatedAt: Date.now()
            }
          })
        }))
      },

      setMessageError: (conversationId, messageId, error) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m
                return { ...m, error, isStreaming: false }
              })
            }
          })
        }))
      },

      setIsStreaming: (value) => set({ isStreaming: value }),

      setMessageStatus: (conversationId, messageId, statusText) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m
                return { ...m, statusText }
              })
            }
          })
        }))
      },

      setMessageToolUse: (conversationId, messageId, toolUse) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m
                return { ...m, toolUse }
              })
            }
          })
        }))
      },

      removeMessage: (conversationId, messageId) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now()
            }
          })
        }))
      },

      setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),

      updateSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
            litellm: { ...state.settings.litellm, ...(settings.litellm ?? {}) },
            appearance: { ...state.settings.appearance, ...(settings.appearance ?? {}) },
            chat: { ...state.settings.chat, ...(settings.chat ?? {}) }
          }
        }))
      },

      updateLiteLLM: (config) => {
        set((state) => ({
          settings: {
            ...state.settings,
            litellm: { ...state.settings.litellm, ...config }
          }
        }))
      },

      addSkill: (skillData) => {
        const id = `custom:${generateId()}`
        const skill: Skill = { ...skillData, id, builtIn: false, enabled: true }
        set((state) => ({ skills: [...state.skills, skill] }))
        return id
      },

      updateSkill: (id, updates) => {
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? { ...s, ...updates } : s))
        }))
      },

      deleteSkill: (id) => {
        set((state) => ({
          skills: state.skills.filter((s) => s.id !== id || s.builtIn)
        }))
      },

      toggleSkill: (id) => {
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
        }))
      }
    }),
    {
      name: 'nexus-chat-store',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        settings: state.settings,
        skills: state.skills
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.skills = mergeBuiltinSkills(state.skills ?? [])
        }
      }
    }
  )
)
