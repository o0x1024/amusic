<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import type { HitCreationStage, HitExperimentRecord, HitExperimentRound, HitExperimentVariant, HitExternalGeneration, HitExternalPlatform, HitFeedbackDimension, HitFirstImpression, HitHookVerdict, HitLabRequest, HitLabResult, HitLabVariant, HitMutationFocus } from '../../../shared/types'
import { updateElo } from '../../../shared/hit-intelligence'

const platformOptions = ['抖音', '汽水音乐', '小红书', 'B站']
const hookOptions = ['副歌短句抓耳', '开头一句杀', '情绪反差', '土味但高级', '旋律洗脑', '合唱跟唱', '说唱记忆点', '生活口头禅', '反复自嘲']
const angleOptions = ['普通人自嘲', '都市孤独', '打工人独白', '朋友视角', '家庭日常', '夏日心动', '成长释怀', '反差爽感', '赛博生活', '抽象实验叙事']
const mutationOptions: HitMutationFocus[] = ['自由探索', '只改核心句', '只改歌词视角', '只改节奏与速度', '只改人声人格', '只改前3秒', '只改歌曲结构']
const feedbackDimensions: HitFeedbackDimension[] = ['第一耳停留', '歌词共鸣', '记忆度', '视频适配', '复听意愿', '声音期待']
const creationStages: HitCreationStage[] = ['Hook探索', '完整化']
const externalPlatforms: HitExternalPlatform[] = ['妙响', 'Suno', 'Udio', '其他']
const firstImpressions: HitFirstImpression[] = ['想继续听', '无感', '想跳过']
const hookVerdicts: HitHookVerdict[] = ['成立', '勉强', '不成立']
const strongestPartOptions = ['歌词', '旋律', '节奏', '人声', '氛围']
const biggestProblemOptions = ['太普通', '不抓耳', 'AI味', '人声不对', '编曲平', '情绪过度', '没有明显问题']

const selectedPlatforms = ref(['抖音', '汽水音乐'])
const request = ref<HitLabRequest>({
  idea: '一个人下班后坐在便利店门口吃关东煮，白天装得很能扛，副歌突然把“我只是有点累”唱成能反复跟唱的口头禅。',
  targetPlatforms: selectedPlatforms.value,
  audience: '18-30 岁，喜欢中文流行、R&B、轻电子和短视频热歌的人',
  emotionalCore: '疲惫、自嘲、松弛、共鸣',
  styleBlend: '华语流行 + R&B + 轻电子鼓组，副歌旋律强，主歌口语叙事',
  hookType: '生活口头禅',
  lyricAngle: '打工人独白',
  versionCount: 4,
  constraints: '避免直接模仿具体歌手；不要复制已有歌曲；歌词要自然，不要网文腔。',
  mutationFocus: '自由探索',
  creationStage: 'Hook探索'
})

const result = ref<HitLabResult | null>(null)
const loading = ref(false)
const refreshingIdea = ref(false)
const error = ref('')
const copied = ref('')
const preparedVariantTitle = ref('')
const activeVariantIndex = ref(0)
const experiment = ref<HitExperimentRecord | null>(null)
const savedExperiments = ref<HitExperimentRecord[]>([])
const pendingParentVariantId = ref('')
const blindPair = ref<[number, number]>([0, 1])
const feedbackDimension = ref<HitFeedbackDimension>('第一耳停留')
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
const canGenerate = computed(() => request.value.idea.trim().length > 0 && !loading.value && !refreshingIdea.value)
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
      eloRating: 1000
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
    }
  }
  experiment.value = normalized
  request.value = {
    ...JSON.parse(JSON.stringify(record.request)),
    mutationFocus: record.request.mutationFocus || '自由探索',
    creationStage: record.request.creationStage || 'Hook探索'
  }
  selectedPlatforms.value = [...record.request.targetPlatforms]
  const round = record.rounds.at(-1)
  result.value = round ? { summary: round.summary, variants: round.variants } : null
  blindPair.value = [0, 1]
  activeVariantIndex.value = 0
}

async function chooseBlindWinner(winner: HitExperimentVariant) {
  if (!experiment.value || blindCandidates.value.length < 2 || !currentRound.value) return
  const loser = blindCandidates.value.find(item => item.id !== winner.id)
  if (!loser) return
  winner.wins += 1
  winner.status = 'winner'
  loser.losses += 1
  ;[winner.eloRating, loser.eloRating] = updateElo(winner, loser)
  experiment.value.feedback.push({
    id: id(),
    createdAt: Date.now(),
    roundId: currentRound.value.id,
    winnerVariantId: winner.id,
    loserVariantId: loser.id,
    dimension: feedbackDimension.value,
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
  if (refreshingIdea.value || loading.value) return
  refreshingIdea.value = true
  error.value = ''
  copied.value = ''
  request.value.targetPlatforms = [...selectedPlatforms.value]

  try {
    const response = await window.amusic.invoke('hit-lab:random-idea', JSON.parse(JSON.stringify(toRaw(request.value))))
    request.value.idea = response.idea
    if (response.lyricAngle.trim()) request.value.lyricAngle = response.lyricAngle.trim()
    if (response.emotionalCore.trim()) request.value.emotionalCore = response.emotionalCore.trim()
    if (response.hookType.trim()) request.value.hookType = response.hookType.trim()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    refreshingIdea.value = false
  }
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
    `下一轮重点：${variant.iterationAdvice}`,
    ...externalFeedback
  ].join('\n')
  if (variant.stylePrompt) request.value.styleBlend = variant.stylePrompt
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

          <label class="form-control">
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
                {{ refreshingIdea ? '刷新中' : 'AI 随机刷新' }}
              </button>
            </span>
            <textarea v-model="request.idea" class="textarea textarea-bordered min-h-44 leading-7 text-sm" />
            <span v-if="preparedVariantTitle" class="text-xs text-success font-medium mt-1">
              已带入《{{ preparedVariantTitle }}》，可以直接生成下一轮候选。
            </span>
          </label>

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

            <label class="form-control">
              <span class="label label-text font-medium text-sm py-1">目标听众</span>
              <input v-model="request.audience" class="input input-bordered input-sm" />
            </label>

            <label class="form-control">
              <span class="label label-text font-medium text-sm py-1">情绪核心</span>
              <input v-model="request.emotionalCore" class="input input-bordered input-sm" />
            </label>

            <label class="form-control">
              <span class="label label-text font-medium text-sm py-1">风格融合</span>
              <input v-model="request.styleBlend" class="input input-bordered input-sm" />
            </label>
          </div>

          <label class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-3">
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

          <label class="form-control rounded-box border border-primary/25 bg-primary/5 p-3">
            <span class="label label-text font-medium text-sm py-1">创作阶段</span>
            <div class="grid grid-cols-2 gap-2 mb-3">
              <button v-for="stage in creationStages" :key="stage" type="button" :class="['btn btn-sm', request.creationStage === stage ? 'btn-primary' : 'btn-outline']" @click="request.creationStage = stage">
                {{ stage === 'Hook探索' ? '先找 8–20 秒 Hook' : '把胜出 Hook 完整化' }}
              </button>
            </div>
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

          <label class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-3">
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
                  <p class="text-xs font-bold text-secondary uppercase tracking-wider">盲选竞技场</p>
                  <p class="text-sm text-base-content/60 mt-1">不看标题和 AI 分数，只按一个维度强制二选一。</p>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="dimension in feedbackDimensions" :key="dimension" type="button" :class="['btn btn-xs', feedbackDimension === dimension ? 'btn-secondary' : 'btn-outline']" @click="feedbackDimension = dimension">{{ dimension }}</button>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <input v-model="testerName" class="input input-bordered input-sm" placeholder="测试者姓名或编号" />
                <input v-model="testerSegment" class="input input-bordered input-sm" placeholder="受众分组，如 18–24 岁通勤用户" />
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <button v-for="(candidate, index) in blindCandidates" :key="candidate.id" type="button" class="rounded-xl border border-base-300 bg-base-100 p-4 text-left hover:border-secondary transition-colors" @click="chooseBlindWinner(candidate)">
                  <div class="flex items-center justify-between mb-3">
                    <span class="badge badge-neutral">候选 {{ index === 0 ? 'A' : 'B' }}</span>
                    <span class="text-xs text-base-content/40">点击选择胜出</span>
                  </div>
                  <p class="font-semibold text-base leading-7">{{ candidate.hookLine }}</p>
                  <pre class="whitespace-pre-wrap text-sm leading-6 mt-2 text-base-content/65 font-sans">{{ candidate.chorusSnippet }}</pre>
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
                    <span class="badge badge-sm badge-outline">Elo {{ currentRound?.variants[index]?.eloRating || 1000 }}</span>
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
                        <span class="text-xs text-base-content/45">{{ item.firstImpression }} · Hook {{ item.hookVerdict }}</span>
                        <span v-if="item.advanceToNextRound" class="badge badge-success badge-outline badge-sm">进入下一轮</span>
                        <button v-if="item.externalId" type="button" class="btn btn-ghost btn-xs ml-auto" @click="syncExternalResult(item)">同步结果</button>
                      </div>
                      <p class="text-xs leading-5 text-base-content/65">强项：{{ item.strongestPart || '—' }}；问题：{{ item.biggestProblem || '—' }}；最佳片段：{{ item.bestTimeRange || '—' }}</p>
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

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                    <p class="text-xs font-bold text-base-content/40 uppercase tracking-wider mb-2">3 秒 Hook</p>
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
                    <h4 class="font-semibold">{{ request.creationStage === 'Hook探索' ? 'Hook 草案' : '完整歌词' }}</h4>
                    <button type="button" class="btn btn-ghost btn-xs gap-1" @click="copyText('完整歌词', activeVariant.lyrics)">
                      <font-awesome-icon :icon="copied === '完整歌词' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === '完整歌词' ? '已复制' : '复制' }}
                    </button>
                  </div>
                  <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono max-h-[360px] overflow-auto scrollbar-thin">{{ activeVariant.lyrics }}</pre>
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
