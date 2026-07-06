<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import type { FavoriteRecord, HistoryRecord, LyricsDraftResult, SongRequest, SongResult } from '../../../shared/types'

const props = defineProps<{ pendingFavorite: FavoriteRecord | null }>()
const emit = defineEmits<{ 'open-settings': [] }>()

type ParamKey = 'language' | 'mood' | 'atmosphere' | 'vocal' | 'vocalArrangement' | 'tempo' | 'groove' | 'key' | 'energyCurve' | 'arrangement' | 'structure' | 'platform' | 'lyricDensity' | 'rhymeScheme' | 'useCase' | 'songLength'

const basicParamKeys: ParamKey[] = ['language', 'mood', 'atmosphere', 'vocal', 'vocalArrangement', 'platform', 'useCase']
const advancedParamKeys: ParamKey[] = ['tempo', 'groove', 'key', 'energyCurve', 'arrangement', 'structure', 'lyricDensity', 'rhymeScheme', 'songLength']

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

const quickStyleOptions = [
  '华语流行',
  'R&B',
  '民谣',
  '摇滚',
  '电子流行',
  '说唱',
  'City Pop',
  'K-pop',
  '独立流行',
  '钢琴主导',
  '吉他主导',
  '温暖模拟质感'
]

const selectedStyleTags = ref(['华语流行'])
const selectedFusion = ref({
  base: ['独立流行'],
  element: ['Trip-Hop'],
  texture: ['合成器铺底']
})
const selectedChineseFusion = ref({
  mood: ['江南'],
  source: ['昆曲'],
  instrument: ['古筝', '箫'],
  method: ['现代流行融合']
})
const rhymeOptions: Array<'需要押韵' | '不强制押韵'> = ['需要押韵', '不强制押韵']
const generationModeOptions = ['生成 1 个精修版', '生成 3 个方向']
const hotLyricRuleOptions = [
  {
    title: '不使用热榜规则',
    value: '',
    styleTags: [],
    params: {},
    summary: '按当前灵感和参数自由创作。'
  },
  {
    title: '夏日温柔氛围感',
    value: [
      '赛道：夏日温柔氛围感。',
      '结构：场景具象 1 句 + 轻情绪状态 1 句 + 留白金句 1 句，形成 15s 超短闭环。',
      '句式：6-7 字短句为主，景深情浅，画面占比约 70%，情绪占比约 30%。',
      '用词：优先晚风、落日、初夏、星光、山野、暮色、温柔、余光、清风。',
      '避雷：禁止悲情词汇、厚重人生感慨、激烈情绪、长修饰语。'
    ].join('\n'),
    styleTags: ['华语流行', '电子流行', '温暖模拟质感'],
    params: {
      mood: ['温暖', '释怀'],
      atmosphere: ['夏日', '海边'],
      lyricDensity: ['极简短句'],
      useCase: ['短视频BGM'],
      songLength: ['30秒短视频']
    },
    summary: '晚风、落日、山野、暮色，适合日常 vlog 和夏日剪辑。'
  },
  {
    title: '轻遗憾青春叙旧',
    value: [
      '赛道：轻遗憾青春叙旧流。',
      '结构：怀旧场景铺垫 1 句 + 青春浅遗憾 1 句 + 温柔释怀收尾 1 句。',
      '句式：7-8 字短句，过去 vs 现在的轻对比，采用释怀式陈述。',
      '用词：优先叙旧、余温、时光、旧梦、岁岁、伏笔、经年、初见。',
      '避雷：禁止反问式虐心句、浓烈悲伤、纠缠式表达。'
    ].join('\n'),
    styleTags: ['华语流行', 'City Pop', '低保真颗粒'],
    params: {
      mood: ['伤感', '释怀'],
      atmosphere: ['怀旧', '夜晚感'],
      lyricDensity: ['留白呼吸感'],
      useCase: ['短视频BGM']
    },
    summary: '遗憾但不纠结，怀念但不沉沦。'
  },
  {
    title: '极简治愈人生',
    value: [
      '赛道：极简治愈人生流。',
      '结构：人间状态短句 1 句 + 自我和解感悟 1 句 + 温柔态度金句 1 句。',
      '句式：8 字左右短句，工整柔和，无负面宣泄。',
      '用词：优先温柔、人间、释然、平凡、期许、安然、奔赴。',
      '避雷：禁止厚重中年感慨、说教、空泛鸡汤。'
    ].join('\n'),
    styleTags: ['华语流行', '民谣', '钢琴主导'],
    params: {
      mood: ['治愈', '温暖'],
      atmosphere: ['室内亲密'],
      lyricDensity: ['极简短句'],
      energyCurve: ['平稳推进']
    },
    summary: '适合主页文案、治愈日常和温柔陪伴。'
  },
  {
    title: '新式轻国风氛围',
    value: [
      '赛道：新式轻国风氛围感。',
      '结构：极简国风意象 1 句 + 现代温柔抒情 1 句 + 短句记忆点收尾。',
      '句式：长短柔和搭配，不用复杂古风对仗和生僻典故。',
      '用词：优先轻舟、渡月、雾中、半盏、清风、赴约、山河、岁岁。',
      '避雷：禁止堆砌古风辞藻、复杂典故、过度书面化。'
    ].join('\n'),
    styleTags: ['华语流行', '中国风', '古典跨界'],
    params: {
      mood: ['治愈', '梦幻'],
      atmosphere: ['江南', '山水'],
      lyricDensity: ['更诗意'],
      arrangement: ['弦乐前奏']
    },
    summary: '国风外壳，现代温柔情绪内核。'
  }
]
const creativePresets: Array<{ title: string; styleTags: string[]; params: Partial<Record<ParamKey, string[]>>; ideaPatch: string }> = [
  {
    title: '短视频爆款副歌',
    styleTags: ['华语流行', 'R&B', '电子流行'],
    params: {
      mood: ['孤独', '释怀'],
      atmosphere: ['都市', '夜晚感'],
      vocal: ['男声', '副歌有力量'],
      tempo: ['中速 88-112 BPM'],
      energyCurve: ['突然爆发'],
      lyricDensity: ['副歌短句抓耳'],
      useCase: ['短视频BGM'],
      songLength: ['1分钟短曲']
    },
    ideaPatch: '创作目标：副歌要在前 30 秒内出现，核心句适合短视频反复使用。'
  },
  {
    title: '完整流行歌',
    styleTags: ['华语流行', '温暖模拟质感'],
    params: {
      mood: ['伤感', '释怀'],
      atmosphere: ['夜晚感'],
      vocal: ['男声'],
      tempo: ['中慢板 72-88 BPM'],
      energyCurve: ['渐强爆发'],
      useCase: ['完整歌曲'],
      songLength: ['3分钟+']
    },
    ideaPatch: '创作目标：完整歌曲结构成立，主歌叙事清楚，副歌有记忆点。'
  },
  {
    title: '治愈民谣',
    styleTags: ['民谣', '木吉他原声'],
    params: {
      mood: ['治愈', '温暖'],
      atmosphere: ['室内亲密'],
      vocal: ['民谣白嗓', '亲密低语'],
      tempo: ['慢板 60-72 BPM'],
      arrangement: ['木吉他前奏'],
      energyCurve: ['平稳推进']
    },
    ideaPatch: '创作目标：歌词像真实安慰，不煽情，编曲保持克制。'
  },
  {
    title: 'R&B 氛围歌',
    styleTags: ['R&B', 'Neo-Soul', '低保真颗粒'],
    params: {
      mood: ['慵懒', '迷茫'],
      atmosphere: ['夜晚感', '都市'],
      vocal: ['略带气声', '灵魂乐转音'],
      tempo: ['中慢板 72-88 BPM'],
      groove: ['切分律动'],
      lyricDensity: ['更口语']
    },
    ideaPatch: '创作目标：人声贴近，律动松弛，歌词有夜晚独处的细节。'
  },
  {
    title: '影视感配乐',
    styleTags: ['管弦电影感', '钢琴主导', '弦乐编排'],
    params: {
      mood: ['坚定', '释怀'],
      atmosphere: ['旷野开阔'],
      vocal: ['空灵声线'],
      arrangement: ['弦乐前奏', '环境音过渡'],
      energyCurve: ['阶梯递进'],
      useCase: ['影视配乐']
    },
    ideaPatch: '创作目标：画面感强，段落递进清楚，末段打开空间。'
  }
]
const fusionBuilderOptions = {
  base: ['华语流行', 'R&B', '民谣', '独立流行', '电子流行', '说唱', 'City Pop', '摇滚'],
  element: ['Trip-Hop', 'Jazz Hip-Hop', 'Synthwave', 'UK Garage', 'Neo-Soul', '古典跨界', '中国风', 'Afrobeat', 'Dream Pop', 'Lo-fi'],
  texture: ['低保真颗粒', '温暖模拟质感', '合成器铺底', '极简留白', '厚重低频', '大空间混响', '真实乐器录制', '电子鼓机']
}
const chineseFusionOptions = {
  mood: ['古风', '国风', '江南', '西北', '武侠', '山水', '禅意', '宫廷'],
  source: ['京剧', '昆曲', '黄梅戏', '越剧', '豫剧', '粤剧', '秦腔', '江南小调', '陕北民歌'],
  instrument: ['古筝', '琵琶', '二胡', '笛子', '箫', '唢呐', '编钟', '民族打击乐'],
  method: ['戏腔点缀', '现代流行融合', '电子国风', '影视配乐化', '极简东方留白', '锣鼓经节奏']
}
const naturalControls = ['更抓耳', '更口语', '更高级', '更商业', '更电影感', '更私密', '更开阔', '副歌更早进入']
const platformCopyOptions = [
  { label: '妙响版', key: 'miaoxiangPrompt' },
  { label: 'Suno 版', key: 'sunoPrompt' },
  { label: 'Udio 版', key: 'udioPrompt' }
] as const
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
    options: ['夜晚感', '雨天', '都市', '公路感', '夏日', '海边', '怀旧', '未来感', '室内亲密', '旷野开阔']
  },
  {
    key: 'vocal',
    title: '人声特质',
    fallback: '男声',
    options: [
      '女声', '男声', '中性声线', '亲密低语', '略带气声', '沙哑质感', '空灵声线', '副歌有力量', '说唱段落',
      '假声男声', '磁性低音', '清亮高音', '烟嗓女声', '民谣白嗓', '戏腔', '花腔', '纯假声', '真假音转换', '耳语式唱法', '爵士慵懒', '灵魂乐转音'
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
  idea: '用简单直白的短句写爱恨遗憾、独处细碎情绪，搭配易抓耳重复句，贴合短视频氛围感，不用复杂修辞。',
  generationMode: '生成 1 个精修版',
  iterationInstruction: '',
  hotLyricRule: '',
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
const lyricsDraftLoading = ref(false)
const promptFromLyricsLoading = ref(false)
const error = ref('')
const copied = ref('')
const lyricsDraft = ref<LyricsDraftResult | null>(null)
const editableLyrics = ref('')
const activeWorkflowTab = ref<'complete' | 'lyricsFirst'>('complete')
const paramsCollapsed = ref(false)
const advancedParamsCollapsed = ref(true)
const justFavorited = ref(false)
const history = ref<HistoryRecord[]>([])
const historyCollapsed = ref(true)
const detailedStylesCollapsed = ref(true)
const collapsedStyleGroups = ref<Record<string, boolean>>(
  Object.fromEntries(styleGroups.map(group => [group.title, true]))
)

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

function setParamValues(key: ParamKey, values: string[]) {
  selectedParams.value[key] = [...values]
  syncParamRequest(key)
}

function applyPreset(preset: typeof creativePresets[number]) {
  selectedStyleTags.value = [...preset.styleTags]
  syncStyleRequest()
  for (const [key, values] of Object.entries(preset.params) as Array<[ParamKey, string[]]>) {
    setParamValues(key, values)
  }
  quickPatch(preset.ideaPatch)
}

function toggleFusionOption(group: keyof typeof selectedFusion.value, option: string) {
  const current = selectedFusion.value[group]
  selectedFusion.value[group] = current.includes(option)
    ? current.filter(item => item !== option)
    : [...current, option]
}

function isFusionSelected(group: keyof typeof selectedFusion.value, option: string): boolean {
  return selectedFusion.value[group].includes(option)
}

function applyFusionBuilder() {
  const combined = [
    ...selectedFusion.value.base,
    ...selectedFusion.value.element,
    ...selectedFusion.value.texture
  ]
  selectedStyleTags.value = Array.from(new Set(combined))
  syncStyleRequest()
  setParamValues('energyCurve', ['脉冲式起伏'])
  setParamValues('lyricDensity', ['更诗意'])
  quickPatch(`融合测试：以 ${selectedFusion.value.base.join(' / ') || '主流流行'} 为主体，融合 ${selectedFusion.value.element.join(' / ') || '实验元素'}，制作质感偏 ${selectedFusion.value.texture.join(' / ') || '特别声音设计'}。`)
}

function toggleChineseFusionOption(group: keyof typeof selectedChineseFusion.value, option: string) {
  const current = selectedChineseFusion.value[group]
  selectedChineseFusion.value[group] = current.includes(option)
    ? current.filter(item => item !== option)
    : [...current, option]
}

function isChineseFusionSelected(group: keyof typeof selectedChineseFusion.value, option: string): boolean {
  return selectedChineseFusion.value[group].includes(option)
}

function applyChineseFusionBuilder() {
  const combined = [
    ...selectedStyleTags.value,
    ...selectedChineseFusion.value.mood,
    ...selectedChineseFusion.value.source,
    ...selectedChineseFusion.value.instrument,
    ...selectedChineseFusion.value.method
  ]
  selectedStyleTags.value = Array.from(new Set(combined))
  syncStyleRequest()
  setParamValues('atmosphere', Array.from(new Set([...selectedParams.value.atmosphere, ...selectedChineseFusion.value.mood])))
  setParamValues('arrangement', Array.from(new Set([...selectedParams.value.arrangement, ...selectedChineseFusion.value.instrument])))
  if (selectedChineseFusion.value.method.includes('戏腔点缀')) {
    setParamValues('vocal', Array.from(new Set([...selectedParams.value.vocal, '戏腔'])))
  }
  if (selectedChineseFusion.value.method.includes('影视配乐化')) {
    setParamValues('energyCurve', ['阶梯递进'])
  }
  quickPatch(`中国元素融合：以 ${selectedChineseFusion.value.mood.join(' / ') || '中国意境'} 为画面，参考 ${selectedChineseFusion.value.source.join(' / ') || '戏曲/民歌来源'} 的唱腔气质，使用 ${selectedChineseFusion.value.instrument.join(' / ') || '民族乐器'}，融合方式为 ${selectedChineseFusion.value.method.join(' / ') || '现代流行融合'}。`)
}

function setGenerationMode(mode: string) {
  request.value.generationMode = mode
}

function applyHotLyricRule(rule: typeof hotLyricRuleOptions[number]) {
  request.value.hotLyricRule = rule.value
  if (rule.styleTags.length > 0) {
    selectedStyleTags.value = Array.from(new Set([...selectedStyleTags.value, ...rule.styleTags]))
    syncStyleRequest()
  }
  for (const [key, values] of Object.entries(rule.params) as Array<[ParamKey, string[]]>) {
    setParamValues(key, values)
  }
  if (rule.value) {
    quickPatch(`热榜歌词方向：${rule.title}。${rule.summary}`)
  }
}

function applyNaturalControl(control: string) {
  const instructions: Record<string, string> = {
    更抓耳: '调整方向：副歌旋律和歌词更抓耳，核心句更短、更适合重复。',
    更口语: '调整方向：歌词更口语，像真实的人在说话，减少书面化修辞。',
    更高级: '调整方向：表达更克制，减少直白口号，制作质感更细腻。',
    更商业: '调整方向：结构更清晰，副歌更早出现，整体更适合大众传播。',
    更电影感: '调整方向：画面感更强，编曲空间更开阔，末段情绪推高。',
    更私密: '调整方向：人声更贴近，编曲更少，歌词更像独处时的低声表达。',
    更开阔: '调整方向：副歌和尾段更开阔，增加空间感与层次推进。',
    副歌更早进入: '调整方向：缩短前奏和主歌铺垫，让副歌更早进入。'
  }
  quickPatch(instructions[control] || `调整方向：${control}`)
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

function toggleDetailedStyles() {
  detailedStylesCollapsed.value = !detailedStylesCollapsed.value
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

function completeSongResult(value: SongResult): SongResult {
  return {
    ...value,
    sunoPrompt: value.sunoPrompt || value.fullPrompt || '',
    udioPrompt: value.udioPrompt || value.fullPrompt || '',
    miaoxiangPrompt: value.miaoxiangPrompt || value.fullPrompt || '',
    lyricOnly: value.lyricOnly || value.lyrics || '',
    qualityChecks: value.qualityChecks || [],
    revisionSuggestions: value.revisionSuggestions || [],
    variants: value.variants || []
  }
}

function iterateWithInstruction(instruction: string) {
  if (!result.value) return
  request.value.idea = [
    `基于当前版本《${result.value.title}》继续打磨。`,
    `当前概念：${result.value.concept}`,
    '',
    '当前歌词：',
    result.value.lyrics
  ].join('\n')
  request.value.iterationInstruction = instruction
  result.value = null
  copied.value = ''
}

function continueWithVariant(variant: SongResult['variants'][number]) {
  request.value.idea = [
    `继续打磨候选方向：${variant.title}`,
    `方向：${variant.direction}`,
    `核心 Hook：${variant.hookLine}`,
    `风格：${variant.stylePrompt}`,
    `下一轮重点：${variant.revisionFocus}`
  ].join('\n')
  request.value.iterationInstruction = `按“${variant.title}”方向重写，保留原始创意核心，但强化：${variant.revisionFocus}`
  result.value = null
  copied.value = ''
}

async function generate() {
  if (!canGenerate.value) return
  loading.value = true
  error.value = ''
  copied.value = ''
  result.value = null
  try {
    const generated = await window.amusic.invoke('music:generate', JSON.parse(JSON.stringify(toRaw(request.value))))
    result.value = completeSongResult(generated)
    request.value.iterationInstruction = ''
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

async function generateLyricsDraft() {
  if (!request.value.idea.trim() || lyricsDraftLoading.value || promptFromLyricsLoading.value) return
  lyricsDraftLoading.value = true
  error.value = ''
  copied.value = ''
  result.value = null
  try {
    const draft = await window.amusic.invoke('lyrics:generate', {
      idea: request.value.idea,
      generationMode: request.value.generationMode,
      iterationInstruction: request.value.iterationInstruction,
      hotLyricRule: request.value.hotLyricRule,
      language: request.value.language,
      mood: request.value.mood,
      atmosphere: request.value.atmosphere,
      lyricDensity: request.value.lyricDensity,
      rhymeScheme: request.value.rhymeScheme,
      useCase: request.value.useCase,
      songLength: request.value.songLength,
      rhyme: request.value.rhyme
    })
    lyricsDraft.value = draft
    editableLyrics.value = normalizeLyricText(draft.lyrics)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    lyricsDraftLoading.value = false
  }
}

async function generatePromptFromLyrics() {
  const lyrics = editableLyrics.value.trim()
  if (!lyrics || promptFromLyricsLoading.value || lyricsDraftLoading.value) return
  promptFromLyricsLoading.value = true
  error.value = ''
  copied.value = ''
  result.value = null
  try {
    const generated = await window.amusic.invoke('lyrics:prompt', {
      title: lyricsDraft.value?.title || '',
      concept: lyricsDraft.value?.concept || request.value.idea,
      lyrics,
      language: request.value.language,
      style: request.value.style,
      mood: request.value.mood,
      atmosphere: request.value.atmosphere,
      vocal: request.value.vocal,
      vocalArrangement: request.value.vocalArrangement,
      tempo: request.value.tempo,
      groove: request.value.groove,
      key: request.value.key,
      energyCurve: request.value.energyCurve,
      arrangement: request.value.arrangement,
      structure: request.value.structure,
      platform: request.value.platform,
      useCase: request.value.useCase,
      songLength: request.value.songLength,
      constraints: request.value.iterationInstruction || '歌词不要改写；Prompt 使用英文；避免模仿具体歌手或现有作品'
    })
    result.value = completeSongResult(generated)
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
    promptFromLyricsLoading.value = false
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

const lyricText = computed(() => {
  if (!result.value) return ''
  return normalizeLyricText(result.value.lyricOnly || result.value.lyrics)
})

function normalizeLyricText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]*\/[ \t]*/g, '\n')
    .replace(/\s*(\[[^\]]+\])\s*/g, '\n\n$1\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n(\[[^\]]+\])/g, '\n\n$1')
    .trim()
}

function platformPromptText(key: typeof platformCopyOptions[number]['key']): string {
  if (!result.value) return ''
  return result.value[key] || promptText.value
}

onMounted(() => { void loadHistory() })

async function loadHistory() {
  try {
    history.value = await window.amusic.invoke('history:list')
  } catch {
    history.value = []
  }
}

function viewHistory(record: HistoryRecord) {
  result.value = completeSongResult(record.result)
  editableLyrics.value = normalizeLyricText(result.value.lyricOnly || result.value.lyrics)
  lyricsDraft.value = null
  request.value.idea = record.idea
  request.value.hotLyricRule = ''
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
  const favoriteResult = completeSongResult(record.result)
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
  request.value.hotLyricRule = ''
  editableLyrics.value = normalizeLyricText(favoriteResult.lyricOnly || favoriteResult.lyrics)
  lyricsDraft.value = null
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
            <div class="rounded-box border border-base-300/60 bg-base-200/30 p-4 space-y-3">
              <div class="label py-1">
                <span class="label-text font-medium text-sm">创作意图预设</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="preset in creativePresets"
                  :key="preset.title"
                  type="button"
                  class="btn btn-outline btn-neutral btn-xs"
                  @click="applyPreset(preset)"
                >
                  {{ preset.title }}
                </button>
              </div>
            </div>

            <div class="rounded-box border border-base-300/60 bg-base-200/30 p-4 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h4 class="font-semibold text-sm">实验融合测试</h4>
                  <p class="text-xs text-base-content/50 mt-1">自由组合主风格、融合元素和制作质感</p>
                </div>
                <button type="button" class="btn btn-secondary btn-xs" @click="applyFusionBuilder">
                  应用组合测试
                </button>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">主风格</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in fusionBuilderOptions.base"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isFusionSelected('base', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleFusionOption('base', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">融合元素</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in fusionBuilderOptions.element"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isFusionSelected('element', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleFusionOption('element', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">制作质感</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in fusionBuilderOptions.texture"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isFusionSelected('texture', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleFusionOption('texture', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>
              </div>

              <p class="text-xs text-base-content/50 leading-relaxed">
                当前组合：<span class="font-semibold text-base-content">{{ [...selectedFusion.base, ...selectedFusion.element, ...selectedFusion.texture].join(' / ') || '未选择' }}</span>
              </p>
            </div>

            <div class="rounded-box border border-base-300/60 bg-base-200/30 p-4 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h4 class="font-semibold text-sm">中国元素融合</h4>
                  <p class="text-xs text-base-content/50 mt-1">组合中国意境、戏曲/民歌来源、民族乐器和融合方式</p>
                </div>
                <button type="button" class="btn btn-secondary btn-xs" @click="applyChineseFusionBuilder">
                  应用中国元素
                </button>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-4 gap-3">
                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">中国意境</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in chineseFusionOptions.mood"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isChineseFusionSelected('mood', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleChineseFusionOption('mood', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">戏曲/民歌来源</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in chineseFusionOptions.source"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isChineseFusionSelected('source', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleChineseFusionOption('source', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">民族乐器</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in chineseFusionOptions.instrument"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isChineseFusionSelected('instrument', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleChineseFusionOption('instrument', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[11px] font-bold text-base-content/40 uppercase tracking-wider">融合方式</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="option in chineseFusionOptions.method"
                      :key="option"
                      type="button"
                      :class="['btn btn-xs', isChineseFusionSelected('method', option) ? 'btn-secondary' : 'btn-outline btn-neutral']"
                      @click="toggleChineseFusionOption('method', option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>
              </div>

              <p class="text-xs text-base-content/50 leading-relaxed">
                当前组合：<span class="font-semibold text-base-content">{{ [...selectedChineseFusion.mood, ...selectedChineseFusion.source, ...selectedChineseFusion.instrument, ...selectedChineseFusion.method].join(' / ') || '未选择' }}</span>
              </p>
            </div>

            <div class="rounded-box border border-base-300/60 bg-base-200/30 p-4 space-y-3">
              <div class="label py-1">
                <span class="label-text font-medium text-sm">生成模式</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="mode in generationModeOptions"
                  :key="mode"
                  type="button"
                  :class="['btn btn-xs', request.generationMode === mode ? 'btn-primary' : 'btn-outline btn-neutral']"
                  @click="setGenerationMode(mode)"
                >
                  {{ mode }}
                </button>
              </div>
            </div>

            <div class="rounded-box border border-base-300/60 bg-base-200/30 p-4 space-y-3">
              <div class="label py-1">
                <span class="label-text font-medium text-sm">热榜歌词结构</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
                <button
                  v-for="rule in hotLyricRuleOptions"
                  :key="rule.title"
                  type="button"
                  :class="[
                    'btn h-20 min-h-20 items-start justify-start text-left text-wrap px-3 py-2 overflow-hidden',
                    request.hotLyricRule === rule.value ? 'btn-primary' : 'btn-outline btn-neutral'
                  ]"
                  @click="applyHotLyricRule(rule)"
                >
                  <span class="block min-w-0 w-full overflow-hidden">
                    <span class="block text-xs font-semibold truncate">{{ rule.title }}</span>
                    <span class="block text-[11px] opacity-70 leading-snug mt-1 line-clamp-2 whitespace-normal">{{ rule.summary }}</span>
                  </span>
                </button>
              </div>
              <p v-if="request.hotLyricRule" class="text-xs text-base-content/50 leading-relaxed whitespace-pre-wrap">
                {{ request.hotLyricRule }}
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </div>

            <label class="form-control rounded-box border border-base-300/60 bg-base-200/30 p-4">
              <div class="label py-1">
                <span class="label-text font-medium text-sm">音乐风格</span>
                <button type="button" class="btn btn-ghost btn-xs" @click="clearStyles">清空</button>
              </div>
              <div class="space-y-3">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="style in quickStyleOptions"
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

                <button
                  type="button"
                  class="flex items-center gap-1.5 text-[11px] font-bold text-base-content/40 uppercase tracking-wider hover:text-base-content/70 transition-colors"
                  @click="toggleDetailedStyles"
                >
                  <font-awesome-icon :icon="detailedStylesCollapsed ? 'chevron-down' : 'chevron-up'" class="w-2.5 h-2.5" />
                  更多细分风格
                </button>

                <div v-if="!detailedStylesCollapsed" class="space-y-3">
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

              </div>
              <p class="text-xs text-base-content/50 mt-2 leading-relaxed">
                当前组合：<span class="font-semibold text-base-content">{{ selectedStyleText || '未选择，生成时使用通用流行音乐' }}</span>
              </p>
            </label>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <label
                v-for="group in parameterGroups.filter(item => basicParamKeys.includes(item.key) && item.key !== 'language')"
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

            <section class="rounded-box border border-base-300/60 bg-base-200/30 p-4">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 text-left"
                @click="advancedParamsCollapsed = !advancedParamsCollapsed"
              >
                <div>
                  <h4 class="font-semibold text-sm">高级参数</h4>
                  <p class="text-xs text-base-content/50 mt-1">速度、律动、调性、结构、编曲和歌词细节</p>
                </div>
                <span class="btn btn-ghost btn-xs btn-square">
                  <font-awesome-icon :icon="advancedParamsCollapsed ? 'chevron-down' : 'chevron-up'" class="w-3 h-3" />
                </span>
              </button>

              <div v-if="!advancedParamsCollapsed" class="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <label
                  v-for="group in parameterGroups.filter(item => advancedParamKeys.includes(item.key))"
                  :key="group.key"
                  class="form-control rounded-box border border-base-300/60 bg-base-100/70 p-4"
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
            </section>
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
            <button
              v-for="control in naturalControls"
              :key="control"
              type="button"
              class="btn btn-outline btn-neutral btn-xs"
              @click="applyNaturalControl(control)"
            >
              {{ control }}
            </button>
          </div>

          <div class="tabs tabs-boxed bg-base-200/60 w-fit">
            <button
              type="button"
              :class="['tab tab-sm', activeWorkflowTab === 'complete' ? 'tab-active' : '']"
              @click="activeWorkflowTab = 'complete'"
            >
              一次性生成
            </button>
            <button
              type="button"
              :class="['tab tab-sm', activeWorkflowTab === 'lyricsFirst' ? 'tab-active' : '']"
              @click="activeWorkflowTab = 'lyricsFirst'"
            >
              先歌词后 Prompt
            </button>
          </div>

          <section v-if="activeWorkflowTab === 'complete'" class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="font-semibold">一次性生成歌词与 Prompt</h4>
                <p class="text-xs text-base-content/50 mt-1">根据灵感和当前参数直接生成完整歌词、英文 Prompt 与平台复制项</p>
              </div>
              <button class="btn btn-primary btn-sm gap-2 shrink-0" type="button" :disabled="!canGenerate" @click="generate">
                <span v-if="loading" class="loading loading-spinner loading-xs"></span>
                <font-awesome-icon v-else icon="music" class="w-3.5 h-3.5" />
                {{ loading ? '生成中...' : '生成歌词与 Prompt' }}
              </button>
            </div>
          </section>

          <section v-else class="rounded-xl border border-base-300/60 bg-base-200/30 p-4 space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="font-semibold">先生成歌词，再生成 Prompt</h4>
                <p class="text-xs text-base-content/50 mt-1">先生成并编辑歌词，再让 AI 根据最终歌词反推英文音乐 Prompt</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  class="btn btn-outline btn-sm gap-2"
                  :disabled="!request.idea.trim() || lyricsDraftLoading || promptFromLyricsLoading"
                  @click="generateLyricsDraft"
                >
                  <span v-if="lyricsDraftLoading" class="loading loading-spinner loading-xs"></span>
                  <font-awesome-icon v-else icon="feather-alt" class="w-3.5 h-3.5" />
                  {{ lyricsDraftLoading ? '写歌词中...' : '先生成歌词' }}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm gap-2"
                  :disabled="!editableLyrics.trim() || lyricsDraftLoading || promptFromLyricsLoading"
                  @click="generatePromptFromLyrics"
                >
                  <span v-if="promptFromLyricsLoading" class="loading loading-spinner loading-xs"></span>
                  <font-awesome-icon v-else icon="wand-magic-sparkles" class="w-3.5 h-3.5" />
                  {{ promptFromLyricsLoading ? '生成 Prompt 中...' : '歌词生成 Prompt' }}
                </button>
              </div>
            </div>

            <div v-if="lyricsDraft" class="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div class="rounded-lg border border-base-300/60 bg-base-100/70 p-3">
                <p class="text-xs text-base-content/40 mb-1">标题 / 概念</p>
                <p class="font-semibold">{{ lyricsDraft.title }}</p>
                <p class="text-xs text-base-content/60 mt-1 leading-relaxed">{{ lyricsDraft.concept }}</p>
              </div>
              <div class="rounded-lg border border-base-300/60 bg-base-100/70 p-3">
                <p class="text-xs text-base-content/40 mb-1">Hook / 情绪曲线</p>
                <p class="text-sm font-semibold">{{ lyricsDraft.hookLine }}</p>
                <p class="text-xs text-base-content/60 mt-1 leading-relaxed">{{ lyricsDraft.emotionCurve }}</p>
              </div>
              <div class="rounded-lg border border-base-300/60 bg-base-100/70 p-3">
                <p class="text-xs text-base-content/40 mb-1">传播片段</p>
                <p class="text-xs text-base-content/70 leading-relaxed">{{ lyricsDraft.shortVideoMoment }}</p>
              </div>
            </div>

            <label class="form-control">
              <span class="label py-1">
                <span class="label-text font-medium text-sm">可编辑歌词</span>
                <span class="label-text-alt text-xs text-base-content/40">这里的文本会作为 Prompt 生成依据</span>
              </span>
              <textarea
                v-model="editableLyrics"
                class="textarea textarea-bordered min-h-72 leading-7 text-sm font-mono"
                placeholder="点击「先生成歌词」后会填入草稿；也可以直接粘贴你已有的歌词，再点击「歌词生成 Prompt」。"
              />
            </label>

            <div v-if="lyricsDraft?.revisionSuggestions.length" class="flex flex-wrap gap-1.5">
              <button
                v-for="item in lyricsDraft.revisionSuggestions"
                :key="item"
                type="button"
                class="btn btn-ghost btn-xs"
                @click="request.iterationInstruction = item"
              >
                {{ item }}
              </button>
            </div>
          </section>

          <p v-if="error" class="text-error text-sm font-medium">{{ error }}</p>
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
              <div
                v-if="result.qualityChecks.length > 0 || result.revisionSuggestions.length > 0"
                class="grid grid-cols-1 xl:grid-cols-2 gap-4"
              >
                <div v-if="result.qualityChecks.length > 0" class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                  <h4 class="font-semibold mb-2">质量检查</h4>
                  <ul class="space-y-1.5 text-sm text-base-content/70">
                    <li v-for="item in result.qualityChecks" :key="item" class="flex gap-2">
                      <font-awesome-icon icon="check-circle" class="w-3.5 h-3.5 mt-1 text-success shrink-0" />
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                </div>

                <div v-if="result.revisionSuggestions.length > 0" class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                  <h4 class="font-semibold mb-2">下一步建议</h4>
                  <div class="flex flex-wrap gap-1.5 mb-3">
                    <button
                      v-for="item in result.revisionSuggestions"
                      :key="item"
                      type="button"
                      class="btn btn-outline btn-neutral btn-xs"
                      @click="iterateWithInstruction(item)"
                    >
                      {{ item }}
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button" class="btn btn-ghost btn-xs" @click="iterateWithInstruction('只重写副歌，主歌叙事和整体风格保持不变。')">重写副歌</button>
                    <button type="button" class="btn btn-ghost btn-xs" @click="iterateWithInstruction('保留歌词，只优化音乐 AI prompt 和制作描述。')">只改 Prompt</button>
                    <button type="button" class="btn btn-ghost btn-xs" @click="iterateWithInstruction('压缩为短视频版本，副歌更早进入，保留最抓耳的 30-60 秒。')">短视频版</button>
                    <button type="button" class="btn btn-ghost btn-xs" @click="iterateWithInstruction('降低 AI 味，歌词更像真实生活表达，减少空泛形容词。')">降低 AI 味</button>
                  </div>
                </div>
              </div>

              <div v-if="result.variants.length > 0" class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                <h4 class="font-semibold mb-3">可继续打磨的方向</h4>
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  <button
                    v-for="variant in result.variants"
                    :key="variant.title"
                    type="button"
                    class="text-left rounded-lg border border-base-300/60 bg-base-100/70 p-3 hover:bg-base-100 transition-colors"
                    @click="continueWithVariant(variant)"
                  >
                    <span class="font-semibold text-sm">{{ variant.title }}</span>
                    <p class="text-xs text-base-content/60 mt-1 leading-relaxed">{{ variant.direction }}</p>
                    <p class="text-xs text-primary mt-2 line-clamp-2">{{ variant.hookLine }}</p>
                  </button>
                </div>
              </div>

              <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold">歌词</h4>
                  <div class="flex flex-wrap justify-end gap-1.5">
                    <button type="button" class="btn btn-primary btn-xs gap-1" @click="copyText('纯歌词', lyricText)">
                      <font-awesome-icon :icon="copied === '纯歌词' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === '纯歌词' ? '已复制' : '纯歌词' }}
                    </button>
                    <button type="button" class="btn btn-ghost btn-xs gap-1" @click="copyText('歌词', result.lyrics)">
                      <font-awesome-icon :icon="copied === '歌词' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === '歌词' ? '已复制' : '原始歌词' }}
                    </button>
                  </div>
                </div>
                <pre class="whitespace-pre-wrap break-words text-sm leading-7 font-mono">{{ lyricText }}</pre>
              </div>

              <div class="rounded-xl border border-base-300/60 bg-base-200/30 p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold">Prompt</h4>
                  <div class="flex flex-wrap justify-end gap-1.5">
                    <button type="button" class="btn btn-primary btn-xs gap-1" @click="copyText('Prompt 全部', promptText)">
                      <font-awesome-icon :icon="copied === 'Prompt 全部' ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === 'Prompt 全部' ? '已复制' : '全部' }}
                    </button>
                    <button
                      v-for="option in platformCopyOptions"
                      :key="option.label"
                      type="button"
                      class="btn btn-outline btn-neutral btn-xs gap-1"
                      @click="copyText(option.label, platformPromptText(option.key))"
                    >
                      <font-awesome-icon :icon="copied === option.label ? 'check' : 'copy'" class="w-3 h-3" />
                      {{ copied === option.label ? '已复制' : option.label }}
                    </button>
                  </div>
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
