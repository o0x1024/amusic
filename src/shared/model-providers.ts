export type ProviderProtocol = 'openai' | 'gemini'

export interface ProviderMeta {
  type: string
  label: string
  description: string
  protocol: ProviderProtocol
  defaultBase: string
  defaultModel: string
  icon: string
  color: string
}

export const BUILTIN_PROVIDERS: ProviderMeta[] = [
  {
    type: 'deepseek',
    label: 'DeepSeek',
    description: '中文创作能力强，OpenAI 兼容接口',
    protocol: 'openai',
    defaultBase: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    icon: 'server',
    color: 'text-primary'
  },
  {
    type: 'kimi',
    label: 'Kimi',
    description: '月之暗面开放平台，OpenAI 兼容接口',
    protocol: 'openai',
    defaultBase: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.6',
    icon: 'moon',
    color: 'text-warning'
  },
  {
    type: 'bailian',
    label: '百炼',
    description: '阿里云百炼兼容模式，适合通义千问系列',
    protocol: 'openai',
    defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    icon: 'server',
    color: 'text-info'
  },
  {
    type: 'doubao',
    label: '豆包',
    description: '火山方舟 OpenAI 兼容接口',
    protocol: 'openai',
    defaultBase: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-32k',
    icon: 'server',
    color: 'text-error'
  },
  {
    type: 'gemini',
    label: 'Google Gemini',
    description: 'Google Gemini API',
    protocol: 'gemini',
    defaultBase: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-pro',
    icon: 'server',
    color: 'text-secondary'
  },
  {
    type: 'openai',
    label: 'OpenAI',
    description: 'OpenAI 官方或第三方中转',
    protocol: 'openai',
    defaultBase: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    icon: 'server',
    color: 'text-accent'
  }
]

export const PROTOCOL_OPTIONS: { value: ProviderProtocol; label: string; defaultBase: string; defaultModel: string }[] = [
  { value: 'openai', label: 'OpenAI 兼容', defaultBase: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { value: 'gemini', label: 'Google Gemini', defaultBase: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-1.5-pro' }
]

export function providerLabel(type: string): string {
  return BUILTIN_PROVIDERS.find(p => p.type === type)?.label ?? type
}

export function resolveProtocol(type: string, protocol?: string | null): ProviderProtocol {
  if (protocol === 'openai' || protocol === 'gemini') return protocol
  return BUILTIN_PROVIDERS.find(p => p.type === type)?.protocol ?? 'openai'
}

export function defaultBaseForProtocol(protocol: ProviderProtocol): string {
  return protocol === 'gemini'
    ? 'https://generativelanguage.googleapis.com'
    : 'https://api.openai.com/v1'
}

export function defaultModelForProtocol(protocol: ProviderProtocol): string {
  return protocol === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o'
}

export function isCustomProviderType(modelType: string): boolean {
  return modelType.startsWith('custom_')
}
