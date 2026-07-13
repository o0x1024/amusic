import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { HitIntelligenceState } from '../shared/types'
import { createLogger } from './logger'

const logger = createLogger('hit-intelligence-store')
const STORE_PATH = join(app.getPath('userData'), 'hit-intelligence.json')
const EMPTY_STATE: HitIntelligenceState = { tasteReferences: [], trendSamples: [], publishMetrics: [] }

export function loadHitIntelligence(): HitIntelligenceState {
  if (!existsSync(STORE_PATH)) return { ...EMPTY_STATE }
  try {
    const data = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as Partial<HitIntelligenceState>
    return {
      tasteReferences: Array.isArray(data.tasteReferences) ? data.tasteReferences : [],
      trendSamples: Array.isArray(data.trendSamples) ? data.trendSamples : [],
      publishMetrics: Array.isArray(data.publishMetrics) ? data.publishMetrics : []
    }
  } catch (error) {
    logger.warn('创作情报解析失败', { error: error instanceof Error ? error.message : String(error) })
    return { ...EMPTY_STATE }
  }
}

export function saveHitIntelligence(state: HitIntelligenceState): HitIntelligenceState {
  const normalized: HitIntelligenceState = {
    tasteReferences: state.tasteReferences || [],
    trendSamples: state.trendSamples || [],
    publishMetrics: state.publishMetrics || []
  }
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}
