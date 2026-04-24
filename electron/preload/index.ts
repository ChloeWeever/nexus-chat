import { contextBridge, ipcRenderer } from 'electron'

// Called from renderer to start a streaming LLM request.
// Returns a cleanup function that removes the listener.
function llmStream(
  req: {
    baseUrl: string
    apiKey: string
    body: Record<string, unknown>
    requestId: string
  },
  onChunk: (delta: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
): () => void {
  const channel = `llm:chunk:${req.requestId}`

  const listener = (
    _event: unknown,
    data: { delta?: string; done?: boolean; error?: string }
  ): void => {
    if (data.error) onError(data.error)
    else if (data.done) onDone()
    else if (data.delta) onChunk(data.delta)
  }

  ipcRenderer.on(channel, listener)
  // Fire and forget — chunks come back on the channel above
  ipcRenderer.invoke('llm:fetch-stream', req).catch((err: Error) => {
    onError(err.message)
  })

  return () => ipcRenderer.removeListener(channel, listener)
}

function llmFetch(req: {
  baseUrl: string
  apiKey: string
  body: Record<string, unknown>
}): Promise<{ data?: unknown; error?: string }> {
  return ipcRenderer.invoke('llm:fetch', req)
}

function webSearch(params: {
  query: string
  maxResults?: number
  apiKey: string
}): Promise<{ data?: unknown; error?: string }> {
  return ipcRenderer.invoke('tools:web-search', params)
}

function skillImportFile(): Promise<{ data?: string; error?: string; canceled?: boolean }> {
  return ipcRenderer.invoke('skills:import-file')
}

function parseFile(params: {
  name: string
  buffer: ArrayBuffer
}): Promise<{ text?: string; error?: string }> {
  return ipcRenderer.invoke('chat:parse-file', {
    name: params.name,
    buffer: Buffer.from(params.buffer)
  })
}

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  llmStream,
  llmFetch,
  webSearch,
  skillImportFile,
  parseFile
})
