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
  thinking_enabled: number
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
  musicPlatforms: MusicPlatformConfig[]
}

export interface MusicPlatformConfig {
  platform: HitExternalPlatform
  enabled: boolean
  mode: 'manual' | 'webhook'
  endpoint: string
  statusEndpoint: string
  apiKey: string
}

export interface SongRequest {
  idea: string
  generationMode: string
  iterationInstruction: string
  hotLyricRule: string
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
  sunoPrompt: string
  udioPrompt: string
  miaoxiangPrompt: string
  lyricOnly: string
  negativePrompt: string
  qualityChecks: string[]
  revisionSuggestions: string[]
  variants: SongVariant[]
}

export interface SongVariant {
  title: string
  direction: string
  hookLine: string
  stylePrompt: string
  revisionFocus: string
}

export interface LyricsDraftRequest {
  idea: string
  iterationInstruction: string
}

export interface LyricsDraftResult {
  title: string
  concept: string
  lyrics: string
  hookLine: string
  lyricAnalysis: string
  emotionCurve: string
  shortVideoMoment: string
  revisionSuggestions: string[]
}

export interface PromptFromLyricsRequest {
  title: string
  concept: string
  lyrics: string
  constraints: string
}

export interface HitLabRequest {
  idea: string
  targetPlatforms: string[]
  audience: string
  emotionalCore: string
  styleBlend: string
  hookType: string
  lyricAngle: string
  versionCount: number
  constraints: string
  mutationFocus?: HitMutationFocus
  creationStage?: HitCreationStage
  experienceMode?: 'beginner' | 'professional'
  useScenario?: string
  firstImpression?: string
  creativePriority?: string
  lockedStrategyFields?: HitStrategyField[]
  introPreference?: string
}

export type HitStrategyField = 'audience' | 'emotionalCore' | 'styleBlend' | 'hookType' | 'lyricAngle'

export interface HitStrategyCard {
  id: string
  title: string
  positioning: string
  primaryStrength: string
  audience: string
  emotionalCore: string
  styleBlend: string
  hookType: string
  lyricAngle: string
  productionPlan: string
  introBlueprint: string
  hookEntrySeconds: number
  signatureSound: string
  loopDesign: string
  advantages: string[]
  risks: string[]
}

export interface HitStrategyResult {
  summary: string
  cards: HitStrategyCard[]
}

export type HitMutationFocus = '自由探索' | '只改核心句' | '只改歌词视角' | '只改节奏与速度' | '只改人声人格' | '只改前3秒' | '只改歌曲结构'
export type HitCreationStage = 'Hook探索' | '15秒循环' | '30秒短单曲' | '60秒微型歌曲' | '完整化'

export type HitFeedbackDimension = '前奏停留' | '第一耳停留' | '歌词共鸣' | '记忆度' | '视频适配' | '复听意愿' | '声音期待'
export type HitExternalPlatform = '妙响' | 'Suno' | 'Udio' | '其他'
export type HitFirstImpression = '想继续听' | '无感' | '想跳过'
export type HitHookVerdict = '成立' | '勉强' | '不成立'
export type HitIntroVerdict = '抓住我了' | '一般' | '想跳过'

export interface HitExternalGeneration {
  id: string
  createdAt: number
  platform: HitExternalPlatform
  versionLabel: string
  externalId: string
  externalUrl: string
  outputCount: number
  firstImpression: HitFirstImpression
  strongestPart: string
  biggestProblem: string
  hookVerdict: HitHookVerdict
  introVerdict: HitIntroVerdict
  introNote: string
  bestTimeRange: string
  advanceToNextRound: boolean
  keep: string
  change: string
  note: string
}

export interface HitPairwiseFeedback {
  id: string
  createdAt: number
  roundId: string
  winnerVariantId: string
  loserVariantId: string
  dimension: HitFeedbackDimension
  note: string
  testerName?: string
  testerSegment?: string
}

export interface HitExperimentVariant extends HitLabVariant {
  id: string
  status: 'candidate' | 'winner' | 'eliminated'
  wins: number
  losses: number
  eliminationReason: string
  externalGenerations: HitExternalGeneration[]
  eloRating: number
}

export interface HitExperimentRound {
  id: string
  createdAt: number
  parentVariantId: string
  mutationFocus: HitMutationFocus
  summary: string
  variants: HitExperimentVariant[]
}

export interface HitExperimentRecord {
  id: string
  createdAt: number
  updatedAt: number
  title: string
  status: 'active' | 'completed'
  request: HitLabRequest
  rounds: HitExperimentRound[]
  feedback: HitPairwiseFeedback[]
}

export interface TasteReference {
  id: string
  createdAt: number
  title: string
  preference: '喜欢' | '不喜欢'
  aspects: string[]
  note: string
}

export interface TrendSample {
  id: string
  createdAt: number
  platform: string
  title: string
  observedAt: number
  expiresAt: number
  hookEntrySeconds: number
  hookLengthSeconds: number
  bpm: number
  vocalPersona: string
  useCases: string[]
  familiarElement: string
  surpriseElement: string
  note: string
}

export interface PublishMetricRecord {
  id: string
  createdAt: number
  experimentId: string
  variantId: string
  variantTitle: string
  platform: string
  account: string
  publishedAt: number
  views: number
  completionRate: number
  likes: number
  favorites: number
  comments: number
  shares: number
  musicUses: number
}

export interface HitIntelligenceState {
  tasteReferences: TasteReference[]
  trendSamples: TrendSample[]
  publishMetrics: PublishMetricRecord[]
  recentIdeas: HitIdeaHistoryEntry[]
}

export interface HitIdeaHistoryEntry {
  id: string
  createdAt: number
  categoryId: string
  category: string
  idea: string
}

export interface HitLearnedProfile {
  positiveSignals: Array<{ label: string; weight: number }>
  negativeSignals: Array<{ label: string; weight: number }>
  validTrends: TrendSample[]
  strategyText: string
}

export interface HitLabIdeaResult {
  idea: string
  category: string
  lyricAngle: string
  emotionalCore: string
  hookType: string
}

export interface HitLabVariant {
  title: string
  positioning: string
  targetPlatform: string
  hookLine: string
  firstThreeSeconds: string
  introHook: string
  introTimeline: string
  hookEntrySeconds: number
  signatureSound: string
  loopTransition: string
  introRisks: string[]
  targetDurationSeconds: number
  structurePlan: string
  completenessTest: string
  chorusSnippet: string
  lyrics: string
  stylePrompt: string
  fullPrompt: string
  douyinScore: number
  qishuiScore: number
  memorabilityScore: number
  spreadPotential: string
  shortVideoUseCases: string[]
  riskNotes: string[]
  iterationAdvice: string
}

export interface HitLabResult {
  summary: string
  variants: HitLabVariant[]
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
