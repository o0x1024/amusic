import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { BUILTIN_PROVIDERS } from '../shared/model-providers'
import type { AppSettings, ModelConfig } from '../shared/types'

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

function defaultConfig(priority: number, provider: (typeof BUILTIN_PROVIDERS)[number]): ModelConfig {
  return {
    model_type: provider.type,
    display_name: provider.label,
    provider_protocol: provider.protocol,
    api_key: '',
    api_base: provider.defaultBase,
    model_name: provider.defaultModel,
    is_enabled: provider.type === 'deepseek' ? 1 : 0,
    priority,
    max_context_tokens: 256000,
    available_models: []
  }
}

export function defaultSettings(): AppSettings {
  return {
    configs: BUILTIN_PROVIDERS.map((provider, index) => defaultConfig(index + 1, provider)),
    global_default_provider: '',
    global_default_model: '',
    generation: {
      temperature: 0.86,
      maxTokens: 3600,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 0.9
    },
    appearance: {
      theme: 'dark',
      fontSize: 14,
      uiScale: 100,
      spacing: 115
    }
  }
}

function normalizeSettings(raw: Partial<AppSettings>): AppSettings {
  const defaults = defaultSettings()
  const incoming = Array.isArray(raw.configs) ? raw.configs : []
  const mergedConfigs = defaults.configs.map(config => {
    const saved = incoming.find(item => item.model_type === config.model_type)
    return { ...config, ...saved }
  })

  for (const custom of incoming.filter(item => !mergedConfigs.some(c => c.model_type === item.model_type))) {
    mergedConfigs.push(custom)
  }

  return {
    configs: mergedConfigs,
    global_default_provider: raw.global_default_provider ?? defaults.global_default_provider,
    global_default_model: raw.global_default_model ?? defaults.global_default_model,
    generation: {
      ...defaults.generation,
      ...raw.generation,
      maxTokens: raw.generation?.maxTokens ?? raw.generation?.max_tokens ?? defaults.generation.maxTokens,
      topP: raw.generation?.topP ?? raw.generation?.top_p ?? defaults.generation.topP
    },
    appearance: {
      ...defaults.appearance,
      ...raw.appearance,
      fontSize: raw.appearance?.fontSize ?? raw.appearance?.font_size ?? defaults.appearance.fontSize
    }
  }
}

export function loadSettings(): AppSettings {
  if (!existsSync(SETTINGS_PATH)) {
    const settings = defaultSettings()
    saveSettings(settings)
    return settings
  }

  try {
    const parsed = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) as Partial<AppSettings>
    return normalizeSettings(parsed)
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true })
  const normalized = normalizeSettings(settings)
  writeFileSync(SETTINGS_PATH, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}

export function getActiveConfig(): ModelConfig | null {
  const settings = loadSettings()
  const explicit = settings.global_default_provider
    ? settings.configs.find(config => config.model_type === settings.global_default_provider)
    : null

  if (explicit?.is_enabled && explicit.api_key) {
    return {
      ...explicit,
      model_name: settings.global_default_model || explicit.model_name
    }
  }

  return [...settings.configs]
    .filter(config => config.is_enabled && config.api_key)
    .sort((a, b) => a.priority - b.priority)[0] ?? null
}

export function getGenerationParams() {
  return loadSettings().generation
}
