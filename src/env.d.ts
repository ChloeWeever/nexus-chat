/// <reference types="vite/client" />

interface Window {
  api: {
    platform: string
    llmStream: (
      req: {
        baseUrl: string
        apiKey: string
        body: Record<string, unknown>
        requestId: string
      },
      onChunk: (delta: string) => void,
      onDone: () => void,
      onError: (msg: string) => void
    ) => () => void
    llmFetch: (req: {
      baseUrl: string
      apiKey: string
      body: Record<string, unknown>
    }) => Promise<{ data?: unknown; error?: string }>
    webSearch: (params: {
      query: string
      maxResults?: number
      apiKey: string
    }) => Promise<{ data?: unknown; error?: string }>
    skillImportFile: () => Promise<{ data?: string; error?: string; canceled?: boolean }>
    parseFile: (params: { name: string; buffer: ArrayBuffer }) => Promise<{ text?: string; error?: string }>
  }
}
