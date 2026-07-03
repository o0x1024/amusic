<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import type { HitLabRequest, HitLabResult, HitLabVariant } from '../../../shared/types'

const platformOptions = ['抖音', '汽水音乐', '小红书', 'B站']
const hookOptions = ['副歌短句抓耳', '开头一句杀', '情绪反差', '土味但高级', '旋律洗脑', '合唱跟唱', '说唱记忆点', '生活口头禅', '反复自嘲']
const angleOptions = ['普通人自嘲', '都市孤独', '打工人独白', '朋友视角', '家庭日常', '夏日心动', '成长释怀', '反差爽感', '赛博生活', '抽象实验叙事']

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
  constraints: '避免直接模仿具体歌手；不要复制已有歌曲；歌词要自然，不要网文腔。'
})

const result = ref<HitLabResult | null>(null)
const loading = ref(false)
const refreshingIdea = ref(false)
const error = ref('')
const copied = ref('')
const preparedVariantTitle = ref('')
const activeVariantIndex = ref(0)

const activeVariant = computed(() => result.value?.variants[activeVariantIndex.value] ?? null)
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
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
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
  request.value.idea = [
    `继续打磨《${variant.title}》这个方向。`,
    `定位：${variant.positioning}`,
    `核心 Hook：${variant.hookLine}`,
    `短视频副歌片段：${variant.chorusSnippet}`,
    `传播入口：${variant.spreadPotential}`,
    `下一轮重点：${variant.iterationAdvice}`
  ].join('\n')
  if (variant.stylePrompt) request.value.styleBlend = variant.stylePrompt
  result.value = null
  activeVariantIndex.value = 0
  copied.value = ''
  preparedVariantTitle.value = variant.title
  window.setTimeout(() => {
    if (preparedVariantTitle.value === variant.title) preparedVariantTitle.value = ''
  }, 2200)
}
</script>

<template>
  <div class="p-8 animate-fade-in">
    <div class="flex items-center justify-between mb-6 pb-4 border-b border-base-300/60">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight">爆款实验台</h2>
        <p class="text-sm text-base-content/50 mt-1">围绕同一创意生成多版歌词与歌曲 Prompt，并评估抖音 / 汽水传播潜力</p>
      </div>
      <div class="badge badge-primary badge-outline">Prompt Lab</div>
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
              <p class="text-xs text-base-content/50">比较候选版本，复制歌词与 Prompt 进入生成平台</p>
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
                    <span class="badge badge-sm badge-outline">{{ variantScore(variant) }}</span>
                  </div>
                  <p class="text-xs text-base-content/50 line-clamp-2 mb-2">{{ variant.hookLine }}</p>
                  <progress class="progress progress-primary h-1.5" :value="variantScore(variant)" max="100"></progress>
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

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
                    <h4 class="font-semibold">完整歌词</h4>
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
                    <button type="button" class="btn btn-primary btn-xs gap-1" @click="copyText('歌曲Prompt', activeVariant.fullPrompt)">
                      <font-awesome-icon :icon="copied === '歌曲Prompt' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === '歌曲Prompt' ? '已复制' : '复制' }}
                    </button>
                  </div>
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
