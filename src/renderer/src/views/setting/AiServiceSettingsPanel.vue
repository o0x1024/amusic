<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue'
import SearchableModelSelect from '../../components/SearchableModelSelect.vue'
import {
  BUILTIN_PROVIDERS,
  PROTOCOL_OPTIONS,
  defaultBaseForProtocol,
  defaultModelForProtocol,
  isCustomProviderType,
  providerSupportsThinking,
  resolveProtocol,
  type ProviderProtocol
} from '../../../../shared/model-providers'
import type { AppSettings, ModelConfig } from '../../../../shared/types'

const emit = defineEmits<{
  toast: [type: 'success' | 'error' | 'info', message: string]
}>()

function showToast(type: 'success' | 'error' | 'info', message: string) {
  emit('toast', type, message)
}

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(toRaw(obj)))
}

const settings = ref<AppSettings | null>(null)
const loading = ref(true)
const ready = ref(false)
const selectedType = ref('deepseek')
const testing = ref<string | null>(null)
const refreshing = ref<string | null>(null)
const testResult = ref<Record<string, 'success' | 'fail' | null>>({})
const showKey = ref<Record<string, boolean>>({})
const showAddModal = ref(false)
const newProviderName = ref('')
const newProviderProtocol = ref<ProviderProtocol>('openai')

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let genParamsSaveTimer: ReturnType<typeof setTimeout> | null = null
let suppressWatch = false

const configs = computed(() => settings.value?.configs ?? [])
const selectedConfig = computed(() => configs.value.find(c => c.model_type === selectedType.value))
const selectedProtocol = computed(() => {
  const config = selectedConfig.value
  return config ? resolveProtocol(config.model_type, config.provider_protocol) : 'openai'
})
const isGeminiProtocol = computed(() => selectedProtocol.value === 'gemini')

const providerViews = computed(() => configs.value.map(config => {
  const builtin = BUILTIN_PROVIDERS.find(provider => provider.type === config.model_type)
  const protocol = resolveProtocol(config.model_type, config.provider_protocol)
  return {
    type: config.model_type,
    label: config.display_name || builtin?.label || config.model_type,
    description: builtin?.description || `自定义 · ${protocol === 'gemini' ? 'Google Gemini' : 'OpenAI 兼容'}`,
    protocol,
    defaultBase: builtin?.defaultBase || defaultBaseForProtocol(protocol),
    defaultModel: builtin?.defaultModel || defaultModelForProtocol(protocol),
    icon: builtin?.icon || 'server',
    color: builtin?.color || 'text-warning',
    supportsThinking: providerSupportsThinking(config.model_type),
    isCustom: isCustomProviderType(config.model_type)
  }
}))

const selectedProvider = computed(() =>
  providerViews.value.find(provider => provider.type === selectedType.value) ?? providerViews.value[0]
)

const selectableGlobalProviders = computed(() =>
  configs.value.filter(c => c.is_enabled === 1 && c.api_key)
)

const globalDefaultProvider = computed({
  get: () => settings.value?.global_default_provider ?? '',
  set: (value: string) => {
    if (!settings.value) return
    settings.value.global_default_provider = value
    if (!value) settings.value.global_default_model = ''
    ensureGlobalModelValid()
    scheduleAutoSave()
  }
})

const globalDefaultModel = computed({
  get: () => settings.value?.global_default_model ?? '',
  set: (value: string) => {
    if (!settings.value) return
    settings.value.global_default_model = value
    scheduleAutoSave()
  }
})

const temperature = computed({
  get: () => settings.value?.generation.temperature ?? 0.86,
  set: (value: number) => {
    if (!settings.value) return
    settings.value.generation.temperature = value
    scheduleGenParamsSave()
  }
})

const maxTokens = computed({
  get: () => settings.value?.generation.maxTokens ?? 3600,
  set: (value: number) => {
    if (!settings.value) return
    settings.value.generation.maxTokens = value
    scheduleGenParamsSave()
  }
})

const frequencyPenalty = computed({
  get: () => settings.value?.generation.frequencyPenalty ?? 0,
  set: (value: number) => {
    if (!settings.value) return
    settings.value.generation.frequencyPenalty = value
    scheduleGenParamsSave()
  }
})

const presencePenalty = computed({
  get: () => settings.value?.generation.presencePenalty ?? 0,
  set: (value: number) => {
    if (!settings.value) return
    settings.value.generation.presencePenalty = value
    scheduleGenParamsSave()
  }
})

const topP = computed({
  get: () => settings.value?.generation.topP ?? 0.9,
  set: (value: number) => {
    if (!settings.value) return
    settings.value.generation.topP = value
    scheduleGenParamsSave()
  }
})

const GENERATION_PARAM_BOUNDS = {
  temperature: { min: 0, max: 2, step: 0.01 },
  maxTokens: { min: 1, max: 200000, step: 1 },
  frequencyPenalty: { min: -2, max: 2, step: 0.01 },
  presencePenalty: { min: -2, max: 2, step: 0.01 },
  topP: { min: 0, max: 1, step: 0.01 }
} as const

function catalogForProvider(type: string, modelName?: string): string[] {
  const config = configs.value.find(c => c.model_type === type)
  const catalog = config?.available_models ?? []
  if (catalog.length) {
    if (modelName && !catalog.includes(modelName)) return [modelName, ...catalog]
    return catalog
  }
  if (modelName) return [modelName]
  const view = providerViews.value.find(p => p.type === type)
  return view?.defaultModel ? [view.defaultModel] : []
}

const currentModelOptions = computed(() =>
  catalogForProvider(selectedType.value, selectedConfig.value?.model_name)
)

const globalModelOptions = computed(() => {
  if (!globalDefaultProvider.value) return []
  const config = configs.value.find(c => c.model_type === globalDefaultProvider.value)
  return catalogForProvider(globalDefaultProvider.value, config?.model_name)
})

const hasPersistedCatalog = computed(() =>
  (selectedConfig.value?.available_models.length ?? 0) > 0
)

onMounted(async () => {
  await loadSettings()
  ready.value = true
})

watch(configs, () => {
  if (suppressWatch) return
  scheduleAutoSave()
}, { deep: true })

async function loadSettings() {
  loading.value = true
  try {
    settings.value = await window.amusic.invoke('settings:get')
    selectedType.value = settings.value.configs[0]?.model_type ?? 'deepseek'
  } catch (e) {
    showToast('error', `加载配置失败：${e instanceof Error ? e.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

function scheduleAutoSave() {
  if (!ready.value) return
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => { void persistSettings('配置已保存') }, 500)
}

function scheduleGenParamsSave() {
  if (!ready.value) return
  if (genParamsSaveTimer) clearTimeout(genParamsSaveTimer)
  genParamsSaveTimer = setTimeout(() => { void persistSettings('高级配置已保存') }, 500)
}

async function persistSettings(message: string) {
  if (!settings.value) return
  try {
    const plain = toPlain(settings.value)
    suppressWatch = true
    settings.value = await window.amusic.invoke('settings:save', plain)
    await nextTick()
    suppressWatch = false
    showToast('success', message)
  } catch (e) {
    suppressWatch = false
    showToast('error', `保存失败：${e instanceof Error ? e.message : '未知错误'}`)
  }
}

function ensureGlobalModelValid() {
  if (!settings.value) return
  if (!settings.value.global_default_provider) {
    settings.value.global_default_model = ''
    return
  }
  const options = globalModelOptions.value
  if (options.length && !options.includes(settings.value.global_default_model)) {
    settings.value.global_default_model = options[0]
  }
}

async function testConnection() {
  const config = selectedConfig.value
  if (!config?.api_key) {
    showToast('error', '请先填写 API Key')
    return
  }
  testing.value = config.model_type
  testResult.value[config.model_type] = null
  try {
    const result = await window.amusic.invoke('model:test', toPlain(config))
    testResult.value[config.model_type] = result.success ? 'success' : 'fail'
    showToast(result.success ? 'success' : 'error', result.message)
  } finally {
    testing.value = null
  }
}

async function refreshModels() {
  const config = selectedConfig.value
  if (!config?.api_key) {
    showToast('error', '请先填写 API Key')
    return
  }
  refreshing.value = config.model_type
  try {
    const result = await window.amusic.invoke('model:list', toPlain(config))
    if (!result.success) {
      showToast('error', result.message ?? '获取失败')
      return
    }
    config.available_models = result.models
    if (!config.model_name && result.models[0]) config.model_name = result.models[0]
    ensureGlobalModelValid()
    await persistSettings(`获取到 ${result.models.length} 个模型并已保存`)
  } finally {
    refreshing.value = null
  }
}

function getStatusBadge(type: string) {
  const c = configs.value.find(cfg => cfg.model_type === type)
  if (!c?.api_key) return { label: '未配置', className: 'badge-ghost' }
  if (c.is_enabled) return { label: '已启用', className: 'badge-success' }
  return { label: '已禁用', className: 'badge-warning' }
}

function addCustomProvider() {
  if (!settings.value) return
  const name = newProviderName.value.trim()
  if (!name) {
    showToast('error', '请输入提供商名称')
    return
  }
  const modelType = `custom_${Date.now().toString(36)}`
  settings.value.configs.push({
    model_type: modelType,
    display_name: name,
    provider_protocol: newProviderProtocol.value,
    api_key: '',
    api_base: defaultBaseForProtocol(newProviderProtocol.value),
    model_name: defaultModelForProtocol(newProviderProtocol.value),
    is_enabled: 0,
    priority: settings.value.configs.length + 1,
    max_context_tokens: 256000,
    available_models: [],
    thinking_enabled: 0
  })
  selectedType.value = modelType
  showAddModal.value = false
  newProviderName.value = ''
  newProviderProtocol.value = 'openai'
  scheduleAutoSave()
  showToast('success', `已添加自定义提供商「${name}」`)
}

function deleteCustomProvider() {
  if (!settings.value || !selectedConfig.value || !isCustomProviderType(selectedConfig.value.model_type)) return
  const label = selectedConfig.value.display_name || selectedConfig.value.model_type
  settings.value.configs = settings.value.configs.filter(c => c.model_type !== selectedConfig.value?.model_type)
  if (settings.value.global_default_provider === selectedConfig.value.model_type) {
    settings.value.global_default_provider = ''
    settings.value.global_default_model = ''
  }
  selectedType.value = settings.value.configs[0]?.model_type ?? 'deepseek'
  scheduleAutoSave()
  showToast('success', `已删除「${label}」`)
}

function onProtocolChange(protocol: ProviderProtocol) {
  const config = selectedConfig.value
  if (!config || !isCustomProviderType(config.model_type)) return
  config.provider_protocol = protocol
  config.api_base = defaultBaseForProtocol(protocol)
  config.model_name = defaultModelForProtocol(protocol)
}

type GenerationParamKey = keyof typeof GENERATION_PARAM_BOUNDS

function clampGenerationParam(key: GenerationParamKey): void {
  const bounds = GENERATION_PARAM_BOUNDS[key]
  const current = {
    temperature,
    maxTokens,
    frequencyPenalty,
    presencePenalty,
    topP
  }[key]
  const raw = current.value
  if (!Number.isFinite(raw)) {
    current.value = bounds.min
    return
  }
  const clamped = Math.min(bounds.max, Math.max(bounds.min, raw))
  const stepped = bounds.step >= 1
    ? Math.round(clamped)
    : Math.round(clamped / bounds.step) * bounds.step
  current.value = Number(stepped.toFixed(key === 'maxTokens' ? 0 : 2))
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h3 class="text-xl font-bold">AI 服务</h3>
      <p class="text-sm text-base-content/50 mt-1">管理 AI 提供商连接、模型与生成参数</p>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60 mb-6">
      <div class="card-body p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <font-awesome-icon icon="server" class="text-base" />
          </div>
          <div>
            <h4 class="font-semibold">全局默认</h4>
            <p class="text-xs text-base-content/50">除手动指定模型外，所有 LLM 调用均使用此配置</p>
          </div>
        </div>

        <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50">
          <span class="loading loading-spinner loading-xs text-primary"></span>
          加载中...
        </div>
        <div v-else-if="selectableGlobalProviders.length === 0" class="text-sm text-base-content/50">
          请先配置并启用至少一个 AI 提供商
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-sm">默认全局提供商</span>
            </label>
            <select v-model="globalDefaultProvider" class="select select-bordered w-full text-sm">
              <option value="">未设置（按启用顺序自动选择）</option>
              <option v-for="config in selectableGlobalProviders" :key="config.model_type" :value="config.model_type">
                {{ config.display_name }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-sm">默认全局模型</span>
            </label>
            <SearchableModelSelect
              v-if="globalDefaultProvider"
              v-model="globalDefaultModel"
              :options="globalModelOptions"
              placeholder="搜索或选择默认全局模型…"
            />
            <div v-else class="select select-bordered w-full text-sm text-base-content/40 flex items-center px-3 h-12">
              请先选择提供商
            </div>
            <p class="text-xs text-base-content/40 mt-2">可在下方各提供商配置中点击「刷新模型」获取最新模型列表</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-3">
      <div class="w-full lg:w-52 shrink-0">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-bold text-base-content/60 uppercase tracking-wider">AI 提供商</h4>
          <button type="button" class="btn btn-ghost btn-xs gap-1" title="添加自定义提供商" @click="showAddModal = true">
            <font-awesome-icon icon="plus" class="w-3 h-3" />
            添加
          </button>
        </div>
        <ul v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-sm text-primary"></span>
        </ul>
        <ul v-else class="menu menu-sm bg-base-200 rounded-box p-2 border border-base-300/60 w-full">
          <li v-for="provider in providerViews" :key="provider.type">
            <button type="button" :class="{ 'menu-active': selectedType === provider.type }" @click="selectedType = provider.type">
              <font-awesome-icon :icon="provider.icon" class="w-4 h-4 shrink-0" />
              <span class="truncate flex-1">{{ provider.label }}</span>
              <span class="badge badge-xs shrink-0" :class="getStatusBadge(provider.type).className">
                {{ getStatusBadge(provider.type).label }}
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div v-if="!loading && selectedConfig && selectedProvider" class="flex-1 min-w-0 space-y-6">
        <div class="card bg-base-100 shadow-sm border border-base-300/60">
          <div class="card-body p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <font-awesome-icon :icon="selectedProvider.icon" :class="['text-lg', selectedProvider.color]" />
                </div>
                <div>
                  <h4 class="text-lg font-bold">{{ selectedProvider.label }}</h4>
                  <p class="text-xs text-base-content/50 mt-0.5">{{ selectedProvider.description }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <button
                  v-if="selectedProvider.isCustom"
                  type="button"
                  class="btn btn-ghost btn-sm btn-square text-error"
                  title="删除此自定义提供商"
                  @click="deleteCustomProvider"
                >
                  <font-awesome-icon icon="trash" class="w-4 h-4" />
                </button>
                <label class="flex items-center gap-2 cursor-pointer">
                  <span class="text-sm text-base-content/60">启用</span>
                  <input
                    type="checkbox"
                    :checked="selectedConfig.is_enabled === 1"
                    class="toggle toggle-primary toggle-sm"
                    @change="(e: Event) => { selectedConfig!.is_enabled = (e.target as HTMLInputElement).checked ? 1 : 0 }"
                  />
                </label>
                <label v-if="selectedProvider.supportsThinking" class="flex items-center gap-2 cursor-pointer">
                  <span class="text-sm text-base-content/60">深度思考</span>
                  <input
                    type="checkbox"
                    :checked="selectedConfig.thinking_enabled === 1"
                    class="toggle toggle-secondary toggle-sm"
                    @change="(e: Event) => { selectedConfig!.thinking_enabled = (e.target as HTMLInputElement).checked ? 1 : 0 }"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div class="card bg-base-100 shadow-sm border border-base-300/60">
            <div class="card-body p-5 space-y-4">
              <h4 class="text-sm font-bold text-base-content/60 uppercase tracking-wider border-b border-base-300/60 pb-3">
                基本配置
              </h4>

              <div v-if="selectedProvider.isCustom" class="form-control">
                <label class="label py-1">
                  <span class="label-text font-medium text-sm">显示名称</span>
                </label>
                <input v-model="selectedConfig.display_name" class="input input-bordered w-full text-sm rounded-lg" placeholder="例如：我的 OpenRouter" />
              </div>

              <div v-if="selectedProvider.isCustom" class="form-control">
                <label class="label py-1">
                  <span class="label-text font-medium text-sm">API 协议</span>
                </label>
                <select :value="selectedProtocol" class="select select-bordered w-full text-sm" @change="(e: Event) => onProtocolChange((e.target as HTMLSelectElement).value as ProviderProtocol)">
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p class="text-xs text-base-content/40 mt-1">选择 API 协议类型，决定如何与服务商通信</p>
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text font-medium text-sm">API Key</span>
                  <span v-if="testResult[selectedType] === 'success'" class="label-text-alt text-success text-xs flex items-center gap-1">
                    <font-awesome-icon icon="check-circle" class="w-3 h-3" /> 验证通过
                  </span>
                  <span v-else-if="testResult[selectedType] === 'fail'" class="label-text-alt text-error text-xs flex items-center gap-1">
                    <font-awesome-icon icon="exclamation-circle" class="w-3 h-3" /> 验证失败
                  </span>
                </label>
                <div class="join w-full">
                  <input
                    :value="selectedConfig.api_key"
                    :type="showKey[selectedType] ? 'text' : 'password'"
                    :placeholder="`输入 ${selectedProvider.label} 的 API Key`"
                    class="input input-bordered join-item flex-1 text-sm font-mono rounded-l-lg"
                    @input="(e: Event) => { selectedConfig!.api_key = (e.target as HTMLInputElement).value }"
                  />
                  <button type="button" class="btn btn-outline btn-neutral join-item" @click="showKey[selectedType] = !showKey[selectedType]">
                    <font-awesome-icon :icon="showKey[selectedType] ? 'eye-slash' : 'eye'" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text font-medium text-sm">API Base URL</span>
                  <span v-if="isGeminiProtocol" class="label-text-alt text-xs text-base-content/40">自动管理</span>
                </label>
                <input
                  :value="selectedConfig.api_base"
                  class="input input-bordered w-full text-sm rounded-lg"
                  :placeholder="selectedProvider.defaultBase"
                  @input="(e: Event) => { selectedConfig!.api_base = (e.target as HTMLInputElement).value }"
                />
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text font-medium text-sm">默认模型</span>
                  <span v-if="hasPersistedCatalog" class="label-text-alt text-success text-xs flex items-center gap-1">
                    <font-awesome-icon icon="check-circle" class="w-3 h-3" />
                    已保存 {{ selectedConfig.available_models.length }} 个模型
                  </span>
                  <span v-else class="label-text-alt text-base-content/40 text-xs">请先刷新模型列表</span>
                </label>
                <SearchableModelSelect
                  v-if="hasPersistedCatalog"
                  :model-value="selectedConfig.model_name"
                  :options="currentModelOptions"
                  placeholder="搜索或选择默认模型…"
                  @update:model-value="(v) => { selectedConfig!.model_name = v }"
                />
                <input v-else v-model="selectedConfig.model_name" class="input input-bordered w-full text-sm font-mono rounded-lg" placeholder="手动输入模型 ID，或点击「刷新模型」获取列表" />
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text font-medium text-sm">最大上下文 Token</span>
                  <span class="label-text-alt text-base-content/60 font-mono text-sm">
                    {{ selectedConfig.max_context_tokens.toLocaleString() }}
                  </span>
                </label>
                <input
                  v-model.number="selectedConfig.max_context_tokens"
                  type="number"
                  min="4096"
                  max="2000000"
                  step="1024"
                  class="input input-bordered w-full text-sm font-mono rounded-lg"
                  placeholder="256000"
                />
                <p class="text-xs text-base-content/40 mt-2">当前模型可接受的最大上下文长度；Token 预算与超限预警均基于此值</p>
              </div>

              <div class="flex flex-wrap items-center gap-2 pt-2">
                <button type="button" class="btn btn-outline btn-neutral btn-sm gap-2" :disabled="testing === selectedType" @click="testConnection">
                  <font-awesome-icon :icon="testing === selectedType ? 'spinner' : 'wifi'" :spin="testing === selectedType" class="w-3.5 h-3.5" />
                  {{ testing === selectedType ? '测试中...' : '测试连接' }}
                </button>
                <button type="button" class="btn btn-primary btn-sm gap-2" :disabled="refreshing === selectedType" @click="refreshModels">
                  <font-awesome-icon :icon="refreshing === selectedType ? 'spinner' : 'rotate'" :spin="refreshing === selectedType" class="w-3.5 h-3.5" />
                  {{ refreshing === selectedType ? '刷新中...' : '刷新模型' }}
                </button>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm border border-base-300/60">
            <div class="card-body p-5 space-y-6">
              <h4 class="text-sm font-bold text-base-content/60 uppercase tracking-wider border-b border-base-300/60 pb-3">
                高级配置
              </h4>

              <div class="param-item">
                <span class="param-label">温度</span>
                <div class="param-slider-row">
                  <input v-model.number="temperature" type="range" :min="GENERATION_PARAM_BOUNDS.temperature.min" :max="GENERATION_PARAM_BOUNDS.temperature.max" :step="GENERATION_PARAM_BOUNDS.temperature.step" class="themed-range" />
                  <input v-model.number="temperature" type="number" class="input input-bordered input-sm param-number-input" :min="GENERATION_PARAM_BOUNDS.temperature.min" :max="GENERATION_PARAM_BOUNDS.temperature.max" :step="GENERATION_PARAM_BOUNDS.temperature.step" @blur="clampGenerationParam('temperature')" />
                </div>
                <p class="param-desc">控制输出随机性；歌词创作建议 0.8～1.0。</p>
              </div>

              <div class="param-item">
                <span class="param-label">最大生成令牌数 (Max Tokens)</span>
                <div class="param-slider-row">
                  <input v-model.number="maxTokens" type="range" min="512" max="32768" step="256" class="themed-range" />
                  <input v-model.number="maxTokens" type="number" class="input input-bordered input-sm param-number-input param-number-input-wide" :min="GENERATION_PARAM_BOUNDS.maxTokens.min" :max="GENERATION_PARAM_BOUNDS.maxTokens.max" :step="GENERATION_PARAM_BOUNDS.maxTokens.step" @blur="clampGenerationParam('maxTokens')" />
                </div>
                <p class="param-desc">限制 AI 单次回复的最大长度；滑块上限 32768，可手动输入更大值。</p>
              </div>

              <div class="param-item">
                <span class="param-label">频率惩罚 (Frequency Penalty)</span>
                <div class="param-slider-row">
                  <input v-model.number="frequencyPenalty" type="range" :min="GENERATION_PARAM_BOUNDS.frequencyPenalty.min" :max="GENERATION_PARAM_BOUNDS.frequencyPenalty.max" step="0.05" class="themed-range" />
                  <input v-model.number="frequencyPenalty" type="number" class="input input-bordered input-sm param-number-input" :min="GENERATION_PARAM_BOUNDS.frequencyPenalty.min" :max="GENERATION_PARAM_BOUNDS.frequencyPenalty.max" :step="GENERATION_PARAM_BOUNDS.frequencyPenalty.step" @blur="clampGenerationParam('frequencyPenalty')" />
                </div>
                <p class="param-desc">惩罚已出现 token 的重复使用，增大可提升词汇多样性。</p>
              </div>

              <div class="param-item">
                <span class="param-label">存在惩罚 (Presence Penalty)</span>
                <div class="param-slider-row">
                  <input v-model.number="presencePenalty" type="range" :min="GENERATION_PARAM_BOUNDS.presencePenalty.min" :max="GENERATION_PARAM_BOUNDS.presencePenalty.max" step="0.05" class="themed-range" />
                  <input v-model.number="presencePenalty" type="number" class="input input-bordered input-sm param-number-input" :min="GENERATION_PARAM_BOUNDS.presencePenalty.min" :max="GENERATION_PARAM_BOUNDS.presencePenalty.max" :step="GENERATION_PARAM_BOUNDS.presencePenalty.step" @blur="clampGenerationParam('presencePenalty')" />
                </div>
                <p class="param-desc">惩罚任何已出现过的 token，鼓励引入新话题和表达。</p>
              </div>

              <div class="param-item">
                <span class="param-label">核采样 (Top P)</span>
                <div class="param-slider-row">
                  <input v-model.number="topP" type="range" :min="GENERATION_PARAM_BOUNDS.topP.min" :max="GENERATION_PARAM_BOUNDS.topP.max" :step="GENERATION_PARAM_BOUNDS.topP.step" class="themed-range" />
                  <input v-model.number="topP" type="number" class="input input-bordered input-sm param-number-input" :min="GENERATION_PARAM_BOUNDS.topP.min" :max="GENERATION_PARAM_BOUNDS.topP.max" :step="GENERATION_PARAM_BOUNDS.topP.step" @blur="clampGenerationParam('topP')" />
                </div>
                <p class="param-desc">只从累积概率前 Top P 的 token 中采样，配合温度使用。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <dialog :class="['modal', { 'modal-open': showAddModal }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">添加自定义提供商</h3>
        <div class="space-y-4">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium">显示名称</span>
            </label>
            <input v-model="newProviderName" class="input input-bordered w-full" placeholder="例如：OpenRouter、硅基流动" @keyup.enter="addCustomProvider" />
          </div>
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium">API 协议</span>
            </label>
            <select v-model="newProviderProtocol" class="select select-bordered w-full">
              <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p class="text-xs text-base-content/40 mt-2">OpenAI 兼容适用于 DeepSeek、OpenRouter 等；Gemini 需选择对应协议。</p>
          </div>
        </div>
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="showAddModal = false">取消</button>
          <button type="button" class="btn btn-primary" @click="addCustomProvider">添加</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="showAddModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
.param-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--fallback-bc, oklch(var(--bc) / 1));
}

.param-slider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.param-slider-row .themed-range {
  flex: 1;
  min-width: 0;
}

.param-number-input {
  flex-shrink: 0;
  width: 4.75rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  text-align: right;
  font-family: ui-monospace, 'JetBrains Mono', 'Fira Code', monospace;
}

.param-number-input-wide {
  width: 6.25rem;
}

.param-desc {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--fallback-bc, oklch(var(--bc) / 0.4));
}

.themed-range {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 4px;
  background: var(--fallback-b3, oklch(var(--b3) / 1));
  outline: none;
  cursor: pointer;
}

.themed-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--fallback-b1, oklch(var(--b1) / 1));
  border: 3px solid var(--fallback-p, oklch(var(--p) / 1));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.themed-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--fallback-b1, oklch(var(--b1) / 1));
  border: 3px solid var(--fallback-p, oklch(var(--p) / 1));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.themed-range::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: var(--fallback-b3, oklch(var(--b3) / 1));
}
</style>
