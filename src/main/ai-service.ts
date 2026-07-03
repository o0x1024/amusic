import { resolveProtocol } from '../shared/model-providers'
import type { HitLabIdeaResult, HitLabRequest, HitLabResult, HitLabVariant, ModelConfig, ModelResponse, SongRequest, SongResult } from '../shared/types'
import { getActiveConfig, getGenerationParams } from './settings-store'

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

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(extractError(data))
  return data
}

export async function chat(config: ModelConfig, systemPrompt: string, prompt: string): Promise<ModelResponse> {
  const start = Date.now()
  const protocol = resolveProtocol(config.model_type, config.provider_protocol)
  const params = getGenerationParams()

  try {
    if (protocol === 'gemini') {
      const url = `${stripTrailingSlash(config.api_base)}/v1beta/models/${config.model_name}:generateContent?key=${config.api_key}`
      const data = await postJson(url, { 'Content-Type': 'application/json' }, {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: params.temperature,
          topP: params.topP,
          maxOutputTokens: params.maxTokens
        }
      }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }

      return {
        success: true,
        content: data.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '',
        durationMs: Date.now() - start
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
    const data = await postJson(
      `${stripTrailingSlash(config.api_base)}/chat/completions`,
      {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.api_key}`
      },
      {
        model: config.model_name,
        messages,
        temperature: params.temperature,
        top_p: params.topP,
        max_tokens: params.maxTokens,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
        response_format: { type: 'json_object' }
      }
    ) as { choices?: Array<{ message?: { content?: string } }> }

    return {
      success: true,
      content: data.choices?.[0]?.message?.content ?? '',
      durationMs: Date.now() - start
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start
    }
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
  return {
    title: data.title?.trim() || '未命名歌曲',
    concept: data.concept?.trim() || '',
    lyrics: data.lyrics?.trim() || '',
    stylePrompt: data.stylePrompt?.trim() || '',
    arrangement: data.arrangement?.trim() || '',
    vocalPrompt: data.vocalPrompt?.trim() || '',
    fullPrompt: data.fullPrompt?.trim() || '',
    negativePrompt: data.negativePrompt?.trim() || ''
  }
}

function boundedScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
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
    lyricAngle: data.lyricAngle?.trim() || '',
    emotionalCore: data.emotionalCore?.trim() || '',
    hookType: data.hookType?.trim() || ''
  }
}

export async function generateSong(request: SongRequest): Promise<SongResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const systemPrompt = `你是 amusic 的资深音乐制作人与 AI 音乐提示词工程师，精通 Suno、Udio、Stable Audio 等主流音乐 AI 平台的 prompt 最佳实践。

你的核心任务：将用户的模糊创作意图转译为结构化、可稳定复现的音乐 AI 提示词。

## 输出规范

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 包含以下字段：

- **title**: 歌曲标题，简短有力（2-8 字）
- **concept**: 一句话概念描述（30-60 字），概括歌曲核心意象与听感方向
- **lyrics**: 完整歌词，必须包含段落标记 [Intro]/[Verse 1]/[Pre-Chorus]/[Chorus]/[Verse 2]/[Bridge]/[Final Chorus]/[Outro] 等
- **stylePrompt**: 音乐风格描述（80-150 字），需包含具体流派、子流派、年代质感、参考制作方向
- **arrangement**: 编曲描述（80-150 字），逐段说明各乐器进入/退出时机和演奏方式
- **vocalPrompt**: 人声指导（50-100 字），描述音色、唱法、力度变化、和声编排
- **fullPrompt**: 最终可直接粘贴到音乐 AI 平台的完整提示词，使用中文撰写，格式见下
- **negativePrompt**: 需避免的风格、声音、制作问题（30-80 字），使用中文

## fullPrompt 格式规范

fullPrompt 必须使用中文，按以下结构组织，每项单独一行：

\`\`\`
流派：[主流派 + 子流派，中英文均可]
速度：[具体 BPM 数值，从用户节奏参数中提取]
调性：[建议调性，如 c小调 / G大调]
情绪：[3-5 个情绪关键词]
乐器：[核心乐器列表，按混音重要性排序]
人声：[人声特征描述]
制作：[制作质感、混音方向、空间效果]
结构：[段落顺序简写，如 前奏-主歌1-预副歌-副歌-主歌2-副歌-桥段-终副歌-尾奏]
动态：[能量曲线描述，如 低-前奏 → 渐强-主歌 → 爆发-副歌]
\`\`\`

## 歌词创作标准

1. 段落标记必须用方括号格式，如 [Verse 1]、[Chorus]
2. 副歌要有记忆点，句式简短，适合重复
3. 主歌叙事感强，细节具体，避免空泛抒情
4. 押韵自然，不硬凑；中文歌词避免翻译腔
5. 情绪要有递进：主歌铺垫 → 预副歌推升 → 副歌爆发
6. Bridge 段落要有转折感，可以换视角或换情绪

## 风格转译规则

- 用户选择的风格标签需要转译为具体的音乐制作术语（如"抒情摇滚"→ 另类摇滚抒情曲, 失真吉他层次堆叠, 情绪化动态推进）
- 人声描述中如果提到歌手名字，转写为非侵权的音乐特征描述（如"周杰伦式含糊咬字"→ 松弛咬字, 对话式唱法, 带有微妙的节奏变化）
- 节奏参数需提取具体 BPM 中值（如"中慢板 72-88 BPM"→ 80 BPM）
- 根据风格组合推导合适的乐器配置、调性和制作质感`

  const prompt = `## 创作意图

${request.idea}

## 创作参数

- 语言：${request.language}
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
${request.referenceLyrics.trim() ? `
## 参考歌词

${request.referenceLyrics.trim()}

请深入分析参考歌词的段落结构、句式长度、押韵模式、意象选择和情绪弧线。在吸收其写作手法的基础上创作全新歌词，不要复制原歌词的句子或独特表达。
` : ''}
## 生成指令

请根据以上信息生成完整的歌曲内容。所有输出字段（包括 fullPrompt 和 negativePrompt）均使用中文撰写。特别注意：

1. **fullPrompt 中的流派行**：将用户选择的风格标签转译为专业的音乐制作术语，保留子流派细节
2. **速度行**：从速度参数中提取具体 BPM 数值
3. **乐器行**：根据风格组合推导 4-8 件核心乐器，按编曲重要性排序
4. **制作行**：结合风格和年代标签，给出具体的混音和制作方向（如"温暖模拟磁带饱和, 宽敞大厅混响, 有力鼓组压缩"）
5. **编曲元素**：如果用户指定了编曲元素（如前奏哼唱、间奏吉他Solo等），必须在歌词和编曲描述中体现这些元素的位置和表现形式
6. **能量曲线**：根据用户选择的能量曲线，在歌词的情绪递进和编曲的动态变化中体现
7. **演唱形式**：如果用户选择了对唱/合唱等形式，歌词中需要标注不同歌手的段落
8. **歌曲长度**：根据长度要求调整歌词段落数量和编曲篇幅
9. **使用场景**：如果是短视频BGM，副歌要快速进入；如果是影视配乐，注重氛围铺陈
10. **目标平台适配**：${request.platform === 'Suno' ? 'Suno 偏好简洁描述性 prompt，流派行使用逗号分隔的标签' : request.platform === 'Udio' ? 'Udio 偏好详细的风格描述，可以包含参考年代和制作质感' : request.platform === '妙响' ? '妙响支持中文描述，使用中文风格标签' : '使用通用的描述性 prompt'}`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成失败')
  return normalizeSongResult(jsonFromText(result.content))
}

export async function generateHitLab(request: HitLabRequest): Promise<HitLabResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const versionCount = Math.max(2, Math.min(8, Math.round(request.versionCount || 4)))
  const platforms = request.targetPlatforms.length > 0 ? request.targetPlatforms.join(' / ') : '抖音 / 汽水音乐'

  const systemPrompt = `你是 amusic 的爆款歌曲 Prompt 实验导演，专注生成歌词和音乐 AI Prompt，不做音频编辑、混音或 DAW 指导。

你的目标：围绕同一个创意生成多个可测试的爆款候选版本，服务抖音与汽水音乐传播，同时保留可进入音乐 AI 平台生成成品的完整提示词。

## 输出规范

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 包含以下字段：

- **summary**: 本轮实验策略总结，说明核心爆点和版本差异
- **variants**: 候选数组，数量必须等于用户要求的版本数。每个候选包含：
  - **title**: 歌名，2-8 字
  - **positioning**: 一句话定位，说明听众、情绪和传播角度
  - **targetPlatform**: 最适合的平台，可写"抖音"、"汽水音乐"或"双平台"
  - **hookLine**: 最抓耳的一句歌词，必须短、口语、适合反复
  - **firstThreeSeconds**: 前 3 秒听感设计，用歌词/人声/节奏描述，不涉及音频编辑操作
  - **chorusSnippet**: 适合短视频循环的副歌片段，4-8 行。JSON 字符串中必须使用 \n 换行，不允许用 / 分隔
  - **lyrics**: 完整歌词草案，包含 [Intro]/[Verse]/[Pre-Chorus]/[Chorus]/[Bridge] 等段落。每个段落标记独占一行，每句歌词独占一行，段落之间空一行；JSON 字符串中必须使用 \n 换行，不允许用 / 分隔
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

## 生成指令

请生成 ${versionCount} 个候选版本。每个版本都必须包含完整歌词和可复制到音乐 AI 平台的 fullPrompt。

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

版本设计建议：
1. 至少 1 个偏抖音 15 秒爆点
2. 至少 1 个偏汽水音乐完整收听
3. 至少 1 个偏商业流行稳妥版本
4. 至少 1 个偏融合/实验但仍有传播入口的版本

评分要拉开差异，不要全部高分。`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成失败')
  return normalizeHitLabResult(jsonFromText(result.content))
}

export async function generateHitLabIdea(request: HitLabRequest): Promise<HitLabIdeaResult> {
  const config = getActiveConfig()
  if (!config) throw new Error('没有可用的模型配置，请先在系统设置 → AI 服务中配置并启用至少一个模型')

  const platforms = request.targetPlatforms.length > 0 ? request.targetPlatforms.join(' / ') : '抖音 / 汽水音乐'
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const systemPrompt = `你是 amusic 的爆款音乐创意策划，只负责为歌词和歌曲 Prompt 实验生成一个核心创意。

只输出 JSON，不要输出 Markdown 或任何额外文字。JSON 格式：
{"idea":"...","lyricAngle":"...","emotionalCore":"...","hookType":"..."}

创意要求：
1. 80-140 个中文字符
2. 必须包含一个具体生活场景、一个情绪反差、一个适合副歌重复的 Hook 方向
3. 面向抖音/汽水音乐传播，但不要写运营方案
4. 不要要求模仿具体歌手，不要引用已有歌词
5. 每次都要有新鲜角度，避免泛泛的失恋、治愈、热血空话
6. lyricAngle 必须是适配该创意的新歌词角度，使用 4-8 个中文字符概括
7. emotionalCore 使用 3-5 个情绪关键词，以顿号分隔
8. hookType 使用 4-8 个中文字符概括核心抓耳方式

题材池必须广，不要连续围绕前任、失恋、暗恋、分手。优先随机选择这些方向之一：
- 打工人/通勤/下班后的荒诞感
- 朋友、室友、同事之间的微妙关系
- 家庭、亲情、代际沟通
- 自我成长、摆烂、反内耗
- 城市观察、夜市、便利店、地铁、电梯
- 夏日旅行、县城、校园、节日
- 赛博生活、AI 陪伴、手机依赖、社交平台疲惫
- 反差爽感、轻喜剧、自嘲、黑色幽默
- 实验性意象、梦境、未来感、非人称叙事
- 少量爱情题材，但不能默认是前任/失恋`

  const prompt = `请随机生成 1 条新的核心创意，用于爆款实验台。

## 当前实验偏好

- 目标平台：${platforms}
- 目标听众：${request.audience || '18-35 岁中文流行音乐听众'}
- 风格融合：${request.styleBlend || '华语流行为底，适度融合新鲜元素'}
- 约束与禁区：${request.constraints || '避免复制现有歌曲；避免过度模仿具体歌手；歌词要自然口语'}
- 随机种子：${seed}

## 去偏要求

除非约束与禁区明确要求爱情/前任/失恋，否则不要沿用当前输入里的旧题材、旧情绪核心、旧歌词角度或旧 Hook 类型。
本次请主动换一个题材领域，并同步给出新的 lyricAngle、emotionalCore 和 hookType。

请只返回 JSON。`

  const result = await chat(config, systemPrompt, prompt)
  if (!result.success) throw new Error(result.error ?? 'AI 生成失败')
  const ideaResult = normalizeHitLabIdeaResult(jsonFromText(result.content))
  if (!ideaResult.idea) throw new Error('AI 没有返回可用的核心创意')
  return ideaResult
}
