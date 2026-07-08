import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { FavoriteRecord } from '../shared/types'
import { createLogger } from './logger'

const logger = createLogger('favorites-store')
const FAVORITES_PATH = join(app.getPath('userData'), 'favorites.json')

export function loadFavorites(): FavoriteRecord[] {
  if (!existsSync(FAVORITES_PATH)) return []
  try {
    const parsed = JSON.parse(readFileSync(FAVORITES_PATH, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logger.warn('收藏记录解析失败', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

export function saveFavorites(favorites: FavoriteRecord[]): void {
  mkdirSync(dirname(FAVORITES_PATH), { recursive: true })
  writeFileSync(FAVORITES_PATH, JSON.stringify(favorites, null, 2), 'utf8')
}

export function addFavorite(record: FavoriteRecord): FavoriteRecord[] {
  const favorites = loadFavorites()
  favorites.unshift(record)
  saveFavorites(favorites)
  return favorites
}

export function deleteFavorite(id: string): FavoriteRecord[] {
  const favorites = loadFavorites().filter(item => item.id !== id)
  saveFavorites(favorites)
  return favorites
}
