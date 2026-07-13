import { ipcMain } from 'electron'
import type { AppSettings, FavoriteRecord, HitExperimentRecord, HitLabRequest, HistoryRecord, LyricsDraftRequest, ModelConfig, PromptFromLyricsRequest, SongRequest } from '../shared/types'
import { generateHitLab, generateHitLabIdea, generateLyricsDraft, generatePromptFromLyrics, generateSong, listModels, testModelConnection } from './ai-service'
import { addFavorite, deleteFavorite, loadFavorites } from './favorites-store'
import { addHistory, clearHistory, loadHistory } from './history-store'
import { createLogger } from './logger'
import { loadSettings, saveSettings } from './settings-store'
import { loadHitExperiments, saveHitExperiment } from './hit-experiment-store'
import { loadHitIntelligence, saveHitIntelligence } from './hit-intelligence-store'
import { getMusicGenerationStatus, submitMusicGeneration } from './music-platform-service'
import type { HitIntelligenceState } from '../shared/types'

const logger = createLogger('ipc')

function handle<A extends unknown[]>(channel: string, handler: (...args: A) => Promise<unknown> | unknown): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    const start = Date.now()
    logger.debug(`IPC 调用 ${channel}`)
    try {
      const result = await handler(...(args as A))
      logger.debug(`IPC 完成 ${channel}`, { durationMs: Date.now() - start })
      return result
    } catch (error) {
      logger.error(`IPC 失败 ${channel}`, { error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  })
}

export function registerIpcHandlers(): void {
  handle('app:getInfo', () => ({ name: 'amusic', version: '0.1.0' }))
  handle('settings:get', () => loadSettings())
  handle('settings:save', (settings: AppSettings) => saveSettings(settings))
  handle('model:test', (config: ModelConfig) => testModelConnection(config))
  handle('model:list', (config: ModelConfig) => listModels(config))
  handle('music:generate', (request: SongRequest) => generateSong(request))
  handle('lyrics:generate', (request: LyricsDraftRequest) => generateLyricsDraft(request))
  handle('lyrics:prompt', (request: PromptFromLyricsRequest) => generatePromptFromLyrics(request))
  handle('hit-lab:generate', (request: HitLabRequest) => generateHitLab(request))
  handle('hit-lab:random-idea', (request: HitLabRequest) => generateHitLabIdea(request))
  handle('hit-experiments:list', () => loadHitExperiments())
  handle('hit-experiments:save', (record: HitExperimentRecord) => saveHitExperiment(record))
  handle('hit-intelligence:get', () => loadHitIntelligence())
  handle('hit-intelligence:save', (state: HitIntelligenceState) => saveHitIntelligence(state))
  handle('music-platform:submit', (platform: string, prompt: string) => submitMusicGeneration(platform, prompt))
  handle('music-platform:status', (platform: string, externalId: string) => getMusicGenerationStatus(platform, externalId))
  handle('favorites:list', () => loadFavorites())
  handle('favorites:add', (record: FavoriteRecord) => addFavorite(record))
  handle('favorites:delete', (id: string) => deleteFavorite(id))
  handle('history:list', () => loadHistory())
  handle('history:add', (record: HistoryRecord) => addHistory(record))
  handle('history:clear', () => clearHistory())
}
