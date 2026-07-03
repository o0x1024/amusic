import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { HistoryRecord } from '../shared/types'

const HISTORY_PATH = join(app.getPath('userData'), 'history.json')
const MAX_HISTORY = 20

export function loadHistory(): HistoryRecord[] {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    const parsed = JSON.parse(readFileSync(HISTORY_PATH, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addHistory(record: HistoryRecord): HistoryRecord[] {
  const history = loadHistory()
  history.unshift(record)
  const trimmed = history.slice(0, MAX_HISTORY)
  mkdirSync(dirname(HISTORY_PATH), { recursive: true })
  writeFileSync(HISTORY_PATH, JSON.stringify(trimmed, null, 2), 'utf8')
  return trimmed
}

export function clearHistory(): HistoryRecord[] {
  mkdirSync(dirname(HISTORY_PATH), { recursive: true })
  writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2), 'utf8')
  return []
}
