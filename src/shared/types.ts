import type { ProviderProtocol } from './model-providers'

export interface ModelConfig {
  model_type: string
  display_name: string
  provider_protocol: ProviderProtocol
  api_key: string
  api_base: string
  model_name: string
  is_enabled: number
  priority: number
  max_context_tokens: number
  available_models: string[]
}

export interface GenerationParams {
  temperature: number
  maxTokens: number
  frequencyPenalty: number
  presencePenalty: number
  topP: number
  max_tokens?: number
  top_p?: number
}

export interface AppSettings {
  configs: ModelConfig[]
  global_default_provider: string
  global_default_model: string
  generation: GenerationParams
  appearance: {
    theme: string
    fontSize: number
    uiScale: number
    spacing: number
    font_size?: number
  }
}

export interface SongRequest {
  idea: string
  referenceLyrics: string
  language: string
  style: string
  mood: string
  atmosphere: string
  vocal: string
  vocalArrangement: string
  tempo: string
  groove: string
  key: string
  energyCurve: string
  arrangement: string
  structure: string
  platform: string
  lyricDensity: string
  rhymeScheme: string
  useCase: string
  songLength: string
  rhyme: boolean
}

export interface SongResult {
  title: string
  concept: string
  lyrics: string
  stylePrompt: string
  arrangement: string
  vocalPrompt: string
  fullPrompt: string
  negativePrompt: string
}

export interface ModelResponse {
  success: boolean
  content: string
  error?: string
  durationMs?: number
}

export interface FavoriteRecord {
  id: string
  createdAt: number
  title: string
  idea: string
  styleTags: string[]
  params: Record<string, string[]>
  rhyme: boolean
  result: SongResult
}

export interface HistoryRecord {
  id: string
  createdAt: number
  idea: string
  styleTags: string[]
  params: Record<string, string[]>
  rhyme: boolean
  result: SongResult
}
