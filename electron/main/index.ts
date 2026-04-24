import { app, shell, BrowserWindow, ipcMain, net, dialog } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
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
  baseUrl: string
  apiKey: string
  body: Record<string, unknown>
}

// Each renderer call gets a unique requestId so chunks can be routed correctly
ipcMain.handle('llm:fetch-stream', async (event, req: LLMRequest & { requestId: string }) => {
  const url = `${req.baseUrl.replace(/\/$/, '')}/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
  if (req.apiKey) headers['Authorization'] = `Bearer ${req.apiKey}`

  console.log('[LiteLLM Request]', url, JSON.stringify({ ...req.body, messages: `[${(req.body.messages as unknown[]).length} messages]` }))

  return new Promise<{ error?: string }>((resolve) => {
    const request = net.request({ url, method: 'POST' })

    for (const [k, v] of Object.entries(headers)) request.setHeader(k, v)

    request.on('response', (response) => {
      console.log('[LiteLLM] HTTP', response.statusCode)

      if (response.statusCode !== 200) {
        let body = ''
        response.on('data', (chunk) => (body += chunk.toString()))
        response.on('end', () => {
          const msg = `HTTP ${response.statusCode}: ${body}`
          event.sender.send(`llm:chunk:${req.requestId}`, { error: msg })
          resolve({ error: msg })
        })
        return
      }

      let buffer = ''
      response.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''   // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue

          try {
            const json = JSON.parse(trimmed.slice(6))
            const delta = json.choices?.[0]?.delta?.content ?? ''
            if (delta) event.sender.send(`llm:chunk:${req.requestId}`, { delta })
          } catch {
            // partial JSON — will be reassembled next iteration
          }
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

    request.write(JSON.stringify(req.body))
    request.end()
  })
})

// Non-streaming fallback
ipcMain.handle('llm:fetch', async (_event, req: LLMRequest) => {
  const url = `${req.baseUrl.replace(/\/$/, '')}/chat/completions`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (req.apiKey) headers['Authorization'] = `Bearer ${req.apiKey}`

  console.log('[LiteLLM Request]', url, req.body)

  return new Promise<{ data?: unknown; error?: string }>((resolve) => {
    const request = net.request({ url, method: 'POST' })
    for (const [k, v] of Object.entries(headers)) request.setHeader(k, v)

    const timer = setTimeout(() => {
      request.abort()
      resolve({ error: 'Request timed out after 60s' })
    }, 60_000)

    request.on('response', (response) => {
      let body = ''
      response.on('data', (chunk) => (body += chunk.toString()))
      response.on('end', () => {
        clearTimeout(timer)
        if (response.statusCode !== 200) {
          resolve({ error: `HTTP ${response.statusCode}: ${body}` })
        } else {
          try {
            resolve({ data: JSON.parse(body) })
          } catch {
            resolve({ error: `Invalid JSON response: ${body.slice(0, 200)}` })
          }
        }
      })
    })

    request.on('error', (err) => {
      clearTimeout(timer)
      resolve({ error: err.message })
    })
    request.write(JSON.stringify(req.body))
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
