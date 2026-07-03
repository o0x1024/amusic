import { ipcMain } from 'electron'
import type { AppSettings, FavoriteRecord, HitLabRequest, HistoryRecord, ModelConfig, SongRequest } from '../shared/types'
import { generateHitLab, generateHitLabIdea, generateSong, listModels, testModelConnection } from './ai-service'
import { addFavorite, deleteFavorite, loadFavorites } from './favorites-store'
import { addHistory, clearHistory, loadHistory } from './history-store'
import { loadSettings, saveSettings } from './settings-store'

export function registerIpcHandlers(): void {
  ipcMain.handle('app:getInfo', () => ({ name: 'amusic', version: '0.1.0' }))
  ipcMain.handle('settings:get', () => loadSettings())
  ipcMain.handle('settings:save', (_event, settings: AppSettings) => saveSettings(settings))
  ipcMain.handle('model:test', (_event, config: ModelConfig) => testModelConnection(config))
  ipcMain.handle('model:list', (_event, config: ModelConfig) => listModels(config))
  ipcMain.handle('music:generate', (_event, request: SongRequest) => generateSong(request))
  ipcMain.handle('hit-lab:generate', (_event, request: HitLabRequest) => generateHitLab(request))
  ipcMain.handle('hit-lab:random-idea', (_event, request: HitLabRequest) => generateHitLabIdea(request))
  ipcMain.handle('favorites:list', () => loadFavorites())
  ipcMain.handle('favorites:add', (_event, record: FavoriteRecord) => addFavorite(record))
  ipcMain.handle('favorites:delete', (_event, id: string) => deleteFavorite(id))
  ipcMain.handle('history:list', () => loadHistory())
  ipcMain.handle('history:add', (_event, record: HistoryRecord) => addHistory(record))
  ipcMain.handle('history:clear', () => clearHistory())
}
