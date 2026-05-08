import { app, shell, BrowserWindow, ipcMain, net, dialog } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { Worker } from 'worker_threads'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── LiteLLM streaming via main process (avoids CORS in dev) ─────────────────

interface LLMRequest {
  provider?: 'litellm' | 'openai' | 'anthropic'
  baseUrl: string
  apiKey: string
  body: Record<string, unknown>
}

type OAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface OAIMessage {
  role: string
  content: string | OAIContentPart[] | null
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

function getLLMTarget(req: LLMRequest): { url: string; headers: Record<string, string> } {
  if (req.provider === 'anthropic') {
    const base = (req.baseUrl.trim() || 'https://api.anthropic.com/v1').replace(/\/$/, '')
    return {
      url: `${base}/messages`,
      headers: {
        'content-type': 'application/json',
        'x-api-key': req.apiKey,
        'anthropic-version': '2023-06-01'
      }
    }
  }
  if (req.provider === 'openai') {
    const base = (req.baseUrl.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
    return {
      url: `${base}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(req.apiKey ? { 'Authorization': `Bearer ${req.apiKey}` } : {})
      }
    }
  }
  // litellm (default)
  return {
    url: `${req.baseUrl.replace(/\/$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(req.apiKey ? { 'Authorization': `Bearer ${req.apiKey}` } : {})
    }
  }
}

function toAnthropicContent(content: string | OAIContentPart[] | null): unknown {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content.map((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text }
    if (part.type === 'image_url') {
      const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
      if (match) return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } }
    }
    return { type: 'text', text: '' }
  })
}

function toAnthropicTools(
  tools: Array<{ type: string; function: { name: string; description?: string; parameters: unknown } }>
): unknown[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description ?? '',
    input_schema: t.function.parameters
  }))
}

function buildAnthropicBody(body: Record<string, unknown>): Record<string, unknown> {
  const messages = (body.messages as OAIMessage[]) ?? []

  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .filter(Boolean)
    .join('\n\n')

  const nonSystem = messages.filter((m) => m.role !== 'system')
  const anthropicMessages: unknown[] = []
  let i = 0

  while (i < nonSystem.length) {
    const msg = nonSystem[i]

    if (msg.role === 'tool') {
      // Collect consecutive tool results into a single Anthropic user message
      const toolResults: unknown[] = []
      while (i < nonSystem.length && nonSystem[i].role === 'tool') {
        const tm = nonSystem[i]
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tm.tool_call_id,
          content: typeof tm.content === 'string' ? tm.content : ''
        })
        i++
      }
      anthropicMessages.push({ role: 'user', content: toolResults })
      continue
    }

    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      const content: unknown[] = []
      if (msg.content) content.push({ type: 'text', text: msg.content })
      for (const tc of msg.tool_calls) {
        let input: unknown = {}
        try { input = JSON.parse(tc.function.arguments) } catch { /* ignore */ }
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input })
      }
      anthropicMessages.push({ role: 'assistant', content })
      i++
      continue
    }

    anthropicMessages.push({ role: msg.role, content: toAnthropicContent(msg.content) })
    i++
  }

  const tools = body.tools
    ? toAnthropicTools(body.tools as Array<{ type: string; function: { name: string; description?: string; parameters: unknown } }>)
    : undefined

  return {
    model: body.model,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    ...(system ? { system } : {}),
    messages: anthropicMessages,
    ...(tools ? { tools } : {}),
    ...(body.stream ? { stream: true } : {})
  }
}

function extractStreamDelta(line: string, provider?: string): string | null {
  if (!line.startsWith('data: ')) return null
  const raw = line.slice(6).trim()
  if (raw === '[DONE]') return null
  try {
    const json = JSON.parse(raw)
    if (provider === 'anthropic') {
      if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta')
        return json.delta.text ?? null
      return null
    }
    return json.choices?.[0]?.delta?.content ?? null
  } catch {
    return null
  }
}

function isStreamDone(line: string, provider?: string): boolean {
  if (provider === 'anthropic') {
    if (!line.startsWith('data: ')) return false
    try { return JSON.parse(line.slice(6)).type === 'message_stop' } catch { return false }
  }
  return line.trim() === 'data: [DONE]'
}

function normalizeNonStreamResponse(data: Record<string, unknown>, provider?: string): unknown {
  if (provider === 'anthropic') {
    const content = (data.content as Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>) ?? []
    const textParts = content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
    const toolUseParts = content.filter((c) => c.type === 'tool_use')

    if (toolUseParts.length > 0) {
      return {
        choices: [{
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            content: textParts || null,
            tool_calls: toolUseParts.map((t) => ({
              id: t.id,
              type: 'function',
              function: { name: t.name, arguments: JSON.stringify(t.input ?? {}) }
            }))
          }
        }]
      }
    }

    return { choices: [{ finish_reason: 'stop', message: { content: textParts } }] }
  }
  return data
}

// Each renderer call gets a unique requestId so chunks can be routed correctly
ipcMain.handle('llm:fetch-stream', async (event, req: LLMRequest & { requestId: string }) => {
  const { url, headers } = getLLMTarget(req)
  const body = req.provider === 'anthropic' ? buildAnthropicBody(req.body) : req.body

  console.log('[LLM Request]', req.provider ?? 'litellm', url, JSON.stringify({ ...body, messages: `[${(body.messages as unknown[])?.length} messages]` }))

  return new Promise<{ error?: string }>((resolve) => {
    const request = net.request({ url, method: 'POST' })
    for (const [k, v] of Object.entries(headers)) request.setHeader(k, v)

    request.on('response', (response) => {
      console.log('[LLM] HTTP', response.statusCode)

      if (response.statusCode !== 200) {
        let errBody = ''
        response.on('data', (chunk) => (errBody += chunk.toString()))
        response.on('end', () => {
          const msg = `HTTP ${response.statusCode}: ${errBody}`
          event.sender.send(`llm:chunk:${req.requestId}`, { error: msg })
          resolve({ error: msg })
        })
        return
      }

      let buffer = ''
      response.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (isStreamDone(trimmed, req.provider)) {
            event.sender.send(`llm:chunk:${req.requestId}`, { done: true })
            resolve({})
            return
          }
          const delta = extractStreamDelta(trimmed, req.provider)
          if (delta) event.sender.send(`llm:chunk:${req.requestId}`, { delta })
        }
      })

      response.on('end', () => {
        event.sender.send(`llm:chunk:${req.requestId}`, { done: true })
        resolve({})
      })

      response.on('error', (err) => {
        event.sender.send(`llm:chunk:${req.requestId}`, { error: err.message })
        resolve({ error: err.message })
      })
    })

    request.on('error', (err) => {
      event.sender.send(`llm:chunk:${req.requestId}`, { error: err.message })
      resolve({ error: err.message })
    })

    request.write(JSON.stringify(body))
    request.end()
  })
})

// Non-streaming fallback
ipcMain.handle('llm:fetch', async (_event, req: LLMRequest) => {
  const { url, headers: baseHeaders } = getLLMTarget(req)
  const headers = { ...baseHeaders, Accept: 'application/json' }
  const body = req.provider === 'anthropic' ? buildAnthropicBody(req.body) : req.body

  console.log('[LLM Request]', req.provider ?? 'litellm', url, body)

  return new Promise<{ data?: unknown; error?: string }>((resolve) => {
    const request = net.request({ url, method: 'POST' })
    for (const [k, v] of Object.entries(headers)) request.setHeader(k, v)

    const timer = setTimeout(() => {
      request.abort()
      resolve({ error: 'Request timed out after 60s' })
    }, 60_000)

    request.on('response', (response) => {
      let respBody = ''
      response.on('data', (chunk) => (respBody += chunk.toString()))
      response.on('end', () => {
        clearTimeout(timer)
        if (response.statusCode !== 200) {
          resolve({ error: `HTTP ${response.statusCode}: ${respBody}` })
        } else {
          try {
            const parsed = JSON.parse(respBody)
            resolve({ data: normalizeNonStreamResponse(parsed, req.provider) })
          } catch {
            resolve({ error: `Invalid JSON response: ${respBody.slice(0, 200)}` })
          }
        }
      })
    })

    request.on('error', (err) => {
      clearTimeout(timer)
      resolve({ error: err.message })
    })
    request.write(JSON.stringify(body))
    request.end()
  })
})

// ─── Ollama Web Search ────────────────────────────────────────────────────────

interface WebSearchParams {
  query: string
  maxResults?: number
  apiKey: string
}

ipcMain.handle('tools:web-search', async (_event, params: WebSearchParams) => {
  return new Promise<{ data?: unknown; error?: string }>((resolve) => {
    const request = net.request({
      url: 'https://ollama.com/api/web_search',
      method: 'POST'
    })
    request.setHeader('Content-Type', 'application/json')
    request.setHeader('Authorization', `Bearer ${params.apiKey}`)

    let body = ''
    request.on('response', (response) => {
      response.on('data', (chunk) => (body += chunk.toString()))
      response.on('end', () => {
        if (response.statusCode !== 200) {
          resolve({ error: `HTTP ${response.statusCode}: ${body}` })
        } else {
          try {
            resolve({ data: JSON.parse(body) })
          } catch {
            resolve({ error: `Invalid JSON: ${body.slice(0, 100)}` })
          }
        }
      })
    })
    request.on('error', (err) => resolve({ error: err.message }))
    request.write(JSON.stringify({ query: params.query, max_results: params.maxResults ?? 5 }))
    request.end()
  })
})

// ─── Skill import (reads SKILL.md or a plain .md file) ───────────────────────

ipcMain.handle('skills:import-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import Skill (SKILL.md)',
    filters: [
      { name: 'Skill Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true }
  try {
    const content = readFileSync(result.filePaths[0], 'utf-8')
    return { data: content }
  } catch (err) {
    return { error: String(err) }
  }
})

// ─── File parser ─────────────────────────────────────────────────────────────

ipcMain.handle('chat:parse-file', async (_event, { name, buffer }: { name: string; buffer: Buffer }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  try {
    if (ext === 'pdf') {
      const parser = new PDFParse({ data: Buffer.from(buffer) })
      const result = await parser.getText()
      return { text: result.text }
    }

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      return { text: result.value }
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(Buffer.from(buffer))
      const parts: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
        if (csv.trim()) parts.push(`[Sheet: ${sheetName}]\n${csv}`)
      }
      return { text: parts.join('\n\n') }
    }

    if (ext === 'pptx') {
      const zip = await JSZip.loadAsync(Buffer.from(buffer))
      const slideEntries = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] ?? '0')
          const nb = parseInt(b.match(/\d+/)?.[0] ?? '0')
          return na - nb
        })
      const parts: string[] = []
      let slideNum = 1
      for (const entry of slideEntries) {
        const xml = await zip.files[entry].async('string')
        const texts = (xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [])
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .filter(Boolean)
        if (texts.length) parts.push(`[Slide ${slideNum}]\n${texts.join(' ')}`)
        slideNum++
      }
      return { text: parts.join('\n\n') }
    }

    return { error: `Unsupported format: .${ext}` }
  } catch (err) {
    return { error: String(err) }
  }
})

// ─── JS Code Execution (Node vm in worker thread) ───────────────────────────

ipcMain.handle('code:run-js', async (_event, { code }: { code: string }) => {
  const TIMEOUT_MS = 10_000
  return new Promise<{ output?: string; error?: string }>((resolve) => {
    const workerSrc = `
const { workerData, parentPort } = require('worker_threads')
const vm = require('vm')
const lines = []
const fmt = (x) => {
  if (x === null) return 'null'
  if (x === undefined) return 'undefined'
  if (typeof x === 'object') { try { return JSON.stringify(x, null, 2) } catch { return String(x) } }
  return String(x)
}
const sandbox = {
  console: {
    log: (...a) => lines.push(a.map(fmt).join(' ')),
    error: (...a) => lines.push('[stderr] ' + a.map(fmt).join(' ')),
    warn: (...a) => lines.push('[warn] ' + a.map(fmt).join(' ')),
    info: (...a) => lines.push(a.map(fmt).join(' ')),
  },
  Math, JSON, Array, Object, String, Number, Boolean, Date, RegExp, Error,
  TypeError, RangeError, SyntaxError, Map, Set, WeakMap, WeakSet, Symbol, BigInt,
  parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  encodeURIComponent, decodeURIComponent,
}
try {
  const result = vm.runInNewContext(workerData.code, sandbox, { timeout: 9000 })
  if (result !== undefined) lines.push(fmt(result))
  parentPort.postMessage({ output: lines.join('\\n') })
} catch (err) {
  parentPort.postMessage({ output: lines.join('\\n'), error: err.message })
}
`
    let resolved = false
    const worker = new Worker(workerSrc, { eval: true, workerData: { code } })

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        worker.terminate()
        resolve({ error: `Timed out after ${TIMEOUT_MS / 1000}s` })
      }
    }, TIMEOUT_MS)

    worker.on('message', (msg: { output?: string; error?: string }) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        resolve(msg)
      }
    })

    worker.on('error', (err: Error) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        resolve({ error: err.message })
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.nexus-chat.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
