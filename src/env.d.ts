/// <reference types="vite/client" />

interface Window {
  api: {
    platform: string
    llmStream: (
      req: {
        provider?: string
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
      provider?: string
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
    runJS: (params: { code: string }) => Promise<{ output?: string; error?: string }>
    ocrImage: (params: { dataUrl: string }) => Promise<{ text?: string; error?: string }>
    pet: {
      fetchManifest: () => Promise<{ data?: unknown; error?: string }>
    }
  }
}
