<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import type { HitBlindStage, HitExperimentRecord, HitExperimentRound, HitExperimentVariant, HitExternalGeneration, HitExternalPlatform, HitFeedbackDimension, HitFirstImpression, HitHookVerdict, HitIntroVerdict, HitLabRequest, HitLabResult, HitLabVariant, HitLyricProtection, HitLyricRouteCard, HitLyricScores, HitLyricsAnalysisResult, HitMutationFocus, HitStrategyCard, HitStrategyField } from '../../../shared/types'
import { updateElo } from '../../../shared/hit-intelligence'
import { mergeStrategyFields } from '../../../shared/hit-strategy'
import { HIT_CREATION_STAGES, getCreationStageConfig, normalizeCreationStage } from '../../../shared/creation-stage'
import { lyricRouteContext } from '../../../shared/hit-lyric-route'

const platformOptions = ['抖音', '汽水音乐', '小红书', 'B站']
const hookOptions = ['副歌短句抓耳', '开头一句杀', '情绪反差', '土味但高级', '旋律洗脑', '合唱跟唱', '说唱记忆点', '生活口头禅', '反复自嘲']
const angleOptions = ['生活观察', '人物小传', '群像蒙太奇', '轻喜剧吐槽', '方言宣言', '物件第一人称', '劳动节奏', '知识典故重构', '儿童视角', '社区故事', '朋友视角', '家庭日常', '成长释怀', '近未来寓言', '无人物自然叙事', '亲密关系对话', '抽象实验叙事']
const mutationOptions: HitMutationFocus[] = ['自由探索', '只改核心句', '只改叙事引擎', '只改中心意象', '只改情绪矛盾', '只改具体细节', '只改歌词视角', '只改人称距离', '只改Hook言语动作', '只改信息留白度', '只改重复方式', '只改节奏与速度', '只改人声人格', '只改前3秒', '只改歌曲结构']
const lyricFeedbackDimensions: HitFeedbackDimension[] = ['像真人写的', '核心句记忆', '歌词共鸣', '引用欲', '叙事推进']
const audioFeedbackDimensions: HitFeedbackDimension[] = ['前奏停留', '第一耳停留', '演唱放大', '编曲放大', '视频适配', '复听意愿', '声音期待']
const externalPlatforms: HitExternalPlatform[] = ['妙响', 'Suno', 'Udio', '其他']
const firstImpressions: HitFirstImpression[] = ['想继续听', '无感', '想跳过']
const hookVerdicts: HitHookVerdict[] = ['成立', '勉强', '不成立']
const introVerdicts: HitIntroVerdict[] = ['抓住我了', '一般', '想跳过']
const strongestPartOptions = ['歌词', '旋律', '节奏', '人声', '氛围']
const biggestProblemOptions = ['太普通', '不抓耳', 'AI味', '人声不对', '编曲平', '情绪过度', '没有明显问题']
const scenarioOptions = ['短视频日常记录', '旅行与风景', '情绪文案', '家庭照片', '校园青春', '变装转场', '影视感片段', '完整歌曲陪伴']
const impressionOptions = ['真实克制', '第一秒惊艳', '轻松有趣', '温暖陪伴', '强烈爆发', '神秘新鲜', '想跟着唱']
const priorityOptions = ['歌词共鸣', '旋律传播', '声音人格', '视频卡点', '实验反差']
const introPreferenceOptions = ['AI自动决定', '人声冷开场', '第一拍卡点', '标志音色', '反差空拍', '场景声音', '零前奏直入Hook']
const lyricProtectionOptions: Array<{ value: HitLyricProtection; description: string }> = [
  { value: '原文锁定', description: '不得新增或改写原句；可按目标时长抽取、重复和重排' },
  { value: '允许删减重排', description: '可以删句、重复和调整顺序，但不改句子' },
  { value: '允许轻微润色', description: '允许为演唱、押韵和口语感做小幅修改' },
  { value: '允许深度改编', description: '保留主题、事实和核心句，允许重新组织' }
]
const strategyFieldLabels: Record<HitStrategyField, string> = { audience: '目标听众', emotionalCore: '情绪', styleBlend: '音乐策略', hookType: 'Hook', lyricAngle: '歌词角度' }
const lyricScoreLabels: Record<keyof HitLyricScores, string> = {
  hookCompression: '核心句压缩度',
  specificity: '具体性',
  conversationalNaturalness: '口语自然度',
  narrativeProgression: '叙事推进',
  singability: '传唱性',
  quoteDesire: '引用欲',
  remixOpenness: '二创开放度',
  fullSongExpansion: '完整歌曲扩展潜力'
}

function emptyLyricScores(): HitLyricScores {
  return { hookCompression: 0, specificity: 0, conversationalNaturalness: 0, narrativeProgression: 0, singability: 0, quoteDesire: 0, remixOpenness: 0, fullSongExpansion: 0 }
}

const selectedPlatforms = ref(['抖音', '汽水音乐'])
const request = ref<HitLabRequest>({
  sourceMode: 'idea',
  idea: '',
  existingLyrics: '',
  lyricProtection: '原文锁定',
  lyricsAnalysisContext: '',
  targetPlatforms: selectedPlatforms.value,
  audience: '',
  emotionalCore: '',
  styleBlend: '',
  hookType: '',
  lyricAngle: '',
  versionCount: 4,
  constraints: '避免直接模仿具体歌手；不要复制已有歌曲；歌词要自然，不要网文腔。',
  mutationFocus: '自由探索',
  creationStage: 'Hook探索',
  experienceMode: 'beginner',
  useScenario: '短视频日常记录',
  firstImpression: '真实克制',
  creativePriority: '歌词共鸣',
  lockedStrategyFields: [],
  introPreference: 'AI自动决定'
})

const result = ref<HitLabResult | null>(null)
const loading = ref(false)
const refreshingIdea = ref(false)
const error = ref('')
const copied = ref('')
const preparedVariantTitle = ref('')
const refreshedIdeaCategory = ref('')
const strategyCards = ref<HitStrategyCard[]>([])
const strategySummary = ref('')
const selectedStrategyId = ref('')
const strategyLoading = ref(false)
const lyricRouteCards = ref<HitLyricRouteCard[]>([])
const lyricRouteSummary = ref('')
const selectedLyricRouteId = ref('')
const lyricRouteLoading = ref(false)
const lyricsAnalysisLoading = ref(false)
const lyricsAnalysis = ref<HitLyricsAnalysisResult | null>(null)
const lockedStrategyFields = ref<HitStrategyField[]>([])
const activeVariantIndex = ref(0)
const experiment = ref<HitExperimentRecord | null>(null)
const savedExperiments = ref<HitExperimentRecord[]>([])
const pendingParentVariantId = ref('')
const blindPair = ref<[number, number]>([0, 1])
const blindStage = ref<HitBlindStage>('lyrics')
const feedbackDimension = ref<HitFeedbackDimension>('像真人写的')
const feedbackNote = ref('')
const eliminationReason = ref('')
const experimentMessage = ref('')
const submitMessage = ref('')
const testerName = ref('我')
const testerSegment = ref('主创')
const externalDraft = ref<Omit<HitExternalGeneration, 'id' | 'createdAt'>>({
  platform: '妙响',
  versionLabel: '',
  externalId: '',
  externalUrl: '',
  outputCount: 1,
  firstImpression: '无感',
  strongestPart: '',
  biggestProblem: '',
  hookVerdict: '勉强',
  introVerdict: '一般',
  introNote: '',
  bestTimeRange: '',
  advanceToNextRound: false,
  keep: '',
  change: '',
  note: ''
})

const activeVariant = computed(() => result.value?.variants[activeVariantIndex.value] ?? null)
const currentRound = computed(() => experiment.value?.rounds.at(-1) ?? null)
const activeStoredVariant = computed(() => currentRound.value?.variants[activeVariantIndex.value] ?? null)
const blindCandidates = computed(() => {
  const variants = currentRound.value?.variants ?? []
  return [variants[blindPair.value[0]], variants[blindPair.value[1]]].filter(Boolean) as HitExperimentVariant[]
})
const sourceReady = computed(() => request.value.sourceMode === 'lyrics'
  ? Boolean(request.value.existingLyrics?.trim())
  : Boolean(request.value.idea.trim()))
const canGenerate = computed(() => sourceReady.value
  && !loading.value
  && !refreshingIdea.value
  && (request.value.sourceMode === 'lyrics' || Boolean(selectedLyricRouteId.value))
  && (request.value.experienceMode === 'professional' || Boolean(selectedStrategyId.value)))
const feedbackDimensions = computed(() => blindStage.value === 'lyrics' ? lyricFeedbackDimensions : audioFeedbackDimensions)
const activeStageConfig = computed(() => getCreationStageConfig(request.value.creationStage))
const visibleAngleOptions = computed(() => {
  const current = request.value.lyricAngle.trim()
  return current && !angleOptions.includes(current) ? [current, ...angleOptions] : angleOptions
})
const visibleHookOptions = computed(() => {
  const current = request.value.hookType.trim()
  return current && !hookOptions.includes(current) ? [current, ...hookOptions] : hookOptions
})

function togglePlatform(platform: string) {
  if (selectedPlatforms.value.includes(platform)) {
    selectedPlatforms.value = selectedPlatforms.value.filter(item => item !== platform)
  } else {
    selectedPlatforms.value = [...selectedPlatforms.value, platform]
  }
  request.value.targetPlatforms = [...selectedPlatforms.value]
}

function setOption(key: 'hookType' | 'lyricAngle', value: string) {
  request.value[key] = value
}

function scoreTone(score: number): string {
  if (score >= 85) return 'progress-success'
  if (score >= 70) return 'progress-primary'
  if (score >= 55) return 'progress-warning'
  return 'progress-error'
}

function variantScore(variant: HitLabVariant): number {
  return Math.round((variant.douyinScore + variant.qishuiScore + variant.memorabilityScore) / 3)
}

function blindAudioUrl(candidate: HitExperimentVariant): string {
  return candidate.externalGenerations.find(item => item.externalUrl)?.externalUrl || ''
}

async function generate() {
  if (!canGenerate.value) return
  loading.value = true
  error.value = ''
  copied.value = ''
  result.value = null
  activeVariantIndex.value = 0
  request.value.targetPlatforms = [...selectedPlatforms.value]

  try {
    result.value = await window.amusic.invoke('hit-lab:generate', JSON.parse(JSON.stringify(toRaw(request.value))))
    await recordRound(result.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function id(): string {
  return crypto.randomUUID()
}

async function persistExperiment() {
  if (!experiment.value) return
  savedExperiments.value = await window.amusic.invoke('hit-experiments:save', JSON.parse(JSON.stringify(toRaw(experiment.value))))
  experimentMessage.value = '实验数据已保存'
  window.setTimeout(() => { experimentMessage.value = '' }, 1400)
}

async function recordRound(generated: HitLabResult) {
  const now = Date.now()
  const round: HitExperimentRound = {
    id: id(),
    createdAt: now,
    parentVariantId: pendingParentVariantId.value,
    mutationFocus: request.value.mutationFocus || '自由探索',
    summary: generated.summary,
    variants: generated.variants.map(variant => ({
      ...variant,
      id: id(),
      status: 'candidate',
      wins: 0,
      losses: 0,
      eliminationReason: '',
      externalGenerations: [],
      eloRating: 1000,
      lyricEloRating: 1000,
      audioEloRating: 1000
    }))
  }

  if (!experiment.value) {
    experiment.value = {
      id: id(),
      createdAt: now,
      updatedAt: now,
      title: generated.variants[0]?.title || '未命名实验',
      status: 'active',
      request: JSON.parse(JSON.stringify(toRaw(request.value))),
      rounds: [],
      feedback: []
    }
  }
  experiment.value.request = JSON.parse(JSON.stringify(toRaw(request.value)))
  experiment.value.rounds.push(round)
  pendingParentVariantId.value = ''
  blindPair.value = [0, 1]
  blindStage.value = 'lyrics'
  feedbackDimension.value = '像真人写的'
  await persistExperiment()
}

function newExperiment() {
  experiment.value = null
  result.value = null
  pendingParentVariantId.value = ''
  activeVariantIndex.value = 0
  blindPair.value = [0, 1]
}

function loadExperiment(record: HitExperimentRecord) {
  const normalized = JSON.parse(JSON.stringify(record)) as HitExperimentRecord
  for (const round of normalized.rounds) {
    for (const variant of round.variants) {
      variant.externalGenerations ||= []
      variant.eloRating ||= 1000
      variant.lyricEloRating ||= variant.eloRating
      variant.audioEloRating ||= variant.eloRating
      variant.centralImage ||= ''
      variant.emotionalParadox ||= ''
      variant.narrativeMode ||= '历史数据未标注'
      variant.hookSpeechAct ||= ''
      variant.specificDetails ||= []
      variant.perspectiveDistance ||= ''
      variant.repeatPattern ||= ''
      variant.storyProgression ||= ''
      variant.clicheRisks ||= []
      variant.derivativeSimilarityRisks ||= []
      variant.lyricScores ||= emptyLyricScores()
    }
  }
  experiment.value = normalized
  request.value = {
    ...JSON.parse(JSON.stringify(record.request)),
    sourceMode: record.request.sourceMode || 'idea',
    existingLyrics: record.request.existingLyrics || '',
    lyricProtection: record.request.lyricProtection || '原文锁定',
    lyricsAnalysisContext: record.request.lyricsAnalysisContext || '',
    mutationFocus: record.request.mutationFocus || '自由探索',
    creationStage: normalizeCreationStage(record.request.creationStage),
    experienceMode: record.request.experienceMode || 'professional',
    useScenario: record.request.useScenario || '短视频日常记录',
    firstImpression: record.request.firstImpression || '真实克制',
    creativePriority: record.request.creativePriority || '歌词共鸣',
    introPreference: record.request.introPreference || 'AI自动决定'
  }
  selectedStrategyId.value = request.value.experienceMode === 'beginner' && request.value.styleBlend ? 'restored-strategy' : ''
  selectedLyricRouteId.value = record.request.sourceMode === 'lyrics' ? '' : (record.request.lyricRouteId || (record.request.lyricRouteContext ? 'restored-route' : ''))
  lockedStrategyFields.value = [...(record.request.lockedStrategyFields || [])]
  selectedPlatforms.value = [...record.request.targetPlatforms]
  const round = record.rounds.at(-1)
  result.value = round ? { summary: round.summary, variants: round.variants } : null
  blindPair.value = [0, 1]
  blindStage.value = 'lyrics'
  feedbackDimension.value = '像真人写的'
  activeVariantIndex.value = 0
}

async function chooseBlindWinner(winner: HitExperimentVariant) {
  if (!experiment.value || blindCandidates.value.length < 2 || !currentRound.value) return
  const loser = blindCandidates.value.find(item => item.id !== winner.id)
  if (!loser) return
  winner.wins += 1
  winner.status = 'winner'
  loser.losses += 1
  const ratingField = blindStage.value === 'lyrics' ? 'lyricEloRating' : 'audioEloRating'
  const winnerProxy = { ...winner, eloRating: winner[ratingField] || 1000 }
  const loserProxy = { ...loser, eloRating: loser[ratingField] || 1000 }
  ;[winner[ratingField], loser[ratingField]] = updateElo(winnerProxy, loserProxy)
  winner.eloRating = Math.round(((winner.lyricEloRating || 1000) + (winner.audioEloRating || 1000)) / 2)
  loser.eloRating = Math.round(((loser.lyricEloRating || 1000) + (loser.audioEloRating || 1000)) / 2)
  experiment.value.feedback.push({
    id: id(),
    createdAt: Date.now(),
    roundId: currentRound.value.id,
    winnerVariantId: winner.id,
    loserVariantId: loser.id,
    dimension: feedbackDimension.value,
    stage: blindStage.value,
    note: feedbackNote.value.trim(),
    testerName: testerName.value.trim() || '匿名',
    testerSegment: testerSegment.value.trim()
  })
  feedbackNote.value = ''
  const variants = currentRound.value.variants
  const winnerIndex = variants.findIndex(item => item.id === winner.id)
  const used = new Set(blindPair.value)
  const nextIndex = variants.findIndex((item, index) => !used.has(index) && item.status !== 'eliminated')
  blindPair.value = nextIndex >= 0 ? [winnerIndex, nextIndex] : [winnerIndex, loser === variants[winnerIndex] ? blindPair.value[0] : variants.findIndex(item => item.id === loser.id)]
  await persistExperiment()
}

async function eliminateActiveVariant() {
  if (!currentRound.value || !activeVariant.value || !eliminationReason.value.trim()) return
  const variant = currentRound.value.variants.find(item => item.title === activeVariant.value?.title)
  if (!variant) return
  variant.status = 'eliminated'
  variant.eliminationReason = eliminationReason.value.trim()
  eliminationReason.value = ''
  await persistExperiment()
}

function resetExternalDraft() {
  externalDraft.value = {
    platform: '妙响',
    versionLabel: '',
    externalId: '',
    externalUrl: '',
    outputCount: 1,
    firstImpression: '无感',
    strongestPart: '',
    biggestProblem: '',
    hookVerdict: '勉强',
    introVerdict: '一般',
    introNote: '',
    bestTimeRange: '',
    advanceToNextRound: false,
    keep: '',
    change: '',
    note: ''
  }
}

async function saveExternalFeedback() {
  const variant = activeStoredVariant.value
  if (!variant || !externalDraft.value.versionLabel.trim()) return
  variant.externalGenerations.push({
    ...JSON.parse(JSON.stringify(toRaw(externalDraft.value))),
    id: id(),
    createdAt: Date.now()
  })
  resetExternalDraft()
  await persistExperiment()
}

async function submitToPlatform(platform: HitExternalPlatform) {
  if (!activeVariant.value) return
  submitMessage.value = `正在提交到 ${platform}...`
  const response = await window.amusic.invoke('music-platform:submit', platform, activeVariant.value.fullPrompt)
  submitMessage.value = response.message
  if (response.success && activeStoredVariant.value) {
    externalDraft.value.platform = platform
    externalDraft.value.versionLabel = response.externalId || `${platform} 自动任务`
    externalDraft.value.externalId = response.externalId || ''
    externalDraft.value.externalUrl = response.externalUrl || ''
  }
}

async function syncExternalResult(item: HitExternalGeneration) {
  if (!item.externalId) {
    submitMessage.value = '这条记录没有外部任务 ID，无法自动查询'
    return
  }
  const response = await window.amusic.invoke('music-platform:status', item.platform, item.externalId)
  submitMessage.value = response.message
  if (response.externalUrl) {
    item.externalUrl = response.externalUrl
    await persistExperiment()
  }
}

async function refreshIdea() {
  if (request.value.sourceMode === 'lyrics') return
  if (refreshingIdea.value || loading.value) return
  refreshingIdea.value = true
  error.value = ''
  copied.value = ''
  request.value.targetPlatforms = [...selectedPlatforms.value]

  try {
    const response = await window.amusic.invoke('hit-lab:random-idea', JSON.parse(JSON.stringify(toRaw(request.value))))
    request.value.idea = response.idea
    refreshedIdeaCategory.value = response.category
    invalidateLyricRoutes()
    if (request.value.experienceMode === 'professional') {
      if (response.lyricAngle.trim() && !isStrategyFieldLocked('lyricAngle')) request.value.lyricAngle = response.lyricAngle.trim()
      if (response.emotionalCore.trim() && !isStrategyFieldLocked('emotionalCore')) request.value.emotionalCore = response.emotionalCore.trim()
      if (response.hookType.trim() && !isStrategyFieldLocked('hookType')) request.value.hookType = response.hookType.trim()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    refreshingIdea.value = false
  }
}

function isStrategyFieldLocked(field: HitStrategyField): boolean {
  return lockedStrategyFields.value.includes(field)
}

function toggleStrategyFieldLock(field: HitStrategyField) {
  lockedStrategyFields.value = isStrategyFieldLocked(field)
    ? lockedStrategyFields.value.filter(item => item !== field)
    : [...lockedStrategyFields.value, field]
  request.value.lockedStrategyFields = [...lockedStrategyFields.value]
}

function setBeginnerPreference(field: 'useScenario' | 'firstImpression' | 'creativePriority' | 'introPreference', value: string) {
  request.value[field] = value
  strategyCards.value = []
  strategySummary.value = ''
  selectedStrategyId.value = ''
}

function invalidateStrategies() {
  strategyCards.value = []
  strategySummary.value = ''
  selectedStrategyId.value = ''
}

function invalidateLyricRoutes() {
  lyricRouteCards.value = []
  lyricRouteSummary.value = ''
  selectedLyricRouteId.value = ''
  request.value.lyricRouteId = ''
  request.value.lyricRouteContext = ''
  invalidateStrategies()
}

async function generateLyricRoutes() {
  if (!request.value.idea.trim() || lyricRouteLoading.value) return
  lyricRouteLoading.value = true
  error.value = ''
  invalidateLyricRoutes()
  try {
    const response = await window.amusic.invoke('hit-lab:lyric-routes', JSON.parse(JSON.stringify(toRaw(request.value))))
    lyricRouteCards.value = response.cards
    lyricRouteSummary.value = response.summary
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    lyricRouteLoading.value = false
  }
}

function applyLyricRoute(card: HitLyricRouteCard) {
  selectedLyricRouteId.value = card.id
  request.value.lyricRouteId = card.id
  request.value.lyricRouteContext = lyricRouteContext(card)
  request.value.lyricAngle = card.narrativeMode
  request.value.hookType = card.hookSpeechAct
  invalidateStrategies()
}

async function generateStrategies() {
  if (!sourceReady.value || strategyLoading.value) return
  if (request.value.sourceMode === 'idea' && !selectedLyricRouteId.value) {
    error.value = '请先生成并选择一条歌词路线'
    return
  }
  strategyLoading.value = true
  error.value = ''
  selectedStrategyId.value = ''
  try {
    const response = await window.amusic.invoke('hit-lab:strategies', JSON.parse(JSON.stringify(toRaw(request.value))))
    strategyCards.value = response.cards
    strategySummary.value = response.summary
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    strategyLoading.value = false
  }
}

async function analyzeLyrics(): Promise<boolean> {
  if (!request.value.existingLyrics?.trim() || lyricsAnalysisLoading.value) return false
  lyricsAnalysisLoading.value = true
  error.value = ''
  try {
    lyricsAnalysis.value = await window.amusic.invoke('hit-lab:analyze-lyrics', JSON.parse(JSON.stringify(toRaw(request.value))))
    request.value.lyricsAnalysisContext = [
      lyricsAnalysis.value.summary,
      `优势：${lyricsAnalysis.value.strengths.join('；')}`,
      `风险：${lyricsAnalysis.value.risks.join('；')}`,
      `候选Hook：${lyricsAnalysis.value.hookCandidates.map(item => item.line).join('；')}`,
      `情绪曲线：${lyricsAnalysis.value.emotionCurve}`,
      `结构建议：${lyricsAnalysis.value.suggestedStructure}`
    ].join('\n')
    return true
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    return false
  } finally {
    lyricsAnalysisLoading.value = false
  }
}

async function prepareStrategies() {
  if (request.value.sourceMode === 'lyrics' && !lyricsAnalysis.value) {
    const analyzed = await analyzeLyrics()
    if (!analyzed) return
  }
  if (request.value.sourceMode === 'idea' && !selectedLyricRouteId.value) {
    error.value = '请先生成并选择一条歌词路线'
    return
  }
  await generateStrategies()
}

function setSourceMode(mode: 'idea' | 'lyrics') {
  request.value.sourceMode = mode
  lyricRouteCards.value = []
  lyricRouteSummary.value = ''
  selectedLyricRouteId.value = ''
  request.value.lyricRouteId = ''
  request.value.lyricRouteContext = ''
  strategyCards.value = []
  strategySummary.value = ''
  selectedStrategyId.value = ''
  error.value = ''
}

function invalidateLyricsAnalysis() {
  lyricsAnalysis.value = null
  request.value.lyricsAnalysisContext = ''
  invalidateStrategies()
}

function applyStrategy(card: HitStrategyCard) {
  selectedStrategyId.value = card.id
  const routeLockedFields: HitStrategyField[] = selectedLyricRouteId.value ? ['lyricAngle', 'hookType'] : []
  Object.assign(request.value, mergeStrategyFields(request.value, card, [...new Set([...lockedStrategyFields.value, ...routeLockedFields])]))
}

function setExperienceMode(mode: 'beginner' | 'professional') {
  request.value.experienceMode = mode
  if (mode === 'professional') selectedStrategyId.value = ''
}

function lyricSectionTitle(): string {
  if (request.value.creationStage === 'Hook探索') return 'Hook 草案'
  if (request.value.creationStage === '完整化') return '完整歌词'
  return `${activeStageConfig.value.label}歌词`
}

async function copyText(label: string, text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = label
  window.setTimeout(() => {
    if (copied.value === label) copied.value = ''
  }, 1600)
}

function copyVariant(variant: HitLabVariant) {
  const text = [
    `标题：${variant.title}`,
    `定位：${variant.positioning}`,
    `平台：${variant.targetPlatform}`,
    `Hook：${variant.hookLine}`,
    `叙事引擎：${variant.narrativeMode}`,
    `中心意象：${variant.centralImage}`,
    `情绪矛盾：${variant.emotionalParadox}`,
    `Hook言语动作：${variant.hookSpeechAct}`,
    `具体细节：${variant.specificDetails.join('；')}`,
    `人称距离：${variant.perspectiveDistance}`,
    `重复方式：${variant.repeatPattern}`,
    `前奏：${variant.introTimeline || variant.firstThreeSeconds}`,
    `核心 Hook 进入：${variant.hookEntrySeconds || '未标记'} 秒`,
    `目标时长：${variant.targetDurationSeconds || '未标记'} 秒`,
    `结构：${variant.structurePlan || '未标记'}`,
    '',
    '副歌片段：',
    variant.chorusSnippet,
    '',
    '完整歌词：',
    variant.lyrics,
    '',
    'Prompt：',
    variant.fullPrompt,
    '',
    `迭代建议：${variant.iterationAdvice}`
  ].join('\n')
  void copyText(`候选${variant.title}`, text)
}

function continueWithVariant(variant: HitLabVariant) {
  const storedVariant = currentRound.value?.variants.find(item => item.title === variant.title)
  const external = storedVariant?.externalGenerations.filter(item => item.advanceToNextRound).at(-1)
    || storedVariant?.externalGenerations.at(-1)
  const externalFeedback = external
    ? [
        `外部试听：${external.platform} / ${external.versionLabel}`,
        `前奏：${external.introVerdict || '未评'}（${external.introNote || '无补充'}）`,
        `第一耳：${external.firstImpression}；Hook：${external.hookVerdict}`,
        `最强项：${external.strongestPart || '未填写'}；最大问题：${external.biggestProblem || '未填写'}`,
        `最佳片段：${external.bestTimeRange || '未标记'}`,
        `必须保留：${external.keep || '未填写'}`,
        `本轮修改：${external.change || '未填写'}`,
        external.note ? `补充：${external.note}` : ''
      ].filter(Boolean)
    : []
  request.value.idea = [
    `继续打磨《${variant.title}》这个方向。`,
    `定位：${variant.positioning}`,
    `核心 Hook：${variant.hookLine}`,
    `短视频副歌片段：${variant.chorusSnippet}`,
    `传播入口：${variant.spreadPotential}`,
    `目标时长与结构：${variant.targetDurationSeconds || '未标记'} 秒；${variant.structurePlan || '沿用当前阶段结构'}`,
    `下一轮重点：${variant.iterationAdvice}`,
    ...externalFeedback
  ].join('\n')
  if (variant.stylePrompt) request.value.styleBlend = variant.stylePrompt
  selectedLyricRouteId.value = request.value.lyricRouteId || 'continued-route'
  request.value.lyricRouteId ||= 'continued-route'
  request.value.lyricRouteContext = [
    `延续胜出候选《${variant.title}》的歌词 DNA`,
    `叙事引擎：${variant.narrativeMode}`,
    `中心意象：${variant.centralImage}`,
    `情绪矛盾：${variant.emotionalParadox}`,
    `Hook言语动作：${variant.hookSpeechAct}`,
    `具体细节：${variant.specificDetails.join('；')}`,
    `人称距离：${variant.perspectiveDistance}`,
    `重复方式：${variant.repeatPattern}`,
    `叙事推进：${variant.storyProgression}`
  ].join('\n')
  pendingParentVariantId.value = storedVariant?.id || ''
  result.value = null
  activeVariantIndex.value = 0
  copied.value = ''
  preparedVariantTitle.value = variant.title
  window.setTimeout(() => {
    if (preparedVariantTitle.value === variant.title) preparedVariantTitle.value = ''
  }, 2200)
}

watch(activeVariantIndex, resetExternalDraft)

onMounted(async () => {
  savedExperiments.value = await window.amusic.invoke('hit-experiments:list')
})
</script>

<template>
  <div class="p-8 animate-fade-in">
    <div class="flex items-center justify-between mb-6 pb-4 border-b border-base-300/60">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight">爆款实验台</h2>
        <p class="text-sm text-base-content/50 mt-1">用候选、盲选和控制变量迭代寻找真正胜出的 Hook</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-if="savedExperiments.length" class="select select-bordered select-sm max-w-56" @change="loadExperiment(savedExperiments[Number(($event.target as HTMLSelectElement).value)])">
          <option value="" selected disabled>载入历史实验</option>
          <option v-for="(item, index) in savedExperiments" :key="item.id" :value="index">{{ item.title }} · {{ item.rounds.length }} 轮</option>
        </select>
        <button type="button" class="btn btn-outline btn-sm" @click="newExperiment">新实验</button>
        <div class="badge badge-primary badge-outline">Experiment Lab</div>
      </div>
    </div>

    <div class="grid grid-cols-1 2xl:grid-cols-[420px_minmax(0,1fr)] gap-4">
      <section class="card bg-base-100 shadow-sm border border-base-300/60">
        <div class="card-body p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <font-awesome-icon icon="wand-magic-sparkles" class="text-base" />
            </div>
            <div>
              <h3 class="font-semibold">实验输入</h3>
              <p class="text-xs text-base-content/50">一次生成多个可测试方向</p>
            </div>
          </div>

          <div>
            <span class="text-xs font-bold text-base-content/45 uppercase tracking-wider">第一步：创作来源</span>
            <div class="grid grid-cols-2 rounded-xl border border-base-300/60 bg-base-200/40 p-1 mt-1">
              <button type="button" :class="['btn btn-sm', request.sourceMode === 'idea' ? 'btn-primary' : 'btn-ghost']" @click="setSourceMode('idea')">从核心创意开始</button>
              <button type="button" :class="['btn btn-sm', request.sourceMode === 'lyrics' ? 'btn-primary' : 'btn-ghost']" @click="setSourceMode('lyrics')">从已有歌词开始</button>
            </div>
          </div>

          <div>
            <span class="text-xs font-bold text-base-content/45 uppercase tracking-wider">第二步：操作方式</span>
            <div class="grid grid-cols-2 rounded-xl border border-base-300/60 bg-base-200/40 p-1 mt-1">
            <button type="button" :class="['btn btn-sm', request.experienceMode === 'beginner' ? 'btn-primary' : 'btn-ghost']" @click="setExperienceMode('beginner')">小白模式</button>
            <button type="button" :class="['btn btn-sm', request.experienceMode === 'professional' ? 'btn-primary' : 'btn-ghost']" @click="setExperienceMode('professional')">专业模式</button>
            </div>
          </div>

          <label v-if="request.sourceMode === 'idea'" class="form-control">
            <span class="label py-1">
              <span class="label-text font-medium text-sm">核心创意</span>
              <button
                type="button"
                class="btn btn-ghost btn-xs gap-1"
                :disabled="loading || refreshingIdea"
                @click="refreshIdea"
              >
                <span v-if="refreshingIdea" class="loading loading-spinner loading-xs"></span>
                <font-awesome-icon v-else icon="rotate" class="w-3 h-3" />
                {{ refreshingIdea ? '生成创意中' : 'AI 随机生成核心创意' }}
              </button>
            </span>
            <textarea v-model="request.idea" class="textarea textarea-bordered min-h-36 leading-7 text-sm" placeholder="不会写可以直接点击上方 AI 按钮；也可以只用日常语言描述一个场景或感受。" @input="invalidateLyricRoutes" />
            <span v-if="refreshedIdeaCategory" class="text-xs text-primary font-medium mt-1">本次程序抽签题材：{{ refreshedIdeaCategory }}</span>
            <span v-if="preparedVariantTitle" class="text-xs text-success font-medium mt-1">
              已带入《{{ preparedVariantTitle }}》，可以直接生成下一轮候选。
            </span>
          </label>

          <div v-if="request.sourceMode === 'lyrics'" class="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-3">
            <div>
              <h4 class="font-semibold text-sm">已有歌词</h4>
              <p class="text-xs text-base-content/50 mt-1">系统先诊断和提取 Hook，不会在分析阶段擅自改词。</p>
            </div>
            <textarea v-model="request.existingLyrics" class="textarea textarea-bordered min-h-56 leading-7 text-sm w-full" placeholder="粘贴完整歌词或几句副歌，段落标记可使用 [Verse]、[Chorus]。" @input="invalidateLyricsAnalysis" />
            <div>
              <span class="text-xs font-medium">歌词保护等级</span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <button v-for="option in lyricProtectionOptions" :key="option.value" type="button" :class="['rounded-lg border p-2 text-left', request.lyricProtection === option.value ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100']" @click="request.lyricProtection = option.value; invalidateLyricsAnalysis()">
                  <strong class="text-xs">{{ option.value }}</strong><small class="block text-base-content/50 mt-1">{{ option.description }}</small>
                </button>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm w-full" :disabled="!request.existingLyrics?.trim() || lyricsAnalysisLoading" @click="analyzeLyrics">
              <span v-if="lyricsAnalysisLoading" class="loading loading-spinner loading-xs"></span>
              {{ lyricsAnalysisLoading ? '正在诊断歌词...' : '分析歌词并提取 Hook' }}
            </button>
          </div>

          <div v-if="request.sourceMode === 'idea'" class="rounded-xl border border-secondary/25 bg-secondary/5 p-3 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="font-semibold text-sm">第三步：选择歌词路线</h4>
                <p class="text-xs text-base-content/50 mt-1">先决定故事怎么讲，暂不讨论流派、BPM 和编曲。</p>
              </div>
              <button type="button" class="btn btn-secondary btn-xs shrink-0" :disabled="!request.idea.trim() || lyricRouteLoading" @click="generateLyricRoutes">
                <span v-if="lyricRouteLoading" class="loading loading-spinner loading-xs"></span>
                {{ lyricRouteLoading ? '设计中' : lyricRouteCards.length ? '重新生成' : '生成4条路线' }}
              </button>
            </div>
            <p v-if="lyricRouteSummary" class="text-xs text-base-content/55 leading-5">{{ lyricRouteSummary }}</p>
            <div v-if="lyricRouteCards.length" class="space-y-2">
              <button v-for="card in lyricRouteCards" :key="card.id" type="button" :class="['w-full rounded-xl border p-3 text-left transition-colors', selectedLyricRouteId === card.id ? 'border-secondary bg-secondary/10' : 'border-base-300 bg-base-100 hover:border-secondary/50']" @click="applyLyricRoute(card)">
                <div class="flex items-center justify-between gap-2"><strong class="text-sm">{{ card.title }}</strong><span class="badge badge-secondary badge-outline badge-xs">{{ card.narrativeMode }}</span></div>
                <p class="text-xs text-base-content/65 leading-5 mt-1">{{ card.positioning }}</p>
                <div class="grid grid-cols-1 gap-1 mt-2 text-xs">
                  <p><strong>中心意象：</strong>{{ card.centralImage }}</p>
                  <p><strong>情绪矛盾：</strong>{{ card.emotionalParadox }}</p>
                  <p><strong>Hook 动作：</strong>{{ card.hookSpeechAct }} · {{ card.hookBlueprint }}</p>
                  <p class="text-base-content/55"><strong>具体细节：</strong>{{ card.specificDetails.join('；') }}</p>
                </div>
              </button>
            </div>
            <p v-else class="text-xs text-base-content/45">输入核心创意后生成四条纯歌词路线。</p>
          </div>

          <div v-if="request.sourceMode === 'lyrics' && lyricsAnalysis" class="rounded-xl border border-success/25 bg-success/5 p-3 space-y-3">
            <div><strong class="text-sm">歌词诊断</strong><p class="text-xs text-base-content/65 leading-5 mt-1">{{ lyricsAnalysis.summary }}</p></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"><div class="rounded-lg bg-base-100 border border-success/20 p-2"><strong class="text-success">优势</strong><ul class="mt-1 space-y-1"><li v-for="item in lyricsAnalysis.strengths" :key="item">· {{ item }}</li></ul></div><div class="rounded-lg bg-base-100 border border-warning/20 p-2"><strong class="text-warning">风险</strong><ul class="mt-1 space-y-1"><li v-for="item in lyricsAnalysis.risks" :key="item">· {{ item }}</li></ul></div></div>
            <div><span class="text-xs font-medium">候选 Hook</span><div class="space-y-1 mt-1"><div v-for="item in lyricsAnalysis.hookCandidates" :key="item.line" class="rounded-lg bg-base-100 border border-base-300/60 p-2 text-xs"><strong>{{ item.line }}</strong><p class="text-base-content/50 mt-1">{{ item.reason }}</p></div></div></div>
            <details class="collapse collapse-arrow border border-base-300/60 bg-base-100"><summary class="collapse-title min-h-0 py-2 text-xs font-medium">查看 15 / 30 / 90 秒原句片段建议</summary><div class="collapse-content grid grid-cols-1 gap-2 text-xs"><div><strong>15 秒</strong><pre class="whitespace-pre-wrap font-sans mt-1">{{ lyricsAnalysis.excerpt15 }}</pre></div><div><strong>30 秒</strong><pre class="whitespace-pre-wrap font-sans mt-1">{{ lyricsAnalysis.excerpt30 }}</pre></div><div><strong>90 秒</strong><pre class="whitespace-pre-wrap font-sans mt-1">{{ lyricsAnalysis.excerpt90 }}</pre></div></div></details>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <label class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-3">
              <span class="label label-text font-medium text-sm py-1">目标平台</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="platform in platformOptions"
                  :key="platform"
                  type="button"
                  :class="['btn btn-xs', selectedPlatforms.includes(platform) ? 'btn-primary' : 'btn-outline btn-neutral']"
                  @click="togglePlatform(platform)"
                >
                  {{ platform }}
                </button>
              </div>
            </label>

            <label v-if="request.experienceMode === 'professional'" class="form-control">
              <span class="label label-text font-medium text-sm py-1">目标听众</span>
              <input v-model="request.audience" class="input input-bordered input-sm" />
            </label>

            <label v-if="request.experienceMode === 'professional'" class="form-control">
              <span class="label label-text font-medium text-sm py-1">情绪核心</span>
              <input v-model="request.emotionalCore" class="input input-bordered input-sm" />
            </label>

            <label v-if="request.experienceMode === 'professional'" class="form-control">
              <span class="label label-text font-medium text-sm py-1">风格融合</span>
              <input v-model="request.styleBlend" class="input input-bordered input-sm" />
            </label>
          </div>

          <div v-if="request.experienceMode === 'beginner'" class="rounded-xl border border-secondary/25 bg-secondary/5 p-3 space-y-3">
            <div>
              <h4 class="font-semibold text-sm">第四步：选择音乐路线</h4>
              <p class="text-xs text-base-content/50 mt-1">不需要填写流派、BPM 或乐器。</p>
            </div>
            <div>
              <span class="text-xs font-medium">使用场景</span>
              <div class="flex flex-wrap gap-1 mt-1"><button v-for="option in scenarioOptions" :key="option" type="button" :class="['btn btn-xs', request.useScenario === option ? 'btn-secondary' : 'btn-outline']" @click="setBeginnerPreference('useScenario', option)">{{ option }}</button></div>
            </div>
            <div>
              <span class="text-xs font-medium">第一耳希望是什么感觉</span>
              <div class="flex flex-wrap gap-1 mt-1"><button v-for="option in impressionOptions" :key="option" type="button" :class="['btn btn-xs', request.firstImpression === option ? 'btn-secondary' : 'btn-outline']" @click="setBeginnerPreference('firstImpression', option)">{{ option }}</button></div>
            </div>
            <div>
              <span class="text-xs font-medium">最想强化什么</span>
              <div class="flex flex-wrap gap-1 mt-1"><button v-for="option in priorityOptions" :key="option" type="button" :class="['btn btn-xs', request.creativePriority === option ? 'btn-secondary' : 'btn-outline']" @click="setBeginnerPreference('creativePriority', option)">{{ option }}</button></div>
            </div>
            <div>
              <span class="text-xs font-medium">前奏怎么抓住人</span>
              <div class="flex flex-wrap gap-1 mt-1"><button v-for="option in introPreferenceOptions" :key="option" type="button" :class="['btn btn-xs', request.introPreference === option ? 'btn-secondary' : 'btn-outline']" @click="setBeginnerPreference('introPreference', option)">{{ option }}</button></div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm w-full" :disabled="!sourceReady || strategyLoading || lyricsAnalysisLoading || (request.sourceMode === 'idea' && !selectedLyricRouteId)" @click="prepareStrategies">
              <span v-if="strategyLoading" class="loading loading-spinner loading-xs"></span>
              {{ strategyLoading ? '正在设计差异化路线...' : request.sourceMode === 'lyrics' && !lyricsAnalysis ? '分析歌词并生成 4 条音乐路线' : 'AI 生成 4 条音乐路线' }}
            </button>
            <p v-if="request.sourceMode === 'idea' && !selectedLyricRouteId" class="text-xs text-warning">请先在上方选择一条歌词路线。</p>
          </div>

          <div v-if="request.experienceMode === 'beginner' && strategyCards.length" class="space-y-2">
            <p class="text-xs text-base-content/55">{{ strategySummary }}</p>
            <button v-for="card in strategyCards" :key="card.id" type="button" :class="['w-full rounded-xl border p-3 text-left transition-colors', selectedStrategyId === card.id ? 'border-primary bg-primary/10' : 'border-base-300/60 hover:border-primary/50']" @click="applyStrategy(card)">
              <div class="flex items-center justify-between gap-2"><strong class="text-sm">{{ card.title }}</strong><span class="badge badge-sm badge-outline">{{ card.primaryStrength }}</span></div>
              <p class="text-xs text-base-content/65 leading-5 mt-1">{{ card.positioning }}</p>
              <p class="text-xs text-primary/80 mt-1">{{ card.productionPlan }}</p>
              <div class="rounded-lg bg-base-200/60 p-2 mt-2 text-xs leading-5"><strong>前奏：</strong>{{ card.introBlueprint }}<br><span class="text-base-content/55">{{ card.hookEntrySeconds }}s 入 Hook · 标志声音：{{ card.signatureSound }} · 循环：{{ card.loopDesign }}</span></div>
              <div class="flex flex-wrap gap-1 mt-2"><span v-for="item in card.advantages" :key="item" class="badge badge-success badge-outline badge-xs">{{ item }}</span><span v-for="item in card.risks" :key="item" class="badge badge-warning badge-outline badge-xs">风险：{{ item }}</span></div>
            </button>
          </div>

          <div v-if="request.experienceMode === 'beginner' && selectedStrategyId" class="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
            <div class="flex items-center justify-between"><strong class="text-sm">已采用策略</strong><span class="text-xs text-base-content/45">锁定后切换路线也不改变</span></div>
            <div v-for="field in (Object.keys(strategyFieldLabels) as HitStrategyField[])" :key="field" class="flex items-start gap-2 text-xs">
              <button type="button" :class="['btn btn-xs shrink-0', isStrategyFieldLocked(field) ? 'btn-primary' : 'btn-ghost']" @click="toggleStrategyFieldLock(field)">{{ isStrategyFieldLocked(field) ? '已锁' : '自动' }}</button>
              <div><strong>{{ strategyFieldLabels[field] }}：</strong><span class="text-base-content/65">{{ request[field] || '待生成' }}</span></div>
            </div>
          </div>

          <label v-if="request.experienceMode === 'professional'" class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-3">
            <span class="label label-text font-medium text-sm py-1">Hook 类型</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="option in visibleHookOptions"
                :key="option"
                type="button"
                :class="['btn btn-xs', request.hookType === option ? 'btn-secondary' : 'btn-outline btn-neutral']"
                @click="setOption('hookType', option)"
              >
                {{ option }}
              </button>
            </div>
          </label>

          <label v-if="request.experienceMode === 'professional'" class="form-control rounded-box border border-accent/25 bg-accent/5 p-3">
            <span class="label label-text font-medium text-sm py-1">前奏抓耳机制</span>
            <div class="flex flex-wrap gap-1.5"><button v-for="option in introPreferenceOptions" :key="option" type="button" :class="['btn btn-xs', request.introPreference === option ? 'btn-accent' : 'btn-outline']" @click="request.introPreference = option">{{ option }}</button></div>
          </label>

          <label class="form-control rounded-box border border-primary/25 bg-primary/5 p-3">
            <span class="label label-text font-medium text-sm py-1">创作阶段</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <button v-for="stage in HIT_CREATION_STAGES" :key="stage.value" type="button" :class="['btn btn-sm h-auto min-h-10 py-2 text-left justify-start', request.creationStage === stage.value ? 'btn-primary' : 'btn-outline']" @click="request.creationStage = stage.value">
                <strong>{{ stage.label }}</strong>
              </button>
            </div>
            <div class="rounded-lg bg-base-100/70 border border-base-300/50 p-2 mb-3 text-xs"><strong>{{ activeStageConfig.description }}</strong><p class="text-base-content/55 mt-1">{{ activeStageConfig.structure }}</p></div>
            <span class="label label-text font-medium text-sm py-1">本轮控制变量</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="option in mutationOptions"
                :key="option"
                type="button"
                :class="['btn btn-xs', request.mutationFocus === option ? 'btn-primary' : 'btn-outline btn-neutral']"
                @click="request.mutationFocus = option"
              >
                {{ option }}
              </button>
            </div>
            <span class="text-xs text-base-content/50 mt-2">从第二轮开始尽量只改变一个变量，才能知道为什么变好。</span>
          </label>

          <label v-if="request.experienceMode === 'professional'" class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-3">
            <span class="label label-text font-medium text-sm py-1">歌词角度</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="option in visibleAngleOptions"
                :key="option"
                type="button"
                :class="['btn btn-xs', request.lyricAngle === option ? 'btn-secondary' : 'btn-outline btn-neutral']"
                @click="setOption('lyricAngle', option)"
              >
                {{ option }}
              </button>
            </div>
          </label>

          <div class="grid grid-cols-[1fr_112px] gap-3">
            <label class="form-control">
              <span class="label label-text font-medium text-sm py-1">约束与禁区</span>
              <input v-model="request.constraints" class="input input-bordered input-sm" />
            </label>
            <label class="form-control">
              <span class="label label-text font-medium text-sm py-1">候选数</span>
              <input v-model.number="request.versionCount" type="number" min="2" max="8" class="input input-bordered input-sm" />
            </label>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button class="btn btn-primary btn-sm gap-2" type="button" :disabled="!canGenerate" @click="generate">
              <span v-if="loading" class="loading loading-spinner loading-xs"></span>
              <font-awesome-icon v-else icon="wand-magic-sparkles" class="w-3.5 h-3.5" />
              {{ loading ? '实验中...' : '生成候选' }}
            </button>
            <span v-if="request.sourceMode === 'idea' && sourceReady && !selectedLyricRouteId" class="text-xs text-warning">请先生成并选择一条歌词路线</span>
            <span v-if="request.experienceMode === 'beginner' && sourceReady && !selectedStrategyId" class="text-xs text-warning">请先生成并选择一条音乐路线</span>
            <span v-if="experimentMessage" class="text-success text-xs font-medium">{{ experimentMessage }}</span>
            <p v-if="error" class="text-error text-sm font-medium">{{ error }}</p>
          </div>
        </div>
      </section>

      <section class="card bg-base-100 shadow-sm border border-base-300/60 min-h-[720px]">
        <div class="card-body p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <font-awesome-icon icon="sliders" class="text-base" />
            </div>
            <div>
              <h3 class="font-semibold">实验结果</h3>
              <p class="text-xs text-base-content/50">AI 分数仅作未校准参考，真正排序来自你的盲选</p>
            </div>
          </div>

          <div v-if="!result" class="min-h-[560px] flex flex-col items-center justify-center text-center text-base-content/50 gap-2">
            <font-awesome-icon icon="music" class="text-3xl text-primary/50" />
            <strong class="text-base-content">等待一次爆款实验</strong>
            <span class="text-sm">输入创意后，系统会生成多版歌词与 Prompt，并给出平台潜力评分。</span>
          </div>

          <template v-else>
            <div class="rounded-lg bg-base-200/50 border border-base-300/60 p-4 mb-4">
              <p class="text-xs font-bold text-base-content/40 uppercase tracking-wider mb-1">实验策略</p>
              <p class="text-sm leading-6">{{ result.summary }}</p>
            </div>

            <div v-if="blindCandidates.length === 2" class="rounded-xl border border-secondary/30 bg-secondary/5 p-4 mb-4">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p class="text-xs font-bold text-secondary uppercase tracking-wider">两阶段盲选竞技场</p>
                  <p class="text-sm text-base-content/60 mt-1">先只看歌词，再只听外部音频，区分歌词胜出与制作放大。</p>
                </div>
                <div class="join">
                  <button type="button" :class="['btn btn-xs join-item', blindStage === 'lyrics' ? 'btn-secondary' : 'btn-outline']" @click="blindStage = 'lyrics'; feedbackDimension = '像真人写的'">第一轮 · 纯歌词</button>
                  <button type="button" :class="['btn btn-xs join-item', blindStage === 'audio' ? 'btn-secondary' : 'btn-outline']" @click="blindStage = 'audio'; feedbackDimension = '第一耳停留'">第二轮 · 音频</button>
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-1.5 mb-3">
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="dimension in feedbackDimensions" :key="dimension" type="button" :class="['btn btn-xs', feedbackDimension === dimension ? 'btn-secondary' : 'btn-outline']" @click="feedbackDimension = dimension">{{ dimension }}</button>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <input v-model="testerName" class="input input-bordered input-sm" placeholder="测试者姓名或编号" />
                <input v-model="testerSegment" class="input input-bordered input-sm" placeholder="受众分组，如 18–24 岁通勤用户" />
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <button v-for="(candidate, index) in blindCandidates" :key="candidate.id" type="button" class="rounded-xl border border-base-300 bg-base-100 p-4 text-left hover:border-secondary transition-colors disabled:opacity-60" :disabled="blindStage === 'audio' && !blindAudioUrl(candidate)" @click="chooseBlindWinner(candidate)">
                  <div class="flex items-center justify-between mb-3">
                    <span class="badge badge-neutral">候选 {{ index === 0 ? 'A' : 'B' }}</span>
                    <span class="text-xs text-base-content/40">点击选择胜出</span>
                  </div>
                  <template v-if="blindStage === 'lyrics'">
                    <pre class="whitespace-pre-wrap text-sm leading-7 text-base-content/75 font-sans max-h-64 overflow-auto">{{ candidate.lyrics || candidate.chorusSnippet }}</pre>
                  </template>
                  <template v-else>
                    <audio v-if="blindAudioUrl(candidate)" :src="blindAudioUrl(candidate)" controls class="w-full" @click.stop></audio>
                    <p v-else class="text-sm text-base-content/45">尚无可播放音频，请先在候选详情中提交生成并同步外部链接。</p>
                  </template>
                </button>
              </div>
              <input v-model="feedbackNote" class="input input-bordered input-sm w-full mt-3" placeholder="可选：为什么选它？例如更像人话、第二句更想跟唱" />
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4">
              <div class="space-y-2">
                <button
                  v-for="(variant, index) in result.variants"
                  :key="`${variant.title}-${index}`"
                  type="button"
                  :class="[
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    activeVariantIndex === index ? 'border-primary bg-primary/10' : 'border-base-300/60 bg-base-200/30 hover:bg-base-200/60'
                  ]"
                  @click="activeVariantIndex = index"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="font-semibold text-sm truncate">{{ variant.title }}</span>
                    <span class="badge badge-sm badge-outline">词 {{ currentRound?.variants[index]?.lyricEloRating || 1000 }} / 音 {{ currentRound?.variants[index]?.audioEloRating || 1000 }}</span>
                  </div>
                  <p class="text-xs text-base-content/50 line-clamp-2 mb-2">{{ variant.hookLine }}</p>
                  <p class="text-[11px] text-base-content/40">{{ currentRound?.variants[index]?.wins || 0 }}胜 / {{ currentRound?.variants[index]?.losses || 0 }}负 · AI 参考 {{ variantScore(variant) }}</p>
                </button>
              </div>

              <div v-if="activeVariant" class="space-y-4 min-w-0">
                <div class="flex items-start justify-between gap-3 border-b border-base-300/60 pb-4">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                      <h3 class="text-xl font-bold truncate">{{ activeVariant.title }}</h3>
                      <span class="badge badge-outline badge-sm">{{ activeVariant.targetPlatform }}</span>
                    </div>
                    <p class="text-sm text-base-content/60 leading-6">{{ activeVariant.positioning }}</p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button type="button" class="btn btn-outline btn-sm gap-2" @click="continueWithVariant(activeVariant)">
                      <font-awesome-icon icon="rotate" class="w-3.5 h-3.5" />
                      继续迭代
                    </button>
                    <button type="button" class="btn btn-primary btn-sm gap-2" @click="copyVariant(activeVariant)">
                      <font-awesome-icon :icon="copied === `候选${activeVariant.title}` ? 'check' : 'copy'" class="w-3.5 h-3.5" />
                      {{ copied === `候选${activeVariant.title}` ? '已复制' : '复制候选' }}
                    </button>
                  </div>
                </div>

                <div class="rounded-xl border border-warning/30 bg-warning/5 p-3 flex flex-wrap items-end gap-2">
                  <label class="form-control flex-1 min-w-64">
                    <span class="label-text text-xs font-medium mb-1">淘汰原因（形成你的负面审美数据）</span>
                    <input v-model="eliminationReason" class="input input-bordered input-sm" placeholder="例如：副歌像广告歌，情绪太用力" />
                  </label>
                  <button type="button" class="btn btn-warning btn-sm" :disabled="!eliminationReason.trim()" @click="eliminateActiveVariant">淘汰此候选</button>
                </div>

                <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h4 class="font-semibold">外部生成与试听反馈</h4>
                      <p class="text-xs text-base-content/50 mt-1">在妙响等平台试听后回来记录，不需要上传音频。</p>
                    </div>
                    <span class="badge badge-outline">{{ activeStoredVariant?.externalGenerations.length || 0 }} 条记录</span>
                  </div>

                  <div v-if="activeStoredVariant?.externalGenerations.length" class="space-y-2">
                    <div v-for="item in activeStoredVariant.externalGenerations" :key="item.id" class="rounded-lg border border-base-300/60 bg-base-100 p-3">
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="badge badge-primary badge-sm">{{ item.platform }}</span>
                        <strong class="text-sm">{{ item.versionLabel }}</strong>
                        <span class="text-xs text-base-content/45">前奏 {{ item.introVerdict || '未评' }} · {{ item.firstImpression }} · Hook {{ item.hookVerdict }}</span>
                        <span v-if="item.advanceToNextRound" class="badge badge-success badge-outline badge-sm">进入下一轮</span>
                        <button v-if="item.externalId" type="button" class="btn btn-ghost btn-xs ml-auto" @click="syncExternalResult(item)">同步结果</button>
                      </div>
                      <p class="text-xs leading-5 text-base-content/65">强项：{{ item.strongestPart || '—' }}；问题：{{ item.biggestProblem || '—' }}；最佳片段：{{ item.bestTimeRange || '—' }}</p>
                      <p v-if="item.introNote" class="text-xs leading-5 text-base-content/55">前奏反馈：{{ item.introNote }}</p>
                      <p v-if="item.keep || item.change" class="text-xs leading-5 mt-1"><span class="text-success">保留 {{ item.keep || '—' }}</span> · <span class="text-warning">修改 {{ item.change || '—' }}</span></p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <label class="form-control">
                      <span class="label-text text-xs mb-1">生成平台</span>
                      <select v-model="externalDraft.platform" class="select select-bordered select-sm">
                        <option v-for="platform in externalPlatforms" :key="platform">{{ platform }}</option>
                      </select>
                    </label>
                    <label class="form-control md:col-span-2">
                      <span class="label-text text-xs mb-1">版本名称 *</span>
                      <input v-model="externalDraft.versionLabel" class="input input-bordered input-sm" placeholder="例如：妙响 A1 / 第三次生成" />
                    </label>
                    <label class="form-control">
                      <span class="label-text text-xs mb-1">本次生成数量</span>
                      <input v-model.number="externalDraft.outputCount" type="number" min="1" max="20" class="input input-bordered input-sm" />
                    </label>
                    <label class="form-control md:col-span-3">
                      <span class="label-text text-xs mb-1">平台链接或作品 ID（可选）</span>
                      <input v-model="externalDraft.externalUrl" class="input input-bordered input-sm" placeholder="用于以后找回对应作品" />
                    </label>
                    <label class="form-control">
                      <span class="label-text text-xs mb-1">最佳时间段</span>
                      <input v-model="externalDraft.bestTimeRange" class="input input-bordered input-sm" placeholder="00:24–00:39" />
                    </label>
                  </div>

                  <div class="space-y-3">
                    <div>
                      <span class="text-xs font-medium mr-2">前奏是否抓人</span>
                      <button v-for="option in introVerdicts" :key="option" type="button" :class="['btn btn-xs mr-1', externalDraft.introVerdict === option ? 'btn-accent' : 'btn-outline']" @click="externalDraft.introVerdict = option">{{ option }}</button>
                    </div>
                    <div>
                      <span class="text-xs font-medium mr-2">第一耳</span>
                      <button v-for="option in firstImpressions" :key="option" type="button" :class="['btn btn-xs mr-1', externalDraft.firstImpression === option ? 'btn-primary' : 'btn-outline']" @click="externalDraft.firstImpression = option">{{ option }}</button>
                    </div>
                    <div>
                      <span class="text-xs font-medium mr-2">Hook</span>
                      <button v-for="option in hookVerdicts" :key="option" type="button" :class="['btn btn-xs mr-1', externalDraft.hookVerdict === option ? 'btn-secondary' : 'btn-outline']" @click="externalDraft.hookVerdict = option">{{ option }}</button>
                    </div>
                    <div>
                      <span class="text-xs font-medium mr-2">最强项</span>
                      <button v-for="option in strongestPartOptions" :key="option" type="button" :class="['btn btn-xs mr-1 mb-1', externalDraft.strongestPart === option ? 'btn-success' : 'btn-outline']" @click="externalDraft.strongestPart = option">{{ option }}</button>
                    </div>
                    <div>
                      <span class="text-xs font-medium mr-2">最大问题</span>
                      <button v-for="option in biggestProblemOptions" :key="option" type="button" :class="['btn btn-xs mr-1 mb-1', externalDraft.biggestProblem === option ? 'btn-warning' : 'btn-outline']" @click="externalDraft.biggestProblem = option">{{ option }}</button>
                    </div>
                  </div>

                  <input v-model="externalDraft.introNote" class="input input-bordered input-sm w-full" placeholder="前奏专项反馈：第几秒想跳过？哪一个声音让你停下来？" />

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label class="form-control">
                      <span class="label-text text-xs mb-1">下一轮必须保留什么</span>
                      <input v-model="externalDraft.keep" class="input input-bordered input-sm" placeholder="例如：低声主歌、核心句原样保留" />
                    </label>
                    <label class="form-control">
                      <span class="label-text text-xs mb-1">下一轮只改什么</span>
                      <input v-model="externalDraft.change" class="input input-bordered input-sm" placeholder="例如：缩短前奏、第二句旋律上行" />
                    </label>
                  </div>
                  <textarea v-model="externalDraft.note" class="textarea textarea-bordered min-h-20 w-full text-sm" placeholder="其他试听感受（可选）" />

                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <label class="label cursor-pointer justify-start gap-2 py-0">
                      <input v-model="externalDraft.advanceToNextRound" type="checkbox" class="checkbox checkbox-success checkbox-sm" />
                      <span class="label-text text-sm">值得进入下一轮</span>
                    </label>
                    <button type="button" class="btn btn-primary btn-sm" :disabled="!externalDraft.versionLabel.trim()" @click="saveExternalFeedback">保存试听反馈</button>
                  </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <p class="lg:col-span-3 text-xs text-base-content/45">以下为 AI 未校准参考，不参与盲选排序</p>
                  <div class="rounded-lg border border-base-300/60 bg-base-200/30 p-3">
                    <div class="flex items-center justify-between mb-2 text-sm">
                      <span class="font-medium">抖音</span>
                      <strong>{{ activeVariant.douyinScore }}</strong>
                    </div>
                    <progress :class="['progress h-2', scoreTone(activeVariant.douyinScore)]" :value="activeVariant.douyinScore" max="100"></progress>
                  </div>
                  <div class="rounded-lg border border-base-300/60 bg-base-200/30 p-3">
                    <div class="flex items-center justify-between mb-2 text-sm">
                      <span class="font-medium">汽水</span>
                      <strong>{{ activeVariant.qishuiScore }}</strong>
                    </div>
                    <progress :class="['progress h-2', scoreTone(activeVariant.qishuiScore)]" :value="activeVariant.qishuiScore" max="100"></progress>
                  </div>
                  <div class="rounded-lg border border-base-300/60 bg-base-200/30 p-3">
                    <div class="flex items-center justify-between mb-2 text-sm">
                      <span class="font-medium">记忆点</span>
                      <strong>{{ activeVariant.memorabilityScore }}</strong>
                    </div>
                    <progress :class="['progress h-2', scoreTone(activeVariant.memorabilityScore)]" :value="activeVariant.memorabilityScore" max="100"></progress>
                  </div>
                </div>

                <div class="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div><p class="text-xs font-bold text-primary uppercase tracking-wider">结构化歌词 DNA</p><h4 class="font-semibold mt-1">{{ activeVariant.narrativeMode }} · {{ activeVariant.hookSpeechAct }}</h4></div>
                    <span class="badge badge-primary badge-outline">{{ activeVariant.perspectiveDistance }}</span>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div class="rounded-lg border border-base-300/60 bg-base-100 p-2"><strong>中心意象：</strong>{{ activeVariant.centralImage }}</div>
                    <div class="rounded-lg border border-base-300/60 bg-base-100 p-2"><strong>情绪矛盾：</strong>{{ activeVariant.emotionalParadox }}</div>
                    <div class="rounded-lg border border-base-300/60 bg-base-100 p-2"><strong>重复方式：</strong>{{ activeVariant.repeatPattern }}</div>
                    <div class="rounded-lg border border-base-300/60 bg-base-100 p-2"><strong>叙事推进：</strong>{{ activeVariant.storyProgression }}</div>
                  </div>
                  <div class="flex flex-wrap gap-1"><span v-for="detail in activeVariant.specificDetails" :key="detail" class="badge badge-outline badge-sm">细节：{{ detail }}</span></div>
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div v-for="(label, key) in lyricScoreLabels" :key="key" class="rounded-lg border border-base-300/60 bg-base-100 p-2">
                      <div class="flex justify-between gap-2 text-xs"><span>{{ label }}</span><strong>{{ activeVariant.lyricScores[key] }}</strong></div>
                      <progress :class="['progress h-1.5 mt-1', scoreTone(activeVariant.lyricScores[key])]" :value="activeVariant.lyricScores[key]" max="100"></progress>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs"><div><strong class="text-warning">陈词风险</strong><p class="text-base-content/55 mt-1">{{ activeVariant.clicheRisks.join('；') || '无明显风险' }}</p></div><div><strong class="text-warning">相似风险</strong><p class="text-base-content/55 mt-1">{{ activeVariant.derivativeSimilarityRisks.join('；') || '无明显风险' }}</p></div></div>
                </div>

                <div class="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2"><div><p class="text-xs font-bold text-accent uppercase tracking-wider">前奏抓耳实验</p><h4 class="font-semibold mt-1">{{ activeVariant.introHook || activeVariant.firstThreeSeconds }}</h4></div><span class="badge badge-accent badge-outline">{{ activeVariant.hookEntrySeconds || '—' }}s 入核心 Hook</span></div>
                  <p class="text-sm leading-6 text-base-content/70">{{ activeVariant.introTimeline || activeVariant.firstThreeSeconds }}</p>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs"><div class="rounded-lg bg-base-100 border border-base-300/60 p-2"><strong>一秒识别声音：</strong>{{ activeVariant.signatureSound || '待外部生成验证' }}</div><div class="rounded-lg bg-base-100 border border-base-300/60 p-2"><strong>首尾循环：</strong>{{ activeVariant.loopTransition || '待设计' }}</div></div>
                  <div v-if="activeVariant.introRisks?.length" class="flex flex-wrap gap-1"><span v-for="risk in activeVariant.introRisks" :key="risk" class="badge badge-warning badge-outline badge-sm">{{ risk }}</span></div>
                </div>

                <div class="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-2"><h4 class="font-semibold">短单曲结构</h4><span class="badge badge-secondary badge-outline">目标 {{ activeVariant.targetDurationSeconds || activeStageConfig.durationLabel }}{{ activeVariant.targetDurationSeconds ? 's' : '' }}</span></div>
                  <p class="text-sm leading-6 mt-2">{{ activeVariant.structurePlan || activeStageConfig.structure }}</p>
                  <p class="text-xs text-base-content/55 mt-2"><strong>完整性检查：</strong>{{ activeVariant.completenessTest || '等待生成结果说明' }}</p>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                    <p class="text-xs font-bold text-base-content/40 uppercase tracking-wider mb-2">核心 Hook</p>
                    <p class="font-semibold mb-2">{{ activeVariant.hookLine }}</p>
                    <p class="text-sm leading-6 text-base-content/70">{{ activeVariant.firstThreeSeconds }}</p>
                  </div>
                  <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                    <p class="text-xs font-bold text-base-content/40 uppercase tracking-wider mb-2">传播入口</p>
                    <p class="text-sm leading-6 text-base-content/70">{{ activeVariant.spreadPotential }}</p>
                  </div>
                </div>

                <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold">短视频副歌片段</h4>
                    <button type="button" class="btn btn-ghost btn-xs gap-1" @click="copyText('副歌片段', activeVariant.chorusSnippet)">
                      <font-awesome-icon :icon="copied === '副歌片段' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === '副歌片段' ? '已复制' : '复制' }}
                    </button>
                  </div>
                  <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono">{{ activeVariant.chorusSnippet }}</pre>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                    <h4 class="font-semibold mb-2">适用视频场景</h4>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="item in activeVariant.shortVideoUseCases" :key="item" class="badge badge-outline badge-sm">{{ item }}</span>
                    </div>
                  </div>
                  <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                    <h4 class="font-semibold mb-2">风险点</h4>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="item in activeVariant.riskNotes" :key="item" class="badge badge-warning badge-outline badge-sm">{{ item }}</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold">{{ lyricSectionTitle() }}</h4>
                    <button type="button" class="btn btn-ghost btn-xs gap-1" @click="copyText('完整歌词', activeVariant.lyrics)">
                      <font-awesome-icon :icon="copied === '完整歌词' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === '完整歌词' ? '已复制' : '复制' }}
                    </button>
                  </div>
                  <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono max-h-[360px] overflow-auto scrollbar-thin">{{ activeVariant.lyrics }}</pre>
                </div>

                <div v-if="request.sourceMode === 'lyrics'" class="rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <div class="flex items-center justify-between mb-3"><h4 class="font-semibold">原文 / 当前版本对照</h4><span class="badge badge-primary badge-outline badge-sm">{{ request.lyricProtection }}</span></div>
                  <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div class="rounded-lg border border-base-300/60 bg-base-100 p-3"><p class="text-xs font-bold text-base-content/40 mb-2">用户原文</p><pre class="whitespace-pre-wrap break-words text-xs leading-6 font-mono max-h-72 overflow-auto">{{ request.existingLyrics }}</pre></div>
                    <div class="rounded-lg border border-base-300/60 bg-base-100 p-3"><p class="text-xs font-bold text-base-content/40 mb-2">本候选使用版本</p><pre class="whitespace-pre-wrap break-words text-xs leading-6 font-mono max-h-72 overflow-auto">{{ activeVariant.lyrics }}</pre></div>
                  </div>
                </div>

                <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold">歌曲 Prompt</h4>
                    <div class="flex flex-wrap gap-1">
                      <button v-for="platform in externalPlatforms.slice(0, 3)" :key="platform" type="button" class="btn btn-outline btn-xs" @click="submitToPlatform(platform)">提交 {{ platform }}</button>
                      <button type="button" class="btn btn-primary btn-xs gap-1" @click="copyText('歌曲Prompt', activeVariant.fullPrompt)">
                        <font-awesome-icon :icon="copied === '歌曲Prompt' ? 'check' : 'copy'" class="w-3 h-3" />
                        {{ copied === '歌曲Prompt' ? '已复制' : '复制' }}
                      </button>
                    </div>
                  </div>
                  <p v-if="submitMessage" class="text-xs text-info mb-2">{{ submitMessage }}</p>
                  <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono max-h-[360px] overflow-auto scrollbar-thin">{{ activeVariant.fullPrompt }}</pre>
                </div>

                <div class="rounded-xl border border-info/30 bg-info/10 p-4">
                  <p class="text-xs font-bold text-info uppercase tracking-wider mb-2">下一轮迭代</p>
                  <p class="text-sm leading-6">{{ activeVariant.iterationAdvice }}</p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
