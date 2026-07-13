import { loadSettings } from './settings-store'

export async function submitMusicGeneration(platform: string, prompt: string): Promise<{ success: boolean; message: string; externalId?: string; externalUrl?: string }> {
  const config = loadSettings().musicPlatforms.find(item => item.platform === platform)
  if (!config || !config.enabled || config.mode === 'manual') {
    return { success: false, message: `${platform} 当前为手动模式，请复制 Prompt 到外部平台生成` }
  }
  if (!config.endpoint.trim()) return { success: false, message: `${platform} 尚未配置合法 API/Webhook 地址` }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({ prompt })
    })
    const data = await response.json().catch(() => ({})) as { id?: string; taskId?: string; url?: string; message?: string }
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`)
    return {
      success: true,
      message: '已提交到平台适配接口',
      externalId: data.id || data.taskId,
      externalUrl: data.url
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}

export async function getMusicGenerationStatus(platform: string, externalId: string): Promise<{ success: boolean; message: string; status?: string; externalUrl?: string }> {
  const config = loadSettings().musicPlatforms.find(item => item.platform === platform)
  if (!config || !config.enabled || config.mode !== 'webhook' || !config.statusEndpoint.trim()) {
    return { success: false, message: `${platform} 未配置结果查询接口` }
  }
  const url = config.statusEndpoint.includes('{id}')
    ? config.statusEndpoint.replace('{id}', encodeURIComponent(externalId))
    : `${config.statusEndpoint.replace(/\/+$/, '')}/${encodeURIComponent(externalId)}`
  try {
    const response = await fetch(url, { headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {} })
    const data = await response.json().catch(() => ({})) as { status?: string; url?: string; audioUrl?: string; message?: string }
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`)
    return { success: true, message: data.message || `任务状态：${data.status || '未知'}`, status: data.status, externalUrl: data.audioUrl || data.url }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
