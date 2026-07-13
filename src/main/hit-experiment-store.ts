import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { HitExperimentRecord } from '../shared/types'
import { createLogger } from './logger'

const logger = createLogger('hit-experiment-store')
const STORE_PATH = join(app.getPath('userData'), 'hit-experiments.json')
const MAX_EXPERIMENTS = 50

export function loadHitExperiments(): HitExperimentRecord[] {
  if (!existsSync(STORE_PATH)) return []
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logger.warn('爆款实验记录解析失败', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

export function saveHitExperiment(record: HitExperimentRecord): HitExperimentRecord[] {
  const records = loadHitExperiments().filter(item => item.id !== record.id)
  records.unshift({ ...record, updatedAt: Date.now() })
  const trimmed = records.slice(0, MAX_EXPERIMENTS)
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(trimmed, null, 2), 'utf8')
  return trimmed
}
