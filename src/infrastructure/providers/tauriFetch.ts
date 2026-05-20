import { invoke } from '@tauri-apps/api/core'
import { fetch } from '@tauri-apps/plugin-http'

export interface FetchLogEntry {
  id: number
  timestamp: string
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body: string | null
  }
  response: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string | null
  } | null
  error: string | null
  durationMs: number
}

const MAX_LOGS = 100
const logs: FetchLogEntry[] = []
let nextId = 1
let logDir = ''
let logFile = ''
let initialized = false

async function ensureLogDir() {
  if (initialized) return
  const home = await invoke<string>('get_home_dir')
  logDir = `${home}/.superauthor/logs`
  logFile = `${logDir}/fetch.jsonl`
  await invoke('create_dir', { path: logDir })
  initialized = true
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => { result[key] = value })
    return result
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return { ...headers as Record<string, string> }
}

function addLog(entry: FetchLogEntry) {
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.shift()
  ensureLogDir().then(() => {
    invoke('append_file', {
      path: logFile,
      content: JSON.stringify(entry) + '\n',
    })
  })
}

/**
 * Tauri 插件 http fetch 包装层，自动记录请求/响应日志。
 * 内存保留最近 100 条，同时追加写入 ~/.superauthor/logs/fetch.jsonl
 */
export async function loggedFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const id = nextId++
  const startTime = performance.now()

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')
  const reqHeaders = headersToRecord(init?.headers)

  let reqBody: string | null = null
  if (init?.body) {
    if (typeof init.body === 'string') {
      reqBody = init.body
    } else if (init.body instanceof URLSearchParams) {
      reqBody = init.body.toString()
    }
  }

  try {
    const res = await fetch(input, init)
    const durationMs = Math.round(performance.now() - startTime)

    const resHeaders: Record<string, string> = {}
    res.headers.forEach((value, key) => { resHeaders[key] = value })

    const cloned = res.clone()
    let resBody: string | null = null
    try {
      resBody = await cloned.text()
    } catch {
      resBody = '[unreadable stream]'
    }

    addLog({
      id,
      timestamp: new Date().toISOString(),
      request: { method, url, headers: reqHeaders, body: reqBody },
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
      },
      error: null,
      durationMs,
    })

    return res
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime)
    addLog({
      id,
      timestamp: new Date().toISOString(),
      request: { method, url, headers: reqHeaders, body: reqBody },
      response: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    })
    throw err
  }
}

export function getFetchLogs(): readonly FetchLogEntry[] {
  return logs
}

export function clearFetchLogs() {
  logs.length = 0
}

export { loggedFetch as tauriFetch }

if (typeof window !== 'undefined') {
  (window as any).__fetchLogs = getFetchLogs
  ;(window as any).__clearFetchLogs = clearFetchLogs
}
