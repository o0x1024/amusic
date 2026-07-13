export interface IdeaTopic {
  id: string
  label: string
  brief: string
}

export const IDEA_TOPICS: IdeaTopic[] = [
  { id: 'family', label: '家庭与代际', brief: '亲情、代际沟通、家庭中的小误解或默契；避免苦情说教' },
  { id: 'friendship', label: '朋友与室友', brief: '朋友、室友、同学之间具体而微妙的关系；不要转成职场同事' },
  { id: 'county', label: '县城与故乡', brief: '县城生活、故乡变化、小地方的人情与空间记忆；避免泛泛乡愁' },
  { id: 'campus', label: '校园与青春现场', brief: '课堂、操场、宿舍、社团、毕业前后；不要默认写暗恋或失恋' },
  { id: 'travel', label: '旅行与陌生地方', brief: '旅途意外、临时同行、错过车站、陌生城市；突出移动感和新鲜画面' },
  { id: 'food', label: '食物与生活仪式', brief: '早餐、夜市、家常菜、季节味道及其承载的关系；不要写加班后的便利店' },
  { id: 'nature', label: '自然与季节', brief: '真实的天气、植物、动物、山海或四季变化；避免晚风落日式空泛氛围词堆砌' },
  { id: 'digital', label: '数字生活与AI', brief: '手机依赖、算法、AI陪伴、已读未回、虚拟身份；要有具体的新技术生活细节' },
  { id: 'comedy', label: '轻喜剧与荒诞', brief: '生活误会、反差、自嘲、黑色幽默；避免把笑点落回职场加班' },
  { id: 'dream', label: '梦境与非人称叙事', brief: '梦、未来、物件或非人称视角；允许实验性但必须有可记忆的核心句' },
  { id: 'romance', label: '当下关系与心动', brief: '正在发生的相遇、相处和暧昧；禁止前任、分手、失恋套路' },
  { id: 'self', label: '身体与自我成长', brief: '年龄、身体感受、习惯改变、与自己相处；避免反内耗鸡汤' },
  { id: 'city', label: '城市观察', brief: '街道、邻里、公共空间和陌生人观察；禁止地铁通勤、深夜加班和工位' },
  { id: 'work', label: '工作与通勤', brief: '职场、通勤、下班后的真实处境；只有抽中本类别时才允许使用打工人题材' }
]

function normalizedChars(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')
}

export function textSimilarity(left: string, right: string): number {
  const grams = (value: string) => {
    const chars = normalizedChars(value)
    const result = new Set<string>()
    for (let index = 0; index < chars.length - 1; index += 1) result.add(chars.slice(index, index + 2))
    return result
  }
  const a = grams(left)
  const b = grams(right)
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter(item => b.has(item)).length
  return intersection / (a.size + b.size - intersection)
}

export function isTooSimilar(candidate: string, recentIdeas: string[], threshold = 0.32): boolean {
  return recentIdeas.some(item => textSimilarity(candidate, item) >= threshold)
}

export function chooseNextTopic(recentCategoryIds: string[], random = Math.random): IdeaTopic {
  const excluded = new Set(recentCategoryIds.slice(0, Math.min(5, IDEA_TOPICS.length - 1)))
  const available = IDEA_TOPICS.filter(topic => !excluded.has(topic.id))
  const index = Math.min(available.length - 1, Math.floor(random() * available.length))
  return available[Math.max(0, index)]
}
