import type { AppSettings, HitLabIdeaResult, HitLabRequest, HitLabResult, LyricsDraftRequest, LyricsDraftResult, ModelConfig, PromptFromLyricsRequest, SongRequest, SongResult } from '../../../shared/types'

declare global {
  interface Window {
    amusic: {
      invoke(channel: 'app:getInfo'): Promise<{ name: string; version: string }>
      invoke(channel: 'settings:get'): Promise<AppSettings>
      invoke(channel: 'settings:save', settings: AppSettings): Promise<AppSettings>
      invoke(channel: 'model:test', config: ModelConfig): Promise<{ success: boolean; message: string }>
      invoke(channel: 'model:list', config: ModelConfig): Promise<{ success: boolean; models: string[]; message?: string }>
      invoke(channel: 'music:generate', request: SongRequest): Promise<SongResult>
      invoke(channel: 'lyrics:generate', request: LyricsDraftRequest): Promise<LyricsDraftResult>
      invoke(channel: 'lyrics:prompt', request: PromptFromLyricsRequest): Promise<SongResult>
      invoke(channel: 'hit-lab:generate', request: HitLabRequest): Promise<HitLabResult>
      invoke(channel: 'hit-lab:random-idea', request: HitLabRequest): Promise<HitLabIdeaResult>
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>
      on(channel: string, callback: (...args: unknown[]) => void): void
      off(channel: string, callback: (...args: unknown[]) => void): void
    }
  }
}

export {}
