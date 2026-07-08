import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const MAX_LOG_SIZE = 5 * 1024 * 1024
const MAX_BACKUPS = 3

function logDir(): string {
  return join(process.cwd(), 'logs')
}

function ensureDir(): void {
  mkdirSync(logDir(), { recursive: true })
}

function now(): string {
  return new Date().toISOString()
}

function rotate(filePath: string): void {
  try {
    if (!existsSync(filePath)) return
    if (statSync(filePath).size < MAX_LOG_SIZE) return
    for (let i = MAX_BACKUPS; i >= 1; i--) {
      const current = i === 1 ? filePath : `${filePath}.${i - 1}`
      const target = `${filePath}.${i}`
      if (!existsSync(current)) continue
      if (i === MAX_BACKUPS && existsSync(target)) unlinkSync(target)
      renameSync(current, target)
    }
  } catch {
    // rotation failures must never break the app
  }
}

function writeLine(filePath: string, line: string): void {
  try {
    ensureDir()
    rotate(filePath)
    appendFileSync(filePath, line, 'utf8')
  } catch {
    // logging is best-effort
  }
}

function formatExtra(args: unknown[]): string {
  if (args.length === 0) return ''
  return ' ' + args.map(arg => {
    if (arg instanceof Error) return arg.stack ?? arg.message
    if (typeof arg === 'string') return arg
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }).join(' ')
}

const consoleMirror: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.log,
  warn: console.warn,
  error: console.error
}

export interface AppLogger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export function createLogger(scope: string): AppLogger {
  const filePath = () => join(logDir(), 'app.log')
  const emit = (level: LogLevel, message: string, args: unknown[]): void => {
    const line = `[${now()}] [${level.toUpperCase()}] [${scope}] ${message}${formatExtra(args)}\n`
    writeLine(filePath(), line)
    consoleMirror[level](`[${scope}] ${message}`, ...args)
  }
  return {
    debug: (message, ...args) => emit('debug', message, args),
    info: (message, ...args) => emit('info', message, args),
    warn: (message, ...args) => emit('warn', message, args),
    error: (message, ...args) => emit('error', message, args)
  }
}

function redactUrl(url: string): string {
  return url.replace(/([?&]key=)[^&]+/gi, '$1***REDACTED***')
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    result[key] = /authorization|api[-_]?key|token|secret/i.test(key)
      ? `${value.slice(0, 12)}***REDACTED***`
      : value
  }
  return result
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export interface LlmRequestLogParams {
  model: string
  provider: string
  protocol: string
  url: string
  headers: Record<string, string>
  systemPrompt: string
  userPrompt: string
  requestBody: unknown
}

export interface LlmResponseLogParams {
  requestId: string
  success: boolean
  durationMs: number
  statusCode?: number
  content?: string
  error?: string
  rawResponse?: unknown
}

function llmFilePath(): string {
  return join(logDir(), 'llm.log')
}

export const llmLog = {
  request(params: LlmRequestLogParams): string {
    const requestId = generateRequestId()
    const entry = {
      type: 'request',
      requestId,
      timestamp: now(),
      model: params.model,
      provider: params.provider,
      protocol: params.protocol,
      url: redactUrl(params.url),
      headers: redactHeaders(params.headers),
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      requestBody: params.requestBody
    }
    writeLine(llmFilePath(), JSON.stringify(entry) + '\n')
    return requestId
  },

  response(params: LlmResponseLogParams): void {
    const entry = {
      type: 'response',
      requestId: params.requestId,
      timestamp: now(),
      success: params.success,
      durationMs: params.durationMs,
      statusCode: params.statusCode,
      content: params.content,
      error: params.error,
      rawResponse: params.rawResponse
    }
    writeLine(llmFilePath(), JSON.stringify(entry) + '\n')
  }
}
