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
  { id: 'work', label: '工作与通勤', brief: '职场、通勤、下班后的真实处境；只有抽中本类别时才允许使用打工人题材' },
  { id: 'childhood', label: '童年与游戏', brief: '童年游戏、放学路、旧玩具、第一次独立完成某件事；避免统一写成怀旧滤镜' },
  { id: 'parenting', label: '育儿与共同成长', brief: '孩子与照顾者互相改变的具体瞬间；避免歌颂牺牲或制造育儿焦虑' },
  { id: 'elderly', label: '银发生活', brief: '老年人的友情、爱好、学习、旅行和独立生活；不要只写衰老、疾病或被照顾' },
  { id: 'pets', label: '宠物与动物伙伴', brief: '人与宠物的日常默契，也可以从动物视角叙事；避免单纯卖萌或煽情离别' },
  { id: 'neighbors', label: '邻里与社区', brief: '楼道、菜市场、小区、公园中的熟悉陌生人和社区关系；避免转成都市孤独套路' },
  { id: 'strangers', label: '陌生人的短暂交集', brief: '偶遇、善意、误会或一次没有后续的共同经历；不要强行发展成爱情' },
  { id: 'sports', label: '运动与身体现场', brief: '跑步、球场、游泳、骑行、攀登中的身体感和团队关系；避免口号式热血励志' },
  { id: 'dance', label: '舞蹈与动作表达', brief: '身体动作、排练、节拍和空间关系；创意要天然支持动作、卡点或群体参与' },
  { id: 'craft', label: '手艺与劳动之美', brief: '木工、修理、烹饪、缝纫、陶艺等具体手艺过程；聚焦声音、动作和专注感' },
  { id: 'hobby', label: '爱好与微小执着', brief: '钓鱼、摄影、种花、拼图、观鸟等非功利爱好；避免写成成功学或自我提升' },
  { id: 'collection', label: '收藏与旧物', brief: '票根、磁带、邮票、旧衣、照片等物件承载的个人秩序；不要只做复古词汇堆砌' },
  { id: 'festival', label: '节日与仪式', brief: '传统节日、生日、婚礼、毕业或自创仪式中的真实细节；避免标准祝福歌和宏大团圆' },
  { id: 'dialect', label: '方言与地域声音', brief: '方言语气、地方叫卖、戏曲声腔或地域节奏；使用可理解的生活表达，避免符号化奇观' },
  { id: 'folklore', label: '民俗与地方传说', brief: '地方传说、庙会、节气和口述故事的当代转译；避免古风辞藻和典故堆砌' },
  { id: 'rural', label: '乡村与土地', brief: '农事、土地、水渠、集市和乡村新生活；不默认贫困、离乡或田园滤镜' },
  { id: 'ocean', label: '海洋与水边生活', brief: '渔港、渡船、潮汐、河岸、湖边和水上职业；避免只写海风、日落和想念' },
  { id: 'mountain', label: '山地与高处', brief: '山路、村落、云雾、攀登和高海拔生活；强调空间、呼吸和声音，不写旅游宣传片' },
  { id: 'transport', label: '交通工具与移动空间', brief: '公交、轮渡、长途车、共享单车或驾驶中的偶发故事；禁止默认写通勤和下班疲惫' },
  { id: 'night_market', label: '夜市与街头生活', brief: '摊贩、顾客、气味、灯光和街头表演形成的群像；避免深夜独处和便利店伤感' },
  { id: 'small_shop', label: '小店与个体经营', brief: '理发店、修鞋铺、花店、早餐摊等小生意中的人物关系；避免创业鸡汤和经营焦虑' },
  { id: 'game', label: '游戏与虚拟共同体', brief: '游戏内协作、失败、身份和线上朋友；避免只罗列术语或写成电竞宣传曲' },
  { id: 'fandom', label: '舞台、观众与共同热爱', brief: '演出、应援、排队、散场和陌生人因作品相连；避免指向具体明星或复制饭圈口号' },
  { id: 'soundscape', label: '生活声音采样', brief: '从雨棚、锅铲、球场、修理铺、车站广播等真实声音出发构建音乐 Hook' },
  { id: 'object_voice', label: '物件第一人称', brief: '让钥匙、旧手机、路灯、窗帘、行李箱等物件讲述见闻；必须保持具体且可共情' },
  { id: 'time', label: '时间与生活节律', brief: '早晨、午睡、倒计时、季节交替、重复的一周等时间感；避免感叹岁月和空泛人生哲理' },
  { id: 'memory', label: '记忆偏差与重构', brief: '同一件事被不同人记成不同版本，或记忆随时间改变；避免直接落入前任回忆' },
  { id: 'history', label: '历史中的普通一天', brief: '从普通人的衣食住行切入某个历史时期；不要写帝王将相、宏大叙事或知识点罗列' },
  { id: 'fantasy', label: '日常幻想与轻奇幻', brief: '现实生活中出现一条温和但明确的奇幻规则；世界观服务情绪，不堆设定名词' },
  { id: 'science_fiction', label: '近未来生活', brief: '未来家庭、交通、身体、工作或关系中的具体新习惯；避免霓虹都市和赛博朋克套壳' },
  { id: 'environment', label: '环境变化与共同家园', brief: '高温、迁徙、垃圾、物种和城市生态对日常生活的影响；避免环保口号和灾难煽情' },
  { id: 'healing', label: '康复与重新适应', brief: '生病、受伤或低谷后重新学习日常动作与关系；避免医学建议、苦难赞美和廉价励志' },
  { id: 'accessibility', label: '不同身体与感知方式', brief: '从听觉、视觉、行动或神经多样性的真实体验出发；尊重主体性，不消费困境' },
  { id: 'reunion', label: '重逢与重新认识', brief: '亲友、同学、队友多年后重逢时发现彼此变化；不要自动写成旧爱复合' },
  { id: 'farewell', label: '告别与生活继续', brief: '搬家、毕业、宠物离开、店铺关门等多种告别；重点是具体行动，不沉溺苦情' },
  { id: 'courage', label: '微小勇气与第一次', brief: '第一次独自出门、开口、登台、拒绝或重新尝试；避免英雄叙事和热血口号' },
  { id: 'quiet', label: '安静与留白', brief: '沉默、独处、无事发生的片刻如何承载关系和情绪；音乐上允许极简，但必须有声音记忆点' }
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
