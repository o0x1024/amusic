import { providerSupportsThinking, resolveProtocol } from '../shared/model-providers'
import type { HitLabIdeaResult, HitLabRequest, HitLabResult, HitLabVariant, HitStrategyCard, HitStrategyResult, LyricsDraftRequest, LyricsDraftResult, ModelConfig, ModelResponse, PromptFromLyricsRequest, SongRequest, SongResult, SongVariant } from '../shared/types'
import { createLogger, llmLog } from './logger'
import { getActiveConfig, getGenerationParams } from './settings-store'
import { loadHitIntelligence, saveHitIntelligence } from './hit-intelligence-store'
import { loadHitExperiments } from './hit-experiment-store'
import { buildLearnedProfile } from '../shared/hit-intelligence'
import { chooseNextTopic, isTooSimilar, textSimilarity } from '../shared/idea-diversity'
import { hasSufficientStrategyDiversity } from '../shared/hit-strategy'
import { getCreationStageConfig } from '../shared/creation-stage'

const logger = createLogger('ai-service')

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function extractError(data: unknown): string {
  if (!data || typeof data !== 'object') return '模型调用失败'
  const maybe = data as { error?: { message?: string }; message?: string }
  return maybe.error?.message ?? maybe.message ?? '模型调用失败'
}

interface PostJsonResult {
  status: number
  data: unknown
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<PostJsonResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) throw new Error(extractError(data))
  return { status: response.status, data }
}

export async function chat(config: ModelConfig, systemPrompt: string, prompt: string): Promise<ModelResponse> {
  const start = Date.now()
  const protocol = resolveProtocol(config.model_type, config.provider_protocol)
  const params = getGenerationParams()
  let requestId = ''

  try {
    if (protocol === 'gemini') {
      const url = `${stripTrailingSlash(config.api_base)}/v1beta/models/${config.model_name}:generateContent?key=${config.api_key}`
      const headers = { 'Content-Type': 'application/json' }
      const requestBody = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: params.temperature,
          topP: params.topP,
          maxOutputTokens: params.maxTokens
        }
      }

      requestId = llmLog.request({
        model: config.model_name,
        provider: config.model_type,
        protocol,
        url,
        headers,
        systemPrompt,
        userPrompt: prompt,
        requestBody
      })

      const { status, data } = await postJson(url, headers, requestBody)
      const typed = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      const content = typed.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? ''
      const durationMs = Date.now() - start
      const result: ModelResponse = { success: true, content, durationMs }

      llmLog.response({
        requestId,
        success: true,
        durationMs,
        statusCode: status,
        content,
        rawResponse: data
      })

      return result
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
    const requestBody: Record<string, unknown> = {
      model: config.model_name,
      messages,
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      response_format: { type: 'json_object' }
    }

    if (providerSupportsThinking(config.model_type) && config.thinking_enabled === 1) {
      requestBody.thinking = { type: 'enabled' }
    }

    const url = `${stripTrailingSlash(config.api_base)}/chat/completions`
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`
    }

    requestId = llmLog.request({
      model: config.model_name,
      provider: config.model_type,
      protocol,
      url,
      headers,
      systemPrompt,
      userPrompt: prompt,
      requestBody
    })

    const { status, data } = await postJson(url, headers, requestBody)
    const typed = data as { choices?: Array<{ message?: { content?: string } }> }
    const content = typed.choices?.[0]?.message?.content ?? ''
    const durationMs = Date.now() - start
    const result: ModelResponse = { success: true, content, durationMs }

    llmLog.response({
      requestId,
      success: true,
      durationMs,
      statusCode: status,
      content,
      rawResponse: data
    })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('模型调用失败', { model: config.model_name, provider: config.model_type, error: message })

    const durationMs = Date.now() - start
    const result: ModelResponse = { success: false, content: '', error: message, durationMs }

    llmLog.response({
      requestId,
      success: false,
      durationMs,
      error: message
    })

    return result
  }
}

export async function testModelConnection(config: ModelConfig): Promise<{ success: boolean; message: string }> {
  if (!config.api_key.trim()) return { success: false, message: '请先填写 API Key' }
  if (!config.api_base.trim()) return { success: false, message: '请先填写 API Base' }
  if (!config.model_name.trim()) return { success: false, message: '请先填写模型 ID' }

  const result = await chat(config, '你只负责连接测试。', '请只回复 JSON：{"ok":true}')
  return result.success
    ? { success: true, message: '连接成功' }
    : { success: false, message: result.error ?? '连接失败' }
}

export async function listModels(config: ModelConfig): Promise<{ success: boolean; models: string[]; message?: string }> {
  if (!config.api_key.trim()) return { success: false, models: [], message: '请先填写 API Key' }
  const protocol = resolveProtocol(config.model_type, config.provider_protocol)

  try {
    if (protocol === 'gemini') {
      const url = `${stripTrailingSlash(config.api_base)}/v1beta/models?key=${config.api_key}`
      const response = await fetch(url)
      const data = await response.json().catch(() => null) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> } | null
      if (!response.ok) throw new Error(extractError(data))
      const models = data?.models
        ?.filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .map(model => model.name?.replace(/^models\//, '') ?? '')
        .filter(Boolean) ?? []
      return { success: true, models }
    }

    const response = await fetch(`${stripTrailingSlash(config.api_base)}/models`, {
      headers: { Authorization: `Bearer ${config.api_key}` }
    })
    const data = await response.json().catch(() => null) as { data?: Array<{ id?: string }> } | null
    if (!response.ok) throw new Error(extractError(data))
    return {
      success: true,
      models: data?.data?.map(model => model.id ?? '').filter(Boolean) ?? []
    }
  } catch (error) {
    return {
      success: false,
      models: [],
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

function jsonFromText(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('模型没有返回可解析的 JSON')
    return JSON.parse(match[0])
  }
}

function normalizeSongResult(value: unknown): SongResult {
  const data = value as Partial<SongResult>
  const lyrics = normalizeLyricBlock(data.lyrics)
  return {
    title: data.title?.trim() || '未命名歌曲',
    concept: data.concept?.trim() || '',
    lyrics,
    stylePrompt: data.stylePrompt?.trim() || '',
    arrangement: data.arrangement?.trim() || '',
    vocalPrompt: data.vocalPrompt?.trim() || '',
    fullPrompt: data.fullPrompt?.trim() || '',
    sunoPrompt: data.sunoPrompt?.trim() || data.fullPrompt?.trim() || '',
    udioPrompt: data.udioPrompt?.trim() || data.fullPrompt?.trim() || '',
    miaoxiangPrompt: data.miaoxiangPrompt?.trim() || data.fullPrompt?.trim() || '',
    lyricOnly: normalizeLyricBlock(data.lyricOnly) || lyrics,
    negativePrompt: data.negativePrompt?.trim() || '',
    qualityChecks: normalizeStringArray(data.qualityChecks),
    revisionSuggestions: normalizeStringArray(data.revisionSuggestions),
    variants: Array.isArray(data.variants)
      ? data.variants.map(item => {
        const variant = item as Partial<SongVariant>
        return {
          title: variant.title?.trim() || '',
          direction: variant.direction?.trim() || '',
          hookLine: variant.hookLine?.trim() || '',
          stylePrompt: variant.stylePrompt?.trim() || '',
          revisionFocus: variant.revisionFocus?.trim() || ''
        }
      }).filter(item => item.title || item.direction || item.hookLine)
      : []
  }
}

function boundedScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function boundedSeconds(value: unknown, max = 30): number {
  const seconds = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(seconds)) return 0
  return Math.max(0, Math.min(max, Math.round(seconds * 10) / 10))
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item).trim()).filter(Boolean)
}

function normalizeLyricBlock(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]*\/[ \t]*/g, '\n')
    .replace(/\s*(\[[^\]]+\])\s*/g, '\n\n$1\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const sections: string[][] = []
  let current: string[] = []

  for (const line of normalized) {
    if (/^\[[^\]]+\]$/.test(line)) {
      if (current.length > 0) sections.push(current)
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) sections.push(current)

  return sections
    .map(section => section.join('\n'))
    .join('\n\n')
    .trim()
}

function normalizeHitLabVariant(value: unknown, index: number): HitLabVariant {
  const data = value as Partial<HitLabVariant>
  return {
    title: data.title?.trim() || `候选 ${index + 1}`,
    positioning: data.positioning?.trim() || '',
    targetPlatform: data.targetPlatform?.trim() || '',
    hookLine: data.hookLine?.trim() || '',
    firstThreeSeconds: data.firstThreeSeconds?.trim() || '',
    introHook: data.introHook?.trim() || data.firstThreeSeconds?.trim() || '',
    introTimeline: data.introTimeline?.trim() || '',
    hookEntrySeconds: boundedSeconds(data.hookEntrySeconds),
    signatureSound: data.signatureSound?.trim() || '',
    loopTransition: data.loopTransition?.trim() || '',
    introRisks: normalizeStringArray(data.introRisks),
    targetDurationSeconds: boundedSeconds(data.targetDurationSeconds, 300),
    structurePlan: data.structurePlan?.trim() || '',
    completenessTest: data.completenessTest?.trim() || '',
    chorusSnippet: normalizeLyricBlock(data.chorusSnippet),
    lyrics: normalizeLyricBlock(data.lyrics),
    stylePrompt: data.stylePrompt?.trim() || '',
    fullPrompt: data.fullPrompt?.trim() || '',
    douyinScore: boundedScore(data.douyinScore),
    qishuiScore: boundedScore(data.qishuiScore),
    memorabilityScore: boundedScore(data.memorabilityScore),
    spreadPotential: data.spreadPotential?.trim() || '',
    shortVideoUseCases: normalizeStringArray(data.shortVideoUseCases),
    riskNotes: normalizeStringArray(data.riskNotes),
    iterationAdvice: data.iterationAdvice?.trim() || ''
  }
}

function normalizeHitLabResult(value: unknown): HitLabResult {
  const data = value as Partial<HitLabResult>
  const variants = Array.isArray(data.variants)
    ? data.variants.map((item, index) => normalizeHitLabVariant(item, index))
    : []
  return {
    summary: data.summary?.trim() || '',
    variants
  }
}

function normalizeHitLabIdeaResult(value: unknown): HitLabIdeaResult {
  const data = value as Partial<HitLabIdeaResult>
  return {
    idea: data.idea?.trim() || '',
    category: data.category?.trim() || '',
    lyricAngle: data.lyricAngle?.trim() || '',
    emotionalCore: data.emotionalCore?.trim() || '',
    hookType: data.hookType?.trim() || ''
  }
}

function normalizeHitStrategyResult(value: unknown): HitStrategyResult {
  const data = value as Partial<HitStrategyResult>
  const cards = Array.isArray(data.cards) ? data.cards.map((item, index) => {
    const card = item as Partial<HitStrategyCard>
    return {
      id: card.id?.trim() || `strategy-${index + 1}`,
      title: card.title?.trim() || `策略 ${index + 1}`,
      positioning: card.positioning?.trim() || '',
      primaryStrength: card.primaryStrength?.trim() || '',
      audience: card.audience?.trim() || '',
      emotionalCore: card.emotionalCore?.trim() || '',
      styleBlend: card.styleBlend?.trim() || '',
      hookType: card.hookType?.trim() || '',
      lyricAngle: card.lyricAngle?.trim() || '',
      productionPlan: card.productionPlan?.trim() || '',
      introBlueprint: card.introBlueprint?.trim() || '',
      hookEntrySeconds: boundedSeconds(card.hookEntrySeconds),
      signatureSound: card.signatureSound?.trim() || '',
      loopDesign: card.loopDesign?.trim() || '',
      advantages: normalizeStringArray(card.advantages),
      risks: normalizeStringArray(card.risks)
    }
  }).filter(card => card.positioning && card.styleBlend) : []
  return { summary: data.summary?.trim() || '', cards }
}

function normalizeLyricsDraftResult(value: unknown): LyricsDraftResult {
  const data = value as Partial<LyricsDraftResult>
  return {
    title: data.title?.trim() || '未命名歌词',
    concept: data.concept?.trim() || '',
    lyrics: normalizeLyricBlock(data.lyrics),
    hookLine: data.hookLine?.trim() || '',
    lyricAnalysis: data.lyricAnalysis?.trim() || '',
    emotionCurve: data.emotionCurve?.trim() || '',
    shortVideoMoment: data.shortVideoMoment?.trim() || '',
    revisionSuggestions: normalizeStringArray(data.revisionSuggestions)
  }
}

export async function generateSong(request: SongRequest): Promise<SongResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const systemPrompt = `你是 汽水音乐 的资深音乐制作人与 AI 音乐提示词工程师，精通 Suno、Udio、Stable Audio 等主流音乐 AI 平台的 prompt 最佳实践。

你的核心任务：将用户的模糊创作意图转译为结构化、可稳定复现的音乐 AI 提示词。

## 输出规范

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 包含以下字段：

- **title**: 歌曲标题，简短有力（2-8 字）
- **concept**: 一句话概念描述（30-60 字），概括歌曲核心意象与听感方向
- **lyrics**: 完整歌词，必须包含段落标记 [Intro]/[Verse 1]/[Pre-Chorus]/[Chorus]/[Verse 2]/[Bridge]/[Final Chorus]/[Outro] 等
- **stylePrompt**: English music style description, 80-150 words, including genre, subgenre, era texture, and production direction
- **arrangement**: English arrangement description, 80-150 words, explaining instrument entrances/exits and section dynamics
- **vocalPrompt**: English vocal direction, 50-100 words, describing tone, delivery, intensity changes, and backing vocals
- **fullPrompt**: Final complete English prompt that can be pasted directly into a music AI platform, format below
- **sunoPrompt**: Concise English tag-style prompt for Suno, highlighting genre, mood, vocal, BPM, and core instruments
- **udioPrompt**: Detailed English prompt for Udio, including structure, production texture, dynamic progression, and vocal direction
- **miaoxiangPrompt**: Clear English prompt for Miaoxiang, emphasizing style, imagery, vocal, and arrangement
- **lyricOnly**: 只包含完整歌词，不包含任何 prompt 说明
- **negativePrompt**: English negative prompt, 30-80 words, describing styles, sounds, and production problems to avoid
- **qualityChecks**: 5-7 条质量检查结论，覆盖副歌记忆点、歌词自然度、风格清晰度、prompt 可执行性、侵权/模仿风险、平台适配
- **revisionSuggestions**: 3-5 条下一轮修改建议，每条必须可直接执行
- **variants**: 3 个可继续打磨的方向，每个包含 title、direction、hookLine、stylePrompt、revisionFocus

## fullPrompt 格式规范

fullPrompt must be written in English, with each item on its own line:

\`\`\`
Genre: [main genre + subgenres]
Tempo: [specific BPM extracted from the tempo parameter]
Key: [recommended key, e.g. C minor / G major]
Mood: [3-5 mood keywords]
Instruments: [core instruments ordered by mix importance]
Vocal: [vocal tone and performance direction]
Production: [production texture, mix direction, ambience]
Structure: [section order, e.g. Intro-Verse 1-Pre-Chorus-Chorus-Verse 2-Chorus-Bridge-Final Chorus-Outro]
Dynamics: [energy curve, e.g. intimate intro -> gradual verse build -> explosive chorus]
\`\`\`

## 歌词创作标准

1. 段落标记必须用方括号格式，如 [Verse 1]、[Chorus]
2. 副歌要有记忆点，句式简短，适合重复
3. 主歌叙事感强，细节具体，避免空泛抒情
4. 押韵自然，不硬凑；中文歌词避免翻译腔
5. 情绪要有递进：主歌铺垫 → 预副歌推升 → 副歌爆发
6. Bridge 段落要有转折感，可以换视角或换情绪

## 热榜歌词规则

如果用户提供了热榜歌词结构，必须优先执行：

- 开篇第一句必须先给具象自然画面，禁止直接抒情或态度输出
- 15s 传播单元控制在 2-3 句，每句可独立截取
- 核心句以 6-8 字轻盈短句为主，景多情少，情绪克制
- 采用轻对仗、微排比、留白陈述，不使用僵硬对称或长篇故事线
- 优先使用规则给出的意象词和情绪词，避开规则给出的淘汰词
- 禁止人称强绑定，减少"我/你/他"的高频直接指代，提高二创普适性

## 风格转译规则

- 用户选择的风格标签需要转译为具体的音乐制作术语（如"抒情摇滚"→ 另类摇滚抒情曲, 失真吉他层次堆叠, 情绪化动态推进）
- 人声描述中如果提到歌手名字，转写为非侵权的音乐特征描述（如"周杰伦式含糊咬字"→ 松弛咬字, 对话式唱法, 带有微妙的节奏变化）
- 节奏参数需提取具体 BPM 中值（如"中慢板 72-88 BPM"→ 80 BPM）
- 根据风格组合推导合适的乐器配置、调性和制作质感
- 如果 generationMode 是"生成 3 个方向"，主歌词仍输出最推荐版本，同时 variants 必须给出 3 个明显不同的后续方向
- 如果 iterationInstruction 不为空，优先执行该迭代指令，并明确保留不需要改变的部分`

  const prompt = `## 创作意图

${request.idea}

## 创作参数

- 语言：${request.language}
- 生成模式：${request.generationMode || '生成 1 个精修版'}
- 迭代指令：${request.iterationInstruction || '无'}
- 热榜歌词结构：${request.hotLyricRule || '不使用热榜规则'}
- 音乐风格：${request.style}
- 情绪状态：${request.mood}
- 氛围感：${request.atmosphere}
- 人声特质：${request.vocal}
- 演唱形式：${request.vocalArrangement}
- 速度：${request.tempo}
- 律动感：${request.groove}
- 调性：${request.key}
- 能量曲线：${request.energyCurve}
- 编曲元素：${request.arrangement || '无特殊要求'}
- 歌曲结构：${request.structure}
- 目标平台：${request.platform}
- 歌词密度：${request.lyricDensity}
- 押韵模式：${request.rhymeScheme}
- 是否押韵：${request.rhyme ? '是' : '否'}
- 使用场景：${request.useCase}
- 歌曲长度：${request.songLength}
## 生成指令

请根据以上信息生成完整的歌曲内容。歌词、标题、概念、质量检查和修改建议使用用户选择的语言；所有 Prompt 相关字段必须使用英文，包括 stylePrompt、arrangement、vocalPrompt、fullPrompt、sunoPrompt、udioPrompt、miaoxiangPrompt 和 negativePrompt。特别注意：

1. **Genre line in fullPrompt**: translate the user's style tags into professional English music production terms while preserving subgenre detail
2. **Tempo line**: extract a specific BPM value from the tempo parameter
3. **Instruments line**: infer 4-8 core instruments from the style blend, ordered by mix importance
4. **Production line**: describe concrete mix and production direction in English, e.g. "warm analog tape saturation, wide hall reverb, punchy drum compression"
5. **Arrangement elements**: if the user specifies elements such as humming intro or guitar solo, reflect them in both the lyrics and the English arrangement prompt
6. **Energy curve**: reflect the selected energy curve in lyric progression and arrangement dynamics
7. **Vocal arrangement**: if duet/choir/multiple singers are selected, mark singer sections in lyrics and describe vocal roles in English prompts
8. **Song length**: adjust lyric sections and arrangement scope according to the requested length
9. **Use case**: if it is short-video BGM, bring the chorus/hook in early; if it is film scoring, emphasize atmosphere and gradual development
10. **Platform adaptation**: ${request.platform === 'Suno' ? 'Write Suno prompts as concise English descriptive tags separated by commas' : request.platform === 'Udio' ? 'Write Udio prompts as detailed English descriptions with era references and production texture' : request.platform === '妙响' ? 'Write Miaoxiang prompts in clear English with explicit style, imagery, vocal, and arrangement cues' : 'Write a general-purpose English descriptive prompt'}`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成失败')
  return normalizeSongResult(jsonFromText(result.content))
}

export async function generateLyricsDraft(request: LyricsDraftRequest): Promise<LyricsDraftResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const systemPrompt = `你是网易云音乐的资深中文歌词作者，只负责第一阶段：生成可编辑的歌词草稿，不生成音乐 Prompt。

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 包含以下字段：
- **title**: 歌名，2-8 字
- **concept**: 一句话概念描述，30-60 字
- **lyrics**: 完整歌词，段落标记独占一行，每句歌词独占一行，段落之间空一行
- **hookLine**: 最适合反复记忆的一句歌词
- **lyricAnalysis**: 简短分析歌词视角、句式密度、押韵与意象
- **emotionCurve**: 情绪曲线，如"克制主歌 -> 预副歌推升 -> 副歌释放"
- **shortVideoMoment**: 最适合作为 15-30 秒传播片段的段落说明
- **revisionSuggestions**: 3-5 条下一轮可执行修改建议

歌词格式必须类似：
[Intro]

[Verse1]

[Chorus]


禁止用 /、｜ 或空格把多句歌词挤在同一行。`

  const prompt = `## 创作意图

${request.idea}

## 歌词参数

- 迭代指令：${request.iterationInstruction || '无'}
- 语言：根据创作意图自动判断，默认中文
- 形式：完整歌曲歌词草稿，结构清楚，方便后续反推音乐 Prompt
## 生成要求

请先把歌词本身写扎实。不要输出任何风格 prompt、制作 prompt、编曲 prompt 或音乐平台 prompt。`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成歌词失败')
  return normalizeLyricsDraftResult(jsonFromText(result.content))
}

export async function generatePromptFromLyrics(request: PromptFromLyricsRequest): Promise<SongResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const systemPrompt = `你是 汽水音乐 的资深音乐制作人与 AI 音乐 Prompt 工程师。你的任务是第二阶段：读取用户已经确认的歌词，反推最适合这首歌词的英文音乐 Prompt。

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 包含以下字段：
- **title**: 歌名，可沿用用户标题
- **concept**: 中文一句话概念描述
- **lyrics**: 原样返回用户歌词，只做必要分行整理，不改写歌词
- **stylePrompt**: English music style description, 80-150 words
- **arrangement**: English arrangement description, 80-150 words
- **vocalPrompt**: English vocal direction, 50-100 words
- **fullPrompt**: Complete English prompt with Genre/Tempo/Key/Mood/Instruments/Vocal/Production/Structure/Dynamics lines
- **sunoPrompt**: Concise English tag-style prompt for Suno
- **udioPrompt**: Detailed English prompt for Udio
- **miaoxiangPrompt**: Clear English prompt for Miaoxiang
- **lyricOnly**: 原样返回用户歌词
- **negativePrompt**: English negative prompt, 30-80 words
- **qualityChecks**: 5-7 条中文质量检查结论
- **revisionSuggestions**: 3-5 条中文下一轮修改建议
- **variants**: 3 个可继续打磨方向，每个包含 title、direction、hookLine、stylePrompt、revisionFocus

Prompt 必须服务歌词：根据歌词句式密度、叙事视角、Hook 强度、段落结构和情绪曲线来选择流派、BPM、调性、人声、编曲层次和制作质感。不要泛泛描述。`

  const prompt = `## 已确认歌词

标题：${request.title || '未命名'}
概念：${request.concept || '无'}

${request.lyrics}

## Prompt 生成参数

- 约束：${request.constraints || '歌词不要改写；Prompt 使用英文；避免模仿具体歌手或现有作品'}

## 输出要求

不要重写歌词。不要依赖外部创作参数。请只根据歌词的语言、情绪、句式密度、段落结构、Hook 和画面感，自动反推音乐制作方案，并输出英文 Prompt。`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成 Prompt 失败')
  return normalizeSongResult(jsonFromText(result.content))
}

export async function generateHitLab(request: HitLabRequest): Promise<HitLabResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const versionCount = Math.max(2, Math.min(8, Math.round(request.versionCount || 4)))
  const platforms = request.targetPlatforms.length > 0 ? request.targetPlatforms.join(' / ') : '抖音 / 汽水音乐'
  const learnedStrategy = buildLearnedProfile(loadHitIntelligence(), loadHitExperiments()).strategyText
  const stageConfig = getCreationStageConfig(request.creationStage)

  const systemPrompt = `你是 汽水音乐 的爆款歌曲 Prompt 实验导演，专注生成歌词和音乐 AI Prompt，不做音频编辑、混音或 DAW 指导。

你的目标：围绕同一个创意生成多个可测试的爆款候选版本，服务抖音与汽水音乐传播，同时保留可进入音乐 AI 平台生成成品的完整提示词。

## 输出规范

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 包含以下字段：

- **summary**: 本轮实验策略总结，说明核心爆点和版本差异
- **variants**: 候选数组，数量必须等于用户要求的版本数。每个候选包含：
  - **title**: 歌名，2-8 字
  - **positioning**: 一句话定位，说明听众、情绪和传播角度
  - **targetPlatform**: 最适合的平台，可写"抖音"、"汽水音乐"或"双平台"
  - **hookLine**: 最抓耳的一句歌词，必须短、口语、适合反复
  - **firstThreeSeconds**: 前 3 秒听感摘要
  - **introHook**: 前奏唯一抓耳机制，说明是人声、节奏、标志音色、反差静默还是场景声音
  - **introTimeline**: 按 0-1s、1-3s、3-8s 分段描述声音事件和能量变化，禁止泛泛写“渐入”
  - **hookEntrySeconds**: 核心 Hook 首次进入的具体秒数，0-30
  - **signatureSound**: 前奏中可在一秒内识别的标志声音
  - **loopTransition**: 15 秒片段尾部如何自然接回开头，形成循环
  - **introRisks**: 2-3 个前奏风险，例如信息不足、铺垫过长、通用音色、第一拍不清晰
  - **targetDurationSeconds**: 成品目标秒数；Hook探索填建议片段秒数，完整歌曲可填 150-240
  - **structurePlan**: 带具体秒点的段落计划，必须符合用户选择的创作阶段
  - **completenessTest**: 一句话说明为什么它在目标时长内是完整作品而非被截断的长歌
  - **chorusSnippet**: 适合短视频循环的副歌片段，4-8 行。JSON 字符串中必须使用 \n 换行，不允许用 / 分隔
  - **lyrics**: 歌词草案；Hook 探索阶段只写 [Hook] 核心段落，完整化阶段才写完整歌曲。每个段落标记独占一行，每句歌词独占一行，段落之间空一行；JSON 字符串中必须使用 \n 换行，不允许用 / 分隔
  - **stylePrompt**: 风格 prompt，包含流派、BPM、人声、核心乐器、制作质感
  - **fullPrompt**: 可直接复制到音乐 AI 平台的完整中文 prompt
  - **douyinScore**: 0-100，抖音短视频传播潜力
  - **qishuiScore**: 0-100，汽水音乐完整收听/收藏潜力
  - **memorabilityScore**: 0-100，副歌记忆点
  - **spreadPotential**: 传播理由，说明为什么可能被使用或转发
  - **shortVideoUseCases**: 3-5 个短视频使用场景
  - **riskNotes**: 2-4 个风险点，如同质化、歌词空泛、AI 味、侵权相似感
  - **iterationAdvice**: 下一轮如何改得更强

## 判断标准

1. 抖音优先前 3 秒、强情绪、短句复读、画面适配和二创空间
2. 汽水音乐优先完整歌曲成立度、副歌复听、情绪陪伴、歌名与收藏欲
3. 爆款版本要清晰，不要堆砌过多风格；实验版本可以融合，但必须说明传播入口
4. 避免要求模仿具体歌手声音或复制已有歌词；若用户给出类似要求，转写为通用音乐特征
5. 每个候选必须有明显差异，不能只是改标题`

  const prompt = `## 爆款实验目标

${request.idea}

## 实验参数

- 目标平台：${platforms}
- 目标听众：${request.audience || '18-35 岁中文流行音乐听众'}
- 情绪核心：${request.emotionalCore || '强共鸣、易代入'}
- 风格融合：${request.styleBlend || '华语流行为底，适度融合新鲜元素'}
- Hook 类型：${request.hookType || '副歌短句抓耳'}
- 歌词角度：${request.lyricAngle || '口语化第一人称'}
- 候选数量：${versionCount}
- 约束与禁区：${request.constraints || '避免复制现有歌曲；避免过度模仿具体歌手；歌词要自然口语'}
- 本轮控制变量：${request.mutationFocus || '自由探索'}
- 创作阶段：${request.creationStage || 'Hook探索'}
- 目标时长：${stageConfig.durationLabel}
- 阶段结构：${stageConfig.structure}
- 前奏偏好：${request.introPreference || '由策略自动决定'}

## 从历史真实选择学习到的策略

${learnedStrategy || '暂无足够历史反馈，本轮不应用个人偏好先验'}

## 生成指令

请生成 ${versionCount} 个候选版本。

阶段规则：
- 如果是“Hook探索”：不要浪费篇幅写完整歌曲。lyrics 只返回带 [Hook] 标记的 8-20 秒核心段落；chorusSnippet 返回同一核心段落；fullPrompt 只描述生成该段 Hook 所需的最小音乐指令。重点拉开核心句、节奏落点、前3秒入口和人声人格。
- 如果是“15秒循环”：严格按 0-1s 标志声音、1-3s 身份建立、3-12s 完整 Hook、12-15s 回环设计；只写完成这个闭环需要的歌词，禁止主歌、Bridge、长前奏和淡出。
- 如果是“30秒短单曲”：按 0-3s 抓手、3-8s 预 Hook、8-23s 核心 Hook、23-27s 复唱变体、27-30s 回环设计；允许极短铺垫但禁止传统完整主歌和桥段。
- 如果是“60秒微型歌曲”：按极短主歌、预副歌、核心 Hook、一次变体和最终 Hook 构成完整微型歌曲；不得机械压缩三分钟歌曲，也不得用长器乐填时长。
- 如果是“完整化”：围绕用户已选中的 Hook 写完整歌词和可复制到音乐 AI 平台的 fullPrompt；必须原样保留核心 Hook，不得在扩写时稀释或改坏。

目标结构校验：${stageConfig.structure}。${stageConfig.requiresLoop ? '结尾必须在节拍、和声或尾音上自然接回第一秒，禁止淡出。' : '优先保证该时长内情绪和音乐结构完整。'}

前奏硬性要求：
- 抖音方向必须在 0-1 秒出现清晰声音事件，3 秒内建立歌曲身份；除非策略是刻意静默反差，否则禁止通用氛围 Pad 慢慢渐入
- 汽水方向允许 5-12 秒前奏，但前 3 秒必须给出旋律承诺、标志音色或人声人格，不能等到副歌才出现记忆点
- 每个候选的前奏抓耳机制必须不同，至少覆盖人声冷开场、节奏卡点、标志音色、反差/场景声音中的不同路线
- hookEntrySeconds 必须与 introTimeline 和 fullPrompt 一致
- loopTransition 必须考虑短视频片段首尾循环，而不是简单淡出

如果“本轮控制变量”不是“自由探索”，必须保留用户创意中未被点名的核心部分，只改变指定变量；候选之间也主要沿该变量拉开差异，避免整首推倒重写。

历史策略只用于提高命中率，不得照抄参考作品；若历史偏好与用户本轮明确要求冲突，以本轮要求为准。

歌词格式硬性要求：
- lyrics 和 chorusSnippet 必须是真正的分行文本
- 段落标记如 [Verse 1]、[Chorus] 必须独占一行
- 每句歌词必须独占一行
- 段落之间空一行
- 不允许使用 /、｜、空格把多句歌词挤在同一行
- 结构示例：
[Intro]
(轻电子鼓点点击)

[Verse1]
早起二十分钟 绕了半条街
就为买我想吃的芋泥贝果

[Chorus]
贝果碎了半块
快乐多了半块
生活有点难
也会有惊喜来

在候选数量允许时，版本设计建议：
1. 至少 1 个偏抖音 15 秒爆点
2. 至少 1 个偏汽水音乐完整收听
3. 至少 1 个偏商业流行稳妥版本
4. 至少 1 个偏融合/实验但仍有传播入口的版本

评分要拉开差异，不要全部高分。`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成失败')
  return normalizeHitLabResult(jsonFromText(result.content))
}

export async function generateHitStrategies(request: HitLabRequest): Promise<HitStrategyResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')
  const learnedStrategy = buildLearnedProfile(loadHitIntelligence(), loadHitExperiments()).strategyText

  const systemPrompt = `你是 汽水音乐 的音乐产品策略导演。你的用户可能完全不懂流派、BPM、编曲和人声术语。

你的任务不是直接写歌，而是把用户用日常语言描述的创意，转译为 4 张差异显著、可供选择的音乐策略卡。

只返回 JSON：
{"summary":"...","cards":[{"id":"lyric|melody|vocal|video|experimental","title":"...","positioning":"...","primaryStrength":"...","audience":"...","emotionalCore":"...","styleBlend":"...","hookType":"...","lyricAngle":"...","productionPlan":"...","introBlueprint":"...","hookEntrySeconds":3,"signatureSound":"...","loopDesign":"...","advantages":["..."],"risks":["..."]}]}

硬性要求：
1. 返回恰好 4 张卡，至少覆盖歌词共鸣、旋律传播、声音人格、视频卡点/实验反差中的四种不同主优势
2. 卡片之间不得只是更换流派名；受众、情绪曲线、Hook机制、人声和制作方法都要有实质差异
3. 每张卡只能有一个主要爆点，其他维度为它服务
4. styleBlend 必须是可执行的完整制作策略，包含流派底盘、BPM范围、律动、人声人格、核心乐器、熟悉元素和意外元素
5. 使用通用音乐特征，不模仿具体歌手或现有歌曲
6. advantages 和 risks 各 2-3 条，必须具体
7. 不得默认回到都市轻R&B、深夜、疲惫或打工人，除非用户创意明确要求`

  const prompt = `## 用户用日常语言表达的需求

- 核心创意：${request.idea}
- 使用场景：${request.useScenario || '未指定，请根据创意推导'}
- 第一耳感觉：${request.firstImpression || '未指定，请提供不同方案'}
- 主要爆点：${request.creativePriority || '未指定，请让四张卡分别竞争'}
- 前奏入口偏好：${request.introPreference || '自动选择最适合该路线的前奏抓手'}
- 目标作品形态：${getCreationStageConfig(request.creationStage).label}（${getCreationStageConfig(request.creationStage).structure}）
- 目标平台：${request.targetPlatforms.join(' / ') || '抖音 / 汽水音乐'}
- 禁区：${request.constraints || '避免复制现有歌曲，避免网文腔和AI味'}

## 历史真实偏好

${learnedStrategy || '暂无历史数据，不要臆造用户偏好'}

请生成 4 张真正不同的策略卡。即使用户指定了主要爆点，也要让四张卡通过不同音乐机制实现该目标，而不是给出四个近义版本。`

  const response = await chat(config, systemPrompt, prompt)
  if (!response.success) throw new Error(response.error ?? 'AI 生成策略失败')
  const result = normalizeHitStrategyResult(jsonFromText(response.content))
  if (result.cards.length < 2) throw new Error('AI 没有返回足够的差异化策略')
  if (!hasSufficientStrategyDiversity(result.cards)) throw new Error('AI 返回的策略过于相似，请重新生成音乐路线')
  return result
}

export async function generateHitLabIdea(request: HitLabRequest): Promise<HitLabIdeaResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const platforms = request.targetPlatforms.length > 0 ? request.targetPlatforms.join(' / ') : '抖音 / 汽水音乐'
  const intelligence = loadHitIntelligence()
  const recentIdeas = [request.idea, ...intelligence.recentIdeas.map(item => item.idea)].filter(Boolean)
  const recentCategoryIds = intelligence.recentIdeas.map(item => item.categoryId)

  const systemPrompt = `你是 汽水音乐 的爆款音乐创意策划，只负责为歌词和歌曲 Prompt 实验生成一个核心创意。

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 格式：
{"idea":"...","category":"...","lyricAngle":"...","emotionalCore":"...","hookType":"..."}

创意要求：
1. 80-140 个中文字符
2. 必须包含一个具体生活场景、一个情绪反差、一个适合副歌重复的 Hook 方向
3. 面向抖音/汽水音乐传播，但不要写运营方案
4. 不要要求模仿具体歌手，不要引用已有歌词
5. 每次都要有新鲜角度，避免泛泛的失恋、治愈、热血空话
6. lyricAngle 必须是适配该创意的新歌词角度，使用 4-8 个中文字符概括
7. emotionalCore 使用 3-5 个情绪关键词，以顿号分隔
8. hookType 使用 4-8 个中文字符概括核心抓耳方式
9. category 必须逐字返回程序指定的题材名称
10. 程序已经完成随机抽签，你不得自行更换题材`

  let best: { result: HitLabIdeaResult; categoryId: string; similarity: number } | null = null
  const attemptedCategories: string[] = []

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const topic = chooseNextTopic([...attemptedCategories, ...recentCategoryIds])
    attemptedCategories.unshift(topic.id)
    const prompt = `请严格围绕程序抽中的题材生成 1 条新核心创意。

## 本次程序抽签结果

- 指定题材：${topic.label}
- 题材边界：${topic.brief}
- 禁止改成其他题材，尤其不能为了“共鸣”自动改成深夜加班、下班疲惫或打工人独白

## 当前实验偏好

- 目标平台：${platforms}
- 目标听众：${request.audience || '18-35 岁中文流行音乐听众'}
- 风格融合：${request.styleBlend || '华语流行为底，适度融合新鲜元素'}
- 约束与禁区：${request.constraints || '避免复制现有歌曲；避免过度模仿具体歌手；歌词要自然口语'}

## 必须避开的近期内容

当前创意：${request.idea || '无'}
当前情绪：${request.emotionalCore || '无'}
当前歌词角度：${request.lyricAngle || '无'}
当前 Hook 类型：${request.hookType || '无'}
近期创意摘要：${intelligence.recentIdeas.slice(0, 5).map(item => `[${item.category}] ${item.idea}`).join('\n') || '无'}

新创意必须更换具体人物、地点、关系、动作和核心表达，不得只替换几个名词。

请只返回 JSON。`

    const response = await chat(config, systemPrompt, prompt)
    if (!response.success) throw new Error(response.error ?? 'AI 生成失败')
    const ideaResult = normalizeHitLabIdeaResult(jsonFromText(response.content))
    if (!ideaResult.idea) continue
    ideaResult.category = topic.label
    const similarity = Math.max(0, ...recentIdeas.map(item => textSimilarity(ideaResult.idea, item)))
    if (!best || similarity < best.similarity) best = { result: ideaResult, categoryId: topic.id, similarity }
    if (!isTooSimilar(ideaResult.idea, recentIdeas)) break
  }

  if (!best) throw new Error('AI 连续返回无效创意，请重试')
  intelligence.recentIdeas.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    categoryId: best.categoryId,
    category: best.result.category,
    idea: best.result.idea
  })
  intelligence.recentIdeas = intelligence.recentIdeas.slice(0, 30)
  saveHitIntelligence(intelligence)
  return best.result
}
