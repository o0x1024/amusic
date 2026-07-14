<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import type { AppSettings, HitExperimentRecord, HitIntelligenceState, PublishMetricRecord, TasteReference, TrendSample } from '../../../shared/types'
import { accountBaseline, buildLearnedProfile, engagementScore } from '../../../shared/hit-intelligence'

const state = ref<HitIntelligenceState>({ tasteReferences: [], trendSamples: [], publishMetrics: [], recentIdeas: [] })
const experiments = ref<HitExperimentRecord[]>([])
const settings = ref<AppSettings | null>(null)
const message = ref('')
const aspectOptions = ['歌词共鸣', '旋律抓耳', '节奏卡点', '人声辨识度', '氛围感', '编曲层次', '口语感', '反差感']

const tasteDraft = ref({ title: '', preference: '喜欢' as TasteReference['preference'], aspects: [] as string[], note: '' })
const trendDraft = ref({ platform: '抖音', title: '', hookEntrySeconds: 3, hookLengthSeconds: 15, bpm: 100, vocalPersona: '', useCases: '', familiarElement: '', surpriseElement: '', narrativeMode: '', centralImage: '', averageLineLength: 8, repetitionRate: 30, perspectiveDistance: '', hookSpeechAct: '', specificDetailCount: 2, note: '', validDays: 30 })
const publishDraft = ref({ experimentId: '', variantId: '', platform: '抖音', account: '', views: 0, completionRate: 0, likes: 0, favorites: 0, comments: 0, shares: 0, musicUses: 0 })

const profile = computed(() => buildLearnedProfile(state.value, experiments.value))
const allVariants = computed(() => experiments.value.flatMap(experiment => experiment.rounds.flatMap(round => round.variants.map(variant => ({ experiment, variant })))))
const selectedVariant = computed(() => allVariants.value.find(item => item.variant.id === publishDraft.value.variantId))
const audienceSegments = computed(() => {
  const segments = new Map<string, { tests: number; winners: Map<string, number> }>()
  for (const experiment of experiments.value) {
    const variants = new Map(experiment.rounds.flatMap(round => round.variants.map(variant => [variant.id, variant.title])))
    for (const feedback of experiment.feedback) {
      const key = feedback.testerSegment || '未分组'
      const current = segments.get(key) || { tests: 0, winners: new Map<string, number>() }
      current.tests += 1
      const title = variants.get(feedback.winnerVariantId) || '未知候选'
      current.winners.set(title, (current.winners.get(title) || 0) + 1)
      segments.set(key, current)
    }
  }
  return [...segments.entries()].map(([segment, data]) => ({
    segment,
    tests: data.tests,
    favorite: [...data.winners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  }))
})

async function save() {
  state.value = await window.amusic.invoke('hit-intelligence:save', JSON.parse(JSON.stringify(toRaw(state.value))))
  message.value = '创作情报已保存'
  window.setTimeout(() => { message.value = '' }, 1500)
}

function toggleAspect(aspect: string) {
  tasteDraft.value.aspects = tasteDraft.value.aspects.includes(aspect)
    ? tasteDraft.value.aspects.filter(item => item !== aspect)
    : [...tasteDraft.value.aspects, aspect]
}

async function addTasteReference() {
  if (!tasteDraft.value.title.trim()) return
  state.value.tasteReferences.unshift({ id: crypto.randomUUID(), createdAt: Date.now(), ...tasteDraft.value })
  tasteDraft.value = { title: '', preference: '喜欢', aspects: [], note: '' }
  await save()
}

async function removeTasteReference(id: string) {
  state.value.tasteReferences = state.value.tasteReferences.filter(item => item.id !== id)
  await save()
}

async function addTrend() {
  if (!trendDraft.value.title.trim()) return
  const now = Date.now()
  const trend: TrendSample = {
    id: crypto.randomUUID(),
    createdAt: now,
    platform: trendDraft.value.platform,
    title: trendDraft.value.title.trim(),
    observedAt: now,
    expiresAt: now + trendDraft.value.validDays * 86400000,
    hookEntrySeconds: trendDraft.value.hookEntrySeconds,
    hookLengthSeconds: trendDraft.value.hookLengthSeconds,
    bpm: trendDraft.value.bpm,
    vocalPersona: trendDraft.value.vocalPersona,
    useCases: trendDraft.value.useCases.split(/[、,，]/).map(item => item.trim()).filter(Boolean),
    familiarElement: trendDraft.value.familiarElement,
    surpriseElement: trendDraft.value.surpriseElement,
    narrativeMode: trendDraft.value.narrativeMode,
    centralImage: trendDraft.value.centralImage,
    averageLineLength: trendDraft.value.averageLineLength,
    repetitionRate: trendDraft.value.repetitionRate,
    perspectiveDistance: trendDraft.value.perspectiveDistance,
    hookSpeechAct: trendDraft.value.hookSpeechAct,
    specificDetailCount: trendDraft.value.specificDetailCount,
    note: trendDraft.value.note
  }
  state.value.trendSamples.unshift(trend)
  trendDraft.value.title = ''
  await save()
}

async function removeTrend(id: string) {
  state.value.trendSamples = state.value.trendSamples.filter(item => item.id !== id)
  await save()
}

async function addPublishMetric() {
  const selected = selectedVariant.value
  if (!selected || !publishDraft.value.account.trim()) return
  const metric: PublishMetricRecord = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    experimentId: selected.experiment.id,
    variantId: selected.variant.id,
    variantTitle: selected.variant.title,
    platform: publishDraft.value.platform,
    account: publishDraft.value.account.trim(),
    publishedAt: Date.now(),
    views: publishDraft.value.views,
    completionRate: publishDraft.value.completionRate,
    likes: publishDraft.value.likes,
    favorites: publishDraft.value.favorites,
    comments: publishDraft.value.comments,
    shares: publishDraft.value.shares,
    musicUses: publishDraft.value.musicUses
  }
  state.value.publishMetrics.unshift(metric)
  await save()
}

function relativeBaseline(record: PublishMetricRecord): string {
  const peers = state.value.publishMetrics.filter(item => item.id !== record.id)
  const baseline = accountBaseline(peers, record.account, record.platform)
  if (!baseline) return '暂无基线'
  const difference = engagementScore(record) - baseline
  return `${difference >= 0 ? '+' : ''}${difference.toFixed(1)} vs 账号中位数`
}

async function savePlatformSettings() {
  if (!settings.value) return
  settings.value = await window.amusic.invoke('settings:save', JSON.parse(JSON.stringify(toRaw(settings.value))))
  message.value = '平台适配设置已保存'
}

onMounted(async () => {
  ;[state.value, experiments.value, settings.value] = await Promise.all([
    window.amusic.invoke('hit-intelligence:get'),
    window.amusic.invoke('hit-experiments:list'),
    window.amusic.invoke('settings:get')
  ])
})
</script>

<template>
  <div class="p-8 animate-fade-in space-y-5">
    <div class="flex items-center justify-between border-b border-base-300/60 pb-4">
      <div>
        <h2 class="text-2xl font-extrabold">创作情报</h2>
        <p class="text-sm text-base-content/50 mt-1">把个人审美、有效趋势和发布结果转成下一轮生成策略</p>
      </div>
      <span v-if="message" class="text-success text-sm">{{ message }}</span>
    </div>

    <section class="card border border-primary/30 bg-primary/5">
      <div class="card-body p-5">
        <h3 class="font-bold">系统当前学到的审美画像</h3>
        <p v-if="!profile.strategyText" class="text-sm text-base-content/50">数据还不够。先添加喜欢/不喜欢的参考，并完成几轮盲选。</p>
        <pre v-else class="whitespace-pre-wrap font-sans text-sm leading-7">{{ profile.strategyText }}</pre>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div class="rounded-lg bg-base-100 border border-success/20 p-3"><strong class="text-sm text-success">正向信号</strong><div class="flex flex-wrap gap-1 mt-2"><span v-for="item in profile.positiveSignals" :key="item.label" class="badge badge-success badge-outline badge-sm">{{ item.label }} · {{ item.weight }}</span></div></div>
          <div class="rounded-lg bg-base-100 border border-warning/20 p-3"><strong class="text-sm text-warning">负向信号</strong><div class="flex flex-wrap gap-1 mt-2"><span v-for="item in profile.negativeSignals" :key="item.label" class="badge badge-warning badge-outline badge-sm">{{ item.label }} · {{ item.weight }}</span></div></div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 2xl:grid-cols-2 gap-5">
      <section class="card border border-base-300/60 bg-base-100">
        <div class="card-body p-5 space-y-4">
          <div><h3 class="font-bold">审美初始化</h3><p class="text-xs text-base-content/50">“不喜欢什么”与“喜欢什么”同样重要。</p></div>
          <div class="grid grid-cols-[120px_1fr] gap-2">
            <select v-model="tasteDraft.preference" class="select select-bordered select-sm"><option>喜欢</option><option>不喜欢</option></select>
            <input v-model="tasteDraft.title" class="input input-bordered input-sm" placeholder="歌曲、版本或声音参考" />
          </div>
          <div class="flex flex-wrap gap-1"><button v-for="aspect in aspectOptions" :key="aspect" type="button" :class="['btn btn-xs', tasteDraft.aspects.includes(aspect) ? 'btn-primary' : 'btn-outline']" @click="toggleAspect(aspect)">{{ aspect }}</button></div>
          <input v-model="tasteDraft.note" class="input input-bordered input-sm" placeholder="具体喜欢/讨厌哪里，避免只写高级、好听" />
          <button class="btn btn-primary btn-sm self-end" :disabled="!tasteDraft.title.trim()" @click="addTasteReference">添加参考</button>
          <div class="space-y-2 max-h-60 overflow-auto">
            <div v-for="item in state.tasteReferences" :key="item.id" class="flex items-start justify-between rounded-lg border border-base-300/60 p-3">
              <div><strong class="text-sm">{{ item.preference }} · {{ item.title }}</strong><p class="text-xs text-base-content/55 mt-1">{{ item.aspects.join('、') }} {{ item.note }}</p></div>
              <button class="btn btn-ghost btn-xs" @click="removeTasteReference(item.id)">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="card border border-base-300/60 bg-base-100">
        <div class="card-body p-5 space-y-3">
          <div><h3 class="font-bold">趋势结构库</h3><p class="text-xs text-base-content/50">记录结构信号而非照抄歌曲；过期后自动停止影响生成。</p></div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <input v-model="trendDraft.platform" class="input input-bordered input-sm" placeholder="平台" />
            <input v-model="trendDraft.title" class="input input-bordered input-sm lg:col-span-2" placeholder="样本名称" />
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.validDays" type="number" class="w-full" />天有效</label>
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.hookEntrySeconds" type="number" class="w-full" />秒入 Hook</label>
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.hookLengthSeconds" type="number" class="w-full" />秒 Hook</label>
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.bpm" type="number" class="w-full" />BPM</label>
            <input v-model="trendDraft.vocalPersona" class="input input-bordered input-sm" placeholder="人声人格" />
            <input v-model="trendDraft.familiarElement" class="input input-bordered input-sm lg:col-span-2" placeholder="保持熟悉的部分" />
            <input v-model="trendDraft.surpriseElement" class="input input-bordered input-sm lg:col-span-2" placeholder="提供意外的部分" />
            <input v-model="trendDraft.narrativeMode" class="input input-bordered input-sm" placeholder="叙事模式，如场景切片" />
            <input v-model="trendDraft.centralImage" class="input input-bordered input-sm" placeholder="中心意象" />
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.averageLineLength" type="number" class="w-full" />平均字/行</label>
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.repetitionRate" type="number" min="0" max="100" class="w-full" />重复%</label>
            <input v-model="trendDraft.perspectiveDistance" class="input input-bordered input-sm" placeholder="人称距离，如弱人称绑定" />
            <input v-model="trendDraft.hookSpeechAct" class="input input-bordered input-sm" placeholder="Hook 动作，如祝福/拒绝" />
            <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="trendDraft.specificDetailCount" type="number" min="0" class="w-full" />具体细节数</label>
            <input v-model="trendDraft.useCases" class="input input-bordered input-sm lg:col-span-2" placeholder="视频场景，用逗号分隔" />
            <input v-model="trendDraft.note" class="input input-bordered input-sm lg:col-span-2" placeholder="备注" />
          </div>
          <button class="btn btn-primary btn-sm self-end" :disabled="!trendDraft.title.trim()" @click="addTrend">保存趋势样本</button>
          <div class="space-y-2 max-h-60 overflow-auto">
            <div v-for="item in state.trendSamples" :key="item.id" class="flex justify-between rounded-lg border border-base-300/60 p-3">
              <div><strong class="text-sm">{{ item.platform }} · {{ item.title }}</strong><p class="text-xs mt-1 text-base-content/55">{{ item.hookEntrySeconds }}s 入 Hook · {{ item.bpm }} BPM · {{ item.expiresAt > Date.now() ? '有效' : '已过期' }}</p><p v-if="item.narrativeMode || item.hookSpeechAct" class="text-xs mt-1 text-primary/70">{{ item.narrativeMode || '未标叙事' }} · {{ item.perspectiveDistance || '未标人称' }} · {{ item.hookSpeechAct || '未标 Hook 动作' }} · {{ item.specificDetailCount || 0 }} 个细节</p></div>
              <button class="btn btn-ghost btn-xs" @click="removeTrend(item.id)">删除</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="card border border-base-300/60 bg-base-100">
      <div class="card-body p-5 space-y-4">
        <div><h3 class="font-bold">发布结果与账号基线</h3><p class="text-xs text-base-content/50">综合分只用于同账号、同平台的历史比较，不冒充全网爆款分。</p></div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <select v-model="publishDraft.variantId" class="select select-bordered select-sm col-span-2"><option value="" disabled>选择实验候选</option><option v-for="item in allVariants" :key="item.variant.id" :value="item.variant.id">{{ item.experiment.title }} / {{ item.variant.title }}</option></select>
          <input v-model="publishDraft.platform" class="input input-bordered input-sm" placeholder="平台" />
          <input v-model="publishDraft.account" class="input input-bordered input-sm" placeholder="账号名称" />
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.views" type="number" class="w-full" />播放</label>
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.completionRate" type="number" min="0" max="100" class="w-full" />完播%</label>
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.likes" type="number" class="w-full" />赞</label>
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.favorites" type="number" class="w-full" />收藏</label>
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.comments" type="number" class="w-full" />评论</label>
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.shares" type="number" class="w-full" />分享</label>
          <label class="input input-bordered input-sm flex items-center gap-1"><input v-model.number="publishDraft.musicUses" type="number" class="w-full" />使用量</label>
        </div>
        <button class="btn btn-primary btn-sm self-end" :disabled="!publishDraft.variantId || !publishDraft.account.trim()" @click="addPublishMetric">记录发布数据</button>
        <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>候选</th><th>平台/账号</th><th>播放</th><th>完播</th><th>综合表现</th><th>相对基线</th></tr></thead><tbody><tr v-for="item in state.publishMetrics" :key="item.id"><td>{{ item.variantTitle }}</td><td>{{ item.platform }} / {{ item.account }}</td><td>{{ item.views }}</td><td>{{ item.completionRate }}%</td><td>{{ engagementScore(item) }}</td><td>{{ relativeBaseline(item) }}</td></tr></tbody></table></div>
      </div>
    </section>

    <section class="card border border-base-300/60 bg-base-100">
      <div class="card-body p-5">
        <div><h3 class="font-bold">目标听众测试汇总</h3><p class="text-xs text-base-content/50">数据来自爆款实验台盲选时填写的测试者与受众分组。</p></div>
        <div v-if="!audienceSegments.length" class="text-sm text-base-content/45 mt-3">尚无多人测试数据。</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3"><div v-for="item in audienceSegments" :key="item.segment" class="rounded-lg border border-base-300/60 p-3"><strong>{{ item.segment }}</strong><p class="text-xs text-base-content/55 mt-1">{{ item.tests }} 次选择 · 当前最常胜出：{{ item.favorite }}</p></div></div>
      </div>
    </section>

    <section v-if="settings" class="card border border-base-300/60 bg-base-100">
      <div class="card-body p-5 space-y-3">
        <div><h3 class="font-bold">音乐平台适配层</h3><p class="text-xs text-base-content/50">默认手动模式。只有平台提供合法接口时才启用 Webhook，不模拟或逆向私有 API。</p></div>
        <div v-for="platform in settings.musicPlatforms" :key="platform.platform" class="grid grid-cols-1 md:grid-cols-[100px_100px_1fr_1fr] gap-2 items-center border-b border-base-300/50 pb-3">
          <strong>{{ platform.platform }}</strong>
          <select v-model="platform.mode" class="select select-bordered select-sm"><option value="manual">手动</option><option value="webhook">Webhook</option></select>
          <input v-model="platform.endpoint" class="input input-bordered input-sm" :disabled="platform.mode === 'manual'" placeholder="合法 API/Webhook 地址" />
          <input v-model="platform.apiKey" type="password" class="input input-bordered input-sm" :disabled="platform.mode === 'manual'" placeholder="API Key" />
          <input v-model="platform.statusEndpoint" class="input input-bordered input-sm md:col-start-3 md:col-span-2" :disabled="platform.mode === 'manual'" placeholder="状态查询地址，可用 {id} 作为任务 ID 占位符" />
          <label class="label cursor-pointer justify-start gap-2 md:col-start-2"><input v-model="platform.enabled" type="checkbox" class="toggle toggle-sm" /><span class="label-text">启用</span></label>
        </div>
        <button class="btn btn-primary btn-sm self-end" @click="savePlatformSettings">保存平台设置</button>
      </div>
    </section>
  </div>
</template>
