<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import type { FavoriteRecord, HistoryRecord, SongRequest, SongResult } from '../../../shared/types'

const props = defineProps<{ pendingFavorite: FavoriteRecord | null }>()
const emit = defineEmits<{ 'open-settings': [] }>()

type ParamKey = 'language' | 'mood' | 'atmosphere' | 'vocal' | 'vocalArrangement' | 'tempo' | 'groove' | 'key' | 'energyCurve' | 'arrangement' | 'structure' | 'platform' | 'lyricDensity' | 'rhymeScheme' | 'useCase' | 'songLength'

const styleGroups = [
  {
    title: '核心流派',
    options: ['华语流行', '欧美流行', 'R&B', 'Soul', 'Funk', '民谣', '摇滚', '电子流行', '说唱', '爵士流行', 'City Pop', 'K-pop', '独立流行', 'Blues', 'Country', 'Reggae', 'Disco', 'Gospel', 'New Wave', 'Post-Rock', 'Ambient', 'Trip-Hop']
  },
  {
    title: '电子 / 舞曲',
    options: ['House', 'Deep House', 'Tech House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 'Electro', 'Breakbeat', 'Garage', 'Future Bass', 'Synthwave', 'Vaporwave', 'Lo-fi', 'IDM', 'Hyperpop', 'Phonk', 'Jersey Club', 'Amapiano', 'Ambient Electronic']
  },
  {
    title: '摇滚 / 朋克 / 金属',
    options: ['经典摇滚', '硬摇滚', '朋克', '后朋克', '金属', '核金属', '新金属', 'Emo', 'Math Rock', 'Shoegaze', 'Dream Pop', 'Noise Pop', '垃圾摇滚']
  },
  {
    title: '爵士 / 灵魂 / 蓝调',
    options: ['Smooth Jazz', 'Bebop', 'Cool Jazz', 'Free Jazz', 'Modal Jazz', 'Big Band', 'Vocal Jazz', 'Jazz Fusion', 'Neo-Soul', '蓝调', '节奏蓝调', '灵歌']
  },
  {
    title: '世界 / 民族',
    options: ['拉丁流行', 'Bossa Nova', 'Salsa', 'Reggaeton', 'Flamenco', '凯尔特音乐', '印度古典', '中东音乐', 'Afrobeat', '非洲节奏', '日本演歌', '中国风', '蒙古呼麦', '爱尔兰民谣', '波斯音乐', '安第斯音乐', '加勒比风情', '探戈']
  },
  {
    title: '古典 / 影视',
    options: ['古典跨界', '巴洛克', '浪漫主义', '印象派', '现代古典', '交响乐', '室内乐', '独奏钢琴', '管弦电影感', '史诗配乐', '音乐剧', '歌剧跨界']
  },
  {
    title: '融合元素',
    options: ['抒情摇滚', 'UK Garage', 'Trap', 'Tropicália', 'Indie Folk', 'Alt-Country', 'Folktronica', 'Chillwave', 'Synth Pop', 'Indie Electronic', 'Dream Pop', 'Jazz Hip-Hop', 'Classical Crossover']
  },
  {
    title: '年代 / 地域',
    options: ['2000年代华语情歌', '90年代港台', '80年代合成器流行', '70年代灵魂乐', '60年代摇滚', '现代欧美电台', '日系动画片尾', '韩式流行制作', '复古迪斯科', '当代独立乐队', 'Y2K千禧风', '2010s流行电子', '当代拉丁热潮']
  },
  {
    title: '制作质感',
    options: ['钢琴主导', '吉他主导', '合成器铺底', '温暖模拟质感', '大空间混响', '干净电台混音', '低保真颗粒', '强鼓组律动', '弦乐编排', '木吉他原声', '电子鼓机', '真实乐器录制', '极简留白', '厚重低频', '人声采样', '环境音效']
  }
]

const selectedStyleTags = ref(['华语流行'])
const rhymeOptions: Array<'需要押韵' | '不强制押韵'> = ['需要押韵', '不强制押韵']
const parameterGroups: Array<{ key: ParamKey; title: string; fallback: string; options: string[] }> = [
  {
    key: 'language',
    title: '语言',
    fallback: '中文',
    options: ['中文', '英文', '日文', '韩文', '粤语', '中英混合', '无歌词 / 哼唱']
  },
  {
    key: 'mood',
    title: '情绪状态',
    fallback: '孤独、克制',
    options: ['孤独', '克制', '伤感', '释怀', '治愈', '热烈', '浪漫', '愤怒', '梦幻', '压抑', '慵懒', '温暖', '冷漠', '迷茫', '坚定', '脆弱', '妩媚', '忧郁']
  },
  {
    key: 'atmosphere',
    title: '氛围感',
    fallback: '夜晚感',
    options: ['夜晚感', '公路感', '雨天', '夏日', '都市', '旷野', '室内', '海边', '怀旧', '未来感', '雾霾', '晴朗', '深海', '沙漠', '星空', '霓虹']
  },
  {
    key: 'vocal',
    title: '人声特质',
    fallback: '男声',
    options: [
      '女声', '男声', '中性声线', '亲密低语', '略带气声', '沙哑质感', '空灵声线', '副歌有力量', '说唱段落',
      '假声男声', '磁性低音', '清亮高音', '烟嗓女声', '民谣白嗓', '戏腔', '花腔', '纯假声', '真假音转换', '耳语式唱法', '爵士慵懒', '灵魂乐转音',
      '周杰伦式含糊咬字', '林俊杰式清亮高音', '邓紫棋式力量爆发', '陈奕迅式低沉诉说', '王菲式空灵飘渺', '张学友式醇厚深情', '周深式空灵假声', '李健式温暖质朴', '毛不易式平淡叙事', '华晨宇式戏剧化高音', '袁娅维式灵魂转音', '单依纯式R&B气声', '张惠妹式爆发力女声', '那英式通透大气', '孙燕姿式独特颗粒感', '林忆莲式细腻气声', '陶喆式R&B转音', '方大同式灵魂律动',
      'Adele式深情厚重', 'The Weeknd式假声R&B', 'Billie Eilish式气声耳语', 'Ed Sheeran式温暖叙事', 'Taylor Swift式清爽流行', 'Beyoncé式力量转音', 'Frank Ocean式慵懒R&B', 'Sam Smith式深情假声', 'Bruno Mars式放克灵魂', 'Sia式戏剧化爆发', 'John Legend式温暖钢琴男声', 'Hozier式空灵低吟', 'Dua Lipa式复古律动', 'Freddie Mercury式摇滚歌剧', 'Michael Jackson式律动感', 'Whitney Houston式宏大高音', 'Amy Winehouse式复古爵士', 'Norah Jones式慵懒低吟'
    ]
  },
  {
    key: 'vocalArrangement',
    title: '演唱形式',
    fallback: '独唱',
    options: ['独唱', '男女对唱', '多人合唱', '主唱+和声', '纯人声', '呼应式对唱', '领唱+应答', '双主唱交替']
  },
  {
    key: 'tempo',
    title: '速度',
    fallback: '中慢板 72-88 BPM',
    options: ['极慢 40-60 BPM', '慢板 60-72 BPM', '中慢板 72-88 BPM', '中速 88-112 BPM', '快歌 112-128 BPM', '极快 140+ BPM']
  },
  {
    key: 'groove',
    title: '律动感',
    fallback: '四四拍',
    options: ['四四拍', '半拍律动', '切分律动', '三连音律动', '强鼓点', '弱鼓点', '拖延感', '前推感', '律动跳跃', '直板推进', 'Swing摇摆', 'Bounce弹跳']
  },
  {
    key: 'key',
    title: '调性',
    fallback: '自由调性',
    options: ['大调', '小调', 'C大调', 'G大调', 'D大调', 'A大调', 'E大调', 'F大调', 'D小调', 'A小调', 'E小调', 'B小调', '自由调性']
  },
  {
    key: 'energyCurve',
    title: '能量曲线',
    fallback: '渐强爆发',
    options: ['渐强爆发', '全程高能', '起伏交替', '低吟全程', '前强后弱', '突然爆发', '平稳推进', '先抑后扬', '阶梯递进', '脉冲式起伏']
  },
  {
    key: 'arrangement',
    title: '编曲元素',
    fallback: '',
    options: ['前奏哼唱', '间奏吉他Solo', '间奏钢琴Solo', '间奏合成器Solo', '电子Drop', '拍手段', '纯鼓点段', '环境音过渡', '管乐段', '弦乐间奏', '即兴Scat', '贝斯Solo', '口哨段', '和声铺底', '木吉他前奏', '合成器Pad铺底', '弦乐前奏', '雨声采样']
  },
  {
    key: 'structure',
    title: '歌曲结构',
    fallback: 'Intro, Verse, Pre-Chorus, Chorus, Verse, Chorus, Bridge, Final Chorus',
    options: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Bridge', 'Breakdown', 'Rap Verse', 'Final Chorus', 'Outro', 'Interlude', 'Drop', 'Build-up']
  },
  {
    key: 'platform',
    title: '目标平台',
    fallback: '妙响',
    options: ['妙响', 'Suno', 'Udio', 'Stable Audio', '通用音乐 AI', '纯歌词模式']
  },
  {
    key: 'lyricDensity',
    title: '歌词密度',
    fallback: '中等密度',
    options: ['极简短句', '中等密度', '叙事感更强', '副歌短句抓耳', '押韵更密', '少比喻更直白', '更诗意', '更口语', '高密度叙事', '留白呼吸感']
  },
  {
    key: 'rhymeScheme',
    title: '押韵模式',
    fallback: '自由韵',
    options: ['AABB', 'ABAB', 'ABCB', '自由韵', '交叉押韵', '连续押韵', '段内换韵', '首句入韵', '偶句押韵']
  },
  {
    key: 'useCase',
    title: '使用场景',
    fallback: '完整歌曲',
    options: ['完整歌曲', '短视频BGM', '影视配乐', '现场演出', '广告音乐', '游戏音乐', '背景音乐', '舞台表演']
  },
  {
    key: 'songLength',
    title: '歌曲长度',
    fallback: '3分钟+',
    options: ['30秒短视频', '1分钟短曲', '2分钟标准', '3分钟+', '4分钟+完整版', '自由长度']
  }
]

const selectedParams = ref<Record<ParamKey, string[]>>({
  language: ['中文'],
  mood: ['孤独', '克制'],
  atmosphere: ['夜晚感'],
  vocal: ['男声'],
  vocalArrangement: ['独唱'],
  tempo: ['中慢板 72-88 BPM'],
  groove: ['四四拍'],
  key: ['自由调性'],
  energyCurve: ['渐强爆发'],
  arrangement: [],
  structure: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Final Chorus'],
  platform: ['妙响'],
  lyricDensity: ['中等密度'],
  rhymeScheme: ['自由韵'],
  useCase: ['完整歌曲'],
  songLength: ['3分钟+']
})
const rhymeChoice = ref<'需要押韵' | '不强制押韵'>('需要押韵')

const request = ref<SongRequest>({
  idea: '深夜分手后一个人开车回家，城市霓虹从车窗上划过去，情绪克制但副歌有爆发。',
  referenceLyrics: '',
  language: selectedParams.value.language.join(' / '),
  style: selectedStyleTags.value.join(' / '),
  mood: selectedParams.value.mood.join(' / '),
  atmosphere: selectedParams.value.atmosphere.join(' / '),
  vocal: selectedParams.value.vocal.join(' / '),
  vocalArrangement: selectedParams.value.vocalArrangement.join(' / '),
  tempo: selectedParams.value.tempo.join(' / '),
  groove: selectedParams.value.groove.join(' / '),
  key: selectedParams.value.key.join(' / '),
  energyCurve: selectedParams.value.energyCurve.join(' / '),
  arrangement: selectedParams.value.arrangement.join(' / '),
  structure: selectedParams.value.structure.join(' / '),
  platform: selectedParams.value.platform.join(' / '),
  lyricDensity: selectedParams.value.lyricDensity.join(' / '),
  rhymeScheme: selectedParams.value.rhymeScheme.join(' / '),
  useCase: selectedParams.value.useCase.join(' / '),
  songLength: selectedParams.value.songLength.join(' / '),
  rhyme: true
})

const result = ref<SongResult | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref('')
const paramsCollapsed = ref(false)
const justFavorited = ref(false)
const history = ref<HistoryRecord[]>([])
const historyCollapsed = ref(true)
const collapsedStyleGroups = ref<Record<string, boolean>>({})

const canGenerate = computed(() => request.value.idea.trim().length > 0 && !loading.value)
const selectedStyleText = computed(() => selectedStyleTags.value.join(' / '))
const selectedParamText = computed(() => {
  return Object.fromEntries(
    parameterGroups.map(group => [group.key, selectedParams.value[group.key].join(' / ') || group.fallback])
  ) as Record<ParamKey, string>
})
const parameterSummary = computed(() =>
  [
    selectedParamText.value.language,
    selectedStyleText.value || '通用流行音乐',
    selectedParamText.value.mood,
    selectedParamText.value.atmosphere,
    selectedParamText.value.vocal,
    selectedParamText.value.tempo,
    selectedParamText.value.key,
    selectedParamText.value.energyCurve,
    selectedParamText.value.platform
  ].filter(Boolean)
)

function syncStyleRequest() {
  request.value.style = selectedStyleText.value || '通用流行音乐'
}

function syncParamRequest(key: ParamKey) {
  const group = parameterGroups.find(item => item.key === key)
  request.value[key] = selectedParams.value[key].join(' / ') || group?.fallback || ''
}

function syncRhymeRequest() {
  request.value.rhyme = rhymeChoice.value === '需要押韵'
}

function isParamSelected(key: ParamKey, option: string) {
  return selectedParams.value[key].includes(option)
}

function toggleParam(key: ParamKey, option: string) {
  if (isParamSelected(key, option)) {
    selectedParams.value[key] = selectedParams.value[key].filter(item => item !== option)
  } else {
    selectedParams.value[key] = [...selectedParams.value[key], option]
  }
  syncParamRequest(key)
}

function clearParam(key: ParamKey) {
  selectedParams.value[key] = []
  syncParamRequest(key)
}

function setRhymeChoice(choice: '需要押韵' | '不强制押韵') {
  rhymeChoice.value = choice
  syncRhymeRequest()
}

function isStyleGroupCollapsed(title: string): boolean {
  return !!collapsedStyleGroups.value[title]
}

function toggleStyleGroup(title: string) {
  collapsedStyleGroups.value[title] = !collapsedStyleGroups.value[title]
}

function isStyleSelected(style: string) {
  return selectedStyleTags.value.includes(style)
}

function toggleStyle(style: string) {
  if (isStyleSelected(style)) {
    selectedStyleTags.value = selectedStyleTags.value.filter(item => item !== style)
  } else {
    selectedStyleTags.value = [...selectedStyleTags.value, style]
  }
  syncStyleRequest()
}

function clearStyles() {
  selectedStyleTags.value = []
  syncStyleRequest()
}

async function generate() {
  if (!canGenerate.value) return
  loading.value = true
  error.value = ''
  copied.value = ''
  result.value = null
  try {
    result.value = await window.amusic.invoke('music:generate', JSON.parse(JSON.stringify(toRaw(request.value))))
    if (result.value) {
      const record: HistoryRecord = {
        id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        idea: request.value.idea,
        styleTags: [...selectedStyleTags.value],
        params: JSON.parse(JSON.stringify(toRaw(selectedParams.value))),
        rhyme: rhymeChoice.value === '需要押韵',
        result: JSON.parse(JSON.stringify(toRaw(result.value)))
      }
      history.value = await window.amusic.invoke('history:add', JSON.parse(JSON.stringify(record)))
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function copyText(label: string, text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = label
  window.setTimeout(() => {
    if (copied.value === label) copied.value = ''
  }, 1600)
}

function quickPatch(text: string) {
  request.value.idea = `${request.value.idea.trim()}\n${text}`
}

const promptText = computed(() => {
  if (!result.value) return ''
  const r = result.value
  const parts = [r.fullPrompt]
  if (r.negativePrompt) parts.push(`\nNegative Prompt: ${r.negativePrompt}`)
  return parts.join('\n')
})

onMounted(() => { void loadHistory() })

async function loadHistory() {
  try {
    history.value = await window.amusic.invoke('history:list')
  } catch {
    history.value = []
  }
}

function viewHistory(record: HistoryRecord) {
  result.value = record.result
  request.value.idea = record.idea
  selectedStyleTags.value = [...record.styleTags]
  const defaults: Record<ParamKey, string[]> = {
    language: [], mood: [], atmosphere: [], vocal: [], vocalArrangement: [],
    tempo: [], groove: [], key: [], energyCurve: [], arrangement: [],
    structure: [], platform: [], lyricDensity: [], rhymeScheme: [],
    useCase: [], songLength: []
  }
  selectedParams.value = { ...defaults }
  for (const k of Object.keys(record.params) as ParamKey[]) {
    if (k in defaults) {
      selectedParams.value[k] = [...record.params[k]]
    }
  }
  rhymeChoice.value = record.rhyme ? '需要押韵' : '不强制押韵'
  syncStyleRequest()
  for (const key of Object.keys(selectedParams.value) as ParamKey[]) {
    syncParamRequest(key)
  }
  syncRhymeRequest()
  historyCollapsed.value = true
}

async function clearAllHistory() {
  try {
    history.value = await window.amusic.invoke('history:clear')
  } catch {
    /* ignore */
  }
}

function formatHistoryTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function collectFavorite() {
  if (!result.value) return
  const record: FavoriteRecord = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    title: result.value.title,
    idea: request.value.idea,
    styleTags: [...selectedStyleTags.value],
    params: JSON.parse(JSON.stringify(toRaw(selectedParams.value))),
    rhyme: rhymeChoice.value === '需要押韵',
    result: JSON.parse(JSON.stringify(toRaw(result.value)))
  }
  try {
    await window.amusic.invoke('favorites:add', JSON.parse(JSON.stringify(record)))
    justFavorited.value = true
    window.setTimeout(() => { justFavorited.value = false }, 1600)
  } catch {
    /* ignore */
  }
}

function applyFavorite(record: FavoriteRecord) {
  selectedStyleTags.value = [...record.styleTags]
  const defaults: Record<ParamKey, string[]> = {
    language: [], mood: [], atmosphere: [], vocal: [], vocalArrangement: [],
    tempo: [], groove: [], key: [], energyCurve: [], arrangement: [],
    structure: [], platform: [], lyricDensity: [], rhymeScheme: [],
    useCase: [], songLength: []
  }
  selectedParams.value = { ...defaults }
  for (const k of Object.keys(record.params) as ParamKey[]) {
    if (k in defaults) {
      selectedParams.value[k] = [...record.params[k]]
    }
  }
  rhymeChoice.value = record.rhyme ? '需要押韵' : '不强制押韵'
  request.value.idea = record.idea
  syncStyleRequest()
  for (const key of Object.keys(selectedParams.value) as ParamKey[]) {
    syncParamRequest(key)
  }
  syncRhymeRequest()
}

watch(() => props.pendingFavorite, (record) => {
  if (record) applyFavorite(record)
})
</script>

<template>
  <div class="p-8 animate-fade-in">
    <div class="flex items-center justify-between mb-6 pb-4 border-b border-base-300/60">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight">音乐创作工作台</h2>
        <p class="text-sm text-base-content/50 mt-1">把一句灵感变成歌词、风格说明和可复制的音乐 AI prompt</p>
      </div>
      <button type="button" class="btn btn-ghost btn-sm gap-2" @click="emit('open-settings')">
        <font-awesome-icon icon="cog" class="w-3.5 h-3.5" />
        AI 设置
      </button>
    </div>

    <div class="space-y-3">
      <section class="card bg-base-100 shadow-sm border border-base-300/60">
        <div class="card-body p-5">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 text-left"
            @click="paramsCollapsed = !paramsCollapsed"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <font-awesome-icon icon="sliders" class="text-base" />
              </div>
              <div>
                <h3 class="font-semibold">创作参数</h3>
                <p class="text-xs text-base-content/50">控制歌曲语言、风格和输出平台</p>
              </div>
            </div>
            <span class="btn btn-ghost btn-sm btn-square">
              <font-awesome-icon :icon="paramsCollapsed ? 'chevron-down' : 'chevron-up'" class="w-3.5 h-3.5" />
            </span>
          </button>

          <div class="mt-4 flex flex-wrap gap-2">
            <span v-for="item in parameterSummary" :key="item" class="badge badge-outline badge-sm">
              {{ item }}
            </span>
          </div>

          <div v-if="!paramsCollapsed" class="mt-5 space-y-5">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <label
                v-for="group in parameterGroups.filter(item => item.key === 'language')"
                :key="group.key"
                class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-4"
              >
                <div class="label py-1">
                  <span class="label-text font-medium text-sm">{{ group.title }}</span>
                  <button type="button" class="btn btn-ghost btn-xs" @click="clearParam(group.key)">清空</button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="option in group.options"
                    :key="option"
                    type="button"
                    :class="[
                      'btn btn-xs',
                      isParamSelected(group.key, option) ? 'btn-primary' : 'btn-outline btn-neutral'
                    ]"
                    @click="toggleParam(group.key, option)"
                  >
                    {{ option }}
                  </button>
                </div>
                <p class="text-xs text-base-content/50 mt-1">
                  当前：<span class="font-semibold text-base-content">{{ selectedParamText[group.key] }}</span>
                </p>
              </label>

              <label class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-4">
                <span class="label label-text font-medium text-sm py-1">押韵</span>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="option in rhymeOptions"
                    :key="option"
                    type="button"
                    :class="['btn btn-xs', rhymeChoice === option ? 'btn-primary' : 'btn-outline btn-neutral']"
                    @click="setRhymeChoice(option)"
                  >
                    {{ option }}
                  </button>
                </div>
              </label>

              <label
                v-for="group in parameterGroups.filter(item => item.key === 'rhymeScheme')"
                :key="group.key"
                class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-4"
              >
                <div class="label py-1">
                  <span class="label-text font-medium text-sm">{{ group.title }}</span>
                  <button type="button" class="btn btn-ghost btn-xs" @click="clearParam(group.key)">清空</button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="option in group.options"
                    :key="option"
                    type="button"
                    :class="[
                      'btn btn-xs',
                      isParamSelected(group.key, option) ? 'btn-primary' : 'btn-outline btn-neutral'
                    ]"
                    @click="toggleParam(group.key, option)"
                  >
                    {{ option }}
                  </button>
                </div>
              </label>
            </div>

            <label class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-4">
              <div class="label py-1">
                <span class="label-text font-medium text-sm">音乐风格</span>
                <button type="button" class="btn btn-ghost btn-xs" @click="clearStyles">清空</button>
              </div>
              <div class="space-y-3">
                <div v-for="group in styleGroups" :key="group.title" class="space-y-2">
                  <button
                    type="button"
                    class="flex items-center gap-1.5 text-[11px] font-bold text-base-content/40 uppercase tracking-wider hover:text-base-content/70 transition-colors"
                    @click="toggleStyleGroup(group.title)"
                  >
                    <font-awesome-icon :icon="isStyleGroupCollapsed(group.title) ? 'chevron-down' : 'chevron-up'" class="w-2.5 h-2.5" />
                    {{ group.title }}
                  </button>
                  <div v-if="!isStyleGroupCollapsed(group.title)" class="flex flex-wrap gap-1.5">
                    <button
                      v-for="style in group.options"
                      :key="style"
                      type="button"
                      :class="[
                        'btn btn-xs',
                        isStyleSelected(style) ? 'btn-primary' : 'btn-outline btn-neutral'
                      ]"
                      @click="toggleStyle(style)"
                    >
                      {{ style }}
                    </button>
                  </div>
                </div>
              </div>
              <p class="text-xs text-base-content/50 mt-2 leading-relaxed">
                当前组合：<span class="font-semibold text-base-content">{{ selectedStyleText || '未选择，生成时使用通用流行音乐' }}</span>
              </p>
            </label>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <label
                v-for="group in parameterGroups.filter(item => item.key !== 'language' && item.key !== 'rhymeScheme')"
                :key="group.key"
                class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-4"
              >
                <div class="label py-1">
                  <span class="label-text font-medium text-sm">{{ group.title }}</span>
                  <button type="button" class="btn btn-ghost btn-xs" @click="clearParam(group.key)">清空</button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="option in group.options"
                    :key="option"
                    type="button"
                    :class="[
                      'btn btn-xs',
                      isParamSelected(group.key, option) ? 'btn-primary' : 'btn-outline btn-neutral'
                    ]"
                    @click="toggleParam(group.key, option)"
                  >
                    {{ option }}
                  </button>
                </div>
                <p class="text-xs text-base-content/50 mt-1">
                  当前：<span class="font-semibold text-base-content">{{ selectedParamText[group.key] }}</span>
                </p>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section class="card bg-base-100 shadow-sm border border-base-300/60">
        <div class="card-body p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <font-awesome-icon icon="feather-alt" class="text-base" />
            </div>
            <div>
              <h3 class="font-semibold">灵感输入</h3>
              <p class="text-xs text-base-content/50">描述故事、画面、情绪和你想要的听感</p>
            </div>
          </div>

          <textarea v-model="request.idea" class="textarea textarea-bordered min-h-60 leading-7 text-sm" />

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline btn-neutral btn-xs" @click="quickPatch('调整方向：副歌更抓耳，旋律感更强。')">副歌加强</button>
            <button type="button" class="btn btn-outline btn-neutral btn-xs" @click="quickPatch('调整方向：歌词更口语、更像真实的人在说话。')">更口语</button>
            <button type="button" class="btn btn-outline btn-neutral btn-xs" @click="quickPatch('调整方向：制作更电影感，末段更开阔。')">电影感</button>
            <button type="button" class="btn btn-outline btn-neutral btn-xs" @click="quickPatch('调整方向：更商业、更适合短视频传播。')">更商业</button>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-sm">参考歌词（可选）</span>
              <span class="label-text-alt text-xs text-base-content/40">填入后 AI 将参考其结构、句式和情绪进行生成</span>
            </label>
            <textarea
              v-model="request.referenceLyrics"
              class="textarea textarea-bordered min-h-40 leading-7 text-sm font-mono"
              placeholder="粘贴一段你喜欢的歌词，AI 会参考它的段落结构、句式节奏和情绪走向来创作…"
            />
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button class="btn btn-primary btn-sm gap-2" type="button" :disabled="!canGenerate" @click="generate">
              <span v-if="loading" class="loading loading-spinner loading-xs"></span>
              <font-awesome-icon v-else icon="music" class="w-3.5 h-3.5" />
              {{ loading ? '生成中...' : '生成歌词与 Prompt' }}
            </button>
            <p v-if="error" class="text-error text-sm font-medium">{{ error }}</p>
          </div>
        </div>
      </section>

      <section class="card bg-base-100 shadow-sm border border-base-300/60">
        <div class="card-body p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <font-awesome-icon icon="microphone" class="text-base" />
            </div>
            <div>
              <h3 class="font-semibold">生成结果</h3>
              <p class="text-xs text-base-content/50">完整 prompt 一键复制，历史记录自动保存最近 20 条</p>
            </div>
          </div>

          <div v-if="!result" class="min-h-96 flex flex-col items-center justify-center text-center text-base-content/50 gap-2">
            <font-awesome-icon icon="music" class="text-3xl text-primary/50" />
            <strong class="text-base-content">等待第一首歌</strong>
            <span class="text-sm">配置好 AI 服务后，输入灵感即可生成可复制的歌词与音乐提示词。</span>
          </div>

          <template v-else>
            <div class="flex items-start justify-between gap-3 border-b border-base-300/60 pb-4 mb-4">
              <div class="min-w-0">
                <h3 class="text-xl font-bold truncate">{{ result.title }}</h3>
                <p class="text-sm text-base-content/50 mt-1">{{ result.concept }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button type="button" class="btn btn-outline btn-sm gap-2" @click="collectFavorite">
                  <font-awesome-icon :icon="justFavorited ? 'check' : 'bookmark'" class="w-3.5 h-3.5" />
                  {{ justFavorited ? '已收藏' : '收藏' }}
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold">歌词</h4>
                  <button type="button" class="btn btn-ghost btn-xs gap-1" @click="copyText('歌词', result.lyrics)">
                    <font-awesome-icon :icon="copied === '歌词' ? 'check' : 'copy'" class="w-3 h-3" />
                    {{ copied === '歌词' ? '已复制' : '复制' }}
                  </button>
                </div>
                <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono">{{ result.lyrics }}</pre>
              </div>

              <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold">Prompt</h4>
                  <button type="button" class="btn btn-primary btn-xs gap-1" @click="copyText('Prompt', promptText)">
                    <font-awesome-icon :icon="copied === 'Prompt' ? 'check' : 'copy'" class="w-3 h-3" />
                    {{ copied === 'Prompt' ? '已复制' : '一键复制' }}
                  </button>
                </div>
                <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono">{{ promptText }}</pre>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section v-if="history.length > 0" class="card bg-base-100 shadow-sm border border-base-300/60">
        <div class="card-body p-5">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 text-left"
            @click="historyCollapsed = !historyCollapsed"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center text-info">
                <font-awesome-icon icon="clock-rotate-left" class="text-base" />
              </div>
              <div>
                <h3 class="font-semibold">历史记录</h3>
                <p class="text-xs text-base-content/50">{{ history.length }} 条记录 · 最近 20 条</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!historyCollapsed"
                type="button"
                class="btn btn-ghost btn-xs text-error"
                @click.stop="clearAllHistory"
              >
                清空
              </button>
              <span class="btn btn-ghost btn-sm btn-square">
                <font-awesome-icon :icon="historyCollapsed ? 'chevron-down' : 'chevron-up'" class="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          <div v-if="!historyCollapsed" class="mt-4 space-y-2">
            <button
              v-for="item in history"
              :key="item.id"
              type="button"
              class="w-full text-left rounded-xl border border-base-300/60 bg-base-200/30 p-3 hover:bg-base-200/60 transition-colors"
              @click="viewHistory(item)"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="font-semibold text-sm truncate">{{ item.result.title }}</span>
                <span class="text-xs text-base-content/40 shrink-0">{{ formatHistoryTime(item.createdAt) }}</span>
              </div>
              <p class="text-xs text-base-content/40 line-clamp-1">{{ item.idea }}</p>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
