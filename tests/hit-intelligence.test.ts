import assert from 'node:assert/strict'
import test from 'node:test'
import { accountBaseline, buildLearnedProfile, engagementScore, updateElo } from '../src/shared/hit-intelligence.ts'
import type { HitExperimentRecord, HitExperimentVariant, HitIntelligenceState, HitLyricRouteCard, PublishMetricRecord } from '../src/shared/types.ts'
import { chooseNextTopic, IDEA_TOPICS, isTooSimilar, textSimilarity } from '../src/shared/idea-diversity.ts'
import { hasSufficientStrategyDiversity, mergeStrategyFields } from '../src/shared/hit-strategy.ts'
import type { HitLabRequest, HitStrategyCard } from '../src/shared/types.ts'
import { getCreationStageConfig, HIT_CREATION_STAGES } from '../src/shared/creation-stage.ts'
import { protectedLyricsViolations } from '../src/shared/lyrics-protection.ts'
import { hasSufficientLyricRouteDiversity, lyricRouteContext } from '../src/shared/hit-lyric-route.ts'
import { repairJsonLikeQuotes } from '../src/shared/model-json.ts'

function variant(rating: number): HitExperimentVariant {
  return { eloRating: rating } as HitExperimentVariant
}

test('Elo update rewards winner and preserves rating sum', () => {
  const winner = variant(1000)
  const loser = variant(1000)
  const [winnerRating, loserRating] = updateElo(winner, loser)
  assert.equal(winnerRating, 1012)
  assert.equal(loserRating, 988)
  assert.equal(winnerRating + loserRating, 2000)
})

test('engagement score weights high-intent actions', () => {
  const base = { views: 1000, completionRate: 60, likes: 10, favorites: 0, comments: 0, shares: 0, musicUses: 0 } as PublishMetricRecord
  const shared = { ...base, shares: 20 }
  assert.ok(engagementScore(shared) > engagementScore(base))
})

test('account baseline uses median from matching account and platform', () => {
  const records = [40, 60, 80].map((completionRate, index) => ({ id: String(index), account: 'A', platform: '抖音', views: 100, completionRate, likes: 0, favorites: 0, comments: 0, shares: 0, musicUses: 0 } as PublishMetricRecord))
  assert.equal(accountBaseline(records, 'A', '抖音'), 30)
})

test('expired trends do not enter learned strategy', () => {
  const now = 1_000_000
  const state: HitIntelligenceState = {
    tasteReferences: [{ id: '1', createdAt: now, title: '参考', preference: '喜欢', aspects: ['旋律抓耳'], note: '' }],
    publishMetrics: [],
    recentIdeas: [],
    trendSamples: [
      { id: 'old', createdAt: 0, platform: '抖音', title: '旧趋势', observedAt: 0, expiresAt: now - 1, hookEntrySeconds: 3, hookLengthSeconds: 15, bpm: 100, vocalPersona: '', useCases: [], familiarElement: '', surpriseElement: '', note: '' },
      { id: 'new', createdAt: now, platform: '抖音', title: '新趋势', observedAt: now, expiresAt: now + 1, hookEntrySeconds: 2, hookLengthSeconds: 12, bpm: 105, vocalPersona: '', useCases: [], familiarElement: '口语', surpriseElement: '停顿', note: '' }
    ]
  }
  const profile = buildLearnedProfile(state, [], now)
  assert.equal(profile.validTrends.length, 1)
  assert.match(profile.strategyText, /新趋势/)
  assert.doesNotMatch(profile.strategyText, /旧趋势/)
})

test('topic lottery excludes recent categories before sampling', () => {
  const topic = chooseNextTopic(['family', 'friendship', 'county', 'campus', 'travel'], () => 0)
  assert.ok(!['family', 'friendship', 'county', 'campus', 'travel'].includes(topic.id))
})

test('idea topic catalog is broad and has unique identifiers', () => {
  assert.ok(IDEA_TOPICS.length >= 40)
  assert.equal(new Set(IDEA_TOPICS.map(topic => topic.id)).size, IDEA_TOPICS.length)
  assert.equal(new Set(IDEA_TOPICS.map(topic => topic.label)).size, IDEA_TOPICS.length)
})

test('idea similarity detects paraphrased repeated scenes', () => {
  const previous = '深夜加班后一个人坐在便利店门口吃关东煮'
  const repeated = '深夜加班，一个人在便利店门口继续吃关东煮'
  assert.ok(textSimilarity(previous, repeated) > 0.32)
  assert.equal(isTooSimilar(repeated, [previous]), true)
})

test('strategy merge preserves locked beginner decisions', () => {
  const current = { audience: '锁定听众', emotionalCore: '旧情绪', styleBlend: '旧风格', hookType: '旧Hook', lyricAngle: '旧角度' } as HitLabRequest
  const card = { audience: '新听众', emotionalCore: '新情绪', styleBlend: '新风格', hookType: '新Hook', lyricAngle: '新角度' } as HitStrategyCard
  const merged = mergeStrategyFields(current, card, ['audience', 'hookType'])
  assert.equal(merged.audience, undefined)
  assert.equal(merged.hookType, undefined)
  assert.equal(merged.styleBlend, '新风格')
})

test('strategy diversity requires distinct strengths, hooks and production plans', () => {
  const cards = ['歌词', '旋律', '声音', '卡点'].map((value, index) => ({ primaryStrength: value, hookType: `Hook${index}`, styleBlend: `Style${index}`, signatureSound: `Sound${index}`, hookEntrySeconds: index + 1 } as HitStrategyCard))
  assert.equal(hasSufficientStrategyDiversity(cards), true)
  assert.equal(hasSufficientStrategyDiversity(cards.map(card => ({ ...card, hookType: '相同Hook' }))), false)
  assert.equal(hasSufficientStrategyDiversity(cards.map(card => ({ ...card, signatureSound: '相同声音', hookEntrySeconds: 3 }))), false)
})

test('short-song stages expose distinct structures and loop requirements', () => {
  assert.equal(HIT_CREATION_STAGES.length, 5)
  assert.equal(getCreationStageConfig('15秒循环').requiresLoop, true)
  assert.match(getCreationStageConfig('30秒短单曲').structure, /27–30s 回环/)
  assert.match(getCreationStageConfig('90秒微型歌曲').structure, /75–90s 最终 Hook/)
  assert.equal(getCreationStageConfig('60秒微型歌曲').value, '90秒微型歌曲')
  assert.equal(getCreationStageConfig('完整化').requiresLoop, false)
})

test('locked lyrics reject rewritten lines but allow reordering', () => {
  const source = '[Verse]\n第一句原文\n第二句原文\n[Chorus]\n核心句原文'
  assert.deepEqual(protectedLyricsViolations(source, '[Hook]\n第二句原文\n核心句原文', '原文锁定'), [])
  assert.ok(protectedLyricsViolations(source, '被修改的新句子', '原文锁定').length > 0)
  assert.deepEqual(protectedLyricsViolations(source, '核心句原文\n第一句原文', '原文锁定'), [])
  assert.deepEqual(protectedLyricsViolations(source, '核心句原文\n第一句原文', '允许删减重排'), [])
})

test('lyric route cards require four distinct narrative engines and hook blueprints', () => {
  const ids: HitLyricRouteCard['id'][] = ['scene', 'dialogue', 'metaphor', 'declaration']
  const cards = ids.map((id, index) => ({
    id,
    title: `路线${index}`,
    positioning: `定位${index}`,
    narrativeMode: `叙事${index}`,
    hookBlueprint: `骨架${index}`,
    centralImage: `意象${index}`,
    emotionalParadox: '平静但不甘',
    hookSpeechAct: '自我确认',
    specificDetails: ['锅铲声', '五点钟'],
    perspectiveDistance: '弱人称绑定',
    repeatPattern: '复唱时改尾句',
    storyProgression: '动作到判断',
    clicheRisks: [],
    derivativeSimilarityRisks: [],
    openingScene: '清晨开门',
    routePlan: '场景到Hook',
    advantages: [],
    risks: []
  })) as HitLyricRouteCard[]
  assert.equal(hasSufficientLyricRouteDiversity(cards), true)
  assert.equal(hasSufficientLyricRouteDiversity(cards.map(card => ({ ...card, narrativeMode: '相同叙事' }))), false)
  assert.match(lyricRouteContext(cards[0]), /中心意象：意象0/)
})

test('model JSON repair converts mixed Python-style string quotes safely', () => {
  const mixed = `{"clicheRisks":["鸡汤式结论", '为反转而反转'], 'summary':'worker\\'s route'}`
  assert.deepEqual(JSON.parse(repairJsonLikeQuotes(mixed)), {
    clicheRisks: ['鸡汤式结论', '为反转而反转'],
    summary: "worker's route"
  })
})

test('learned profile stores transferable lyric structure instead of raw winning hook', () => {
  const structured = {
    ...variant(1000),
    id: 'v1',
    hookLine: '不要把这句原文记进偏好',
    wins: 3,
    losses: 0,
    status: 'winner',
    eliminationReason: '',
    externalGenerations: [],
    narrativeMode: '场景切片',
    perspectiveDistance: '弱人称绑定',
    hookSpeechAct: '祝福',
    repeatPattern: '尾句升级',
    clicheRisks: []
  } as HitExperimentVariant
  const experiment = { rounds: [{ variants: [structured] }] } as HitExperimentRecord
  const state: HitIntelligenceState = { tasteReferences: [], trendSamples: [], publishMetrics: [], recentIdeas: [] }
  const profile = buildLearnedProfile(state, [experiment])
  assert.match(profile.strategyText, /歌词结构：场景切片 \+ 弱人称绑定 \+ 祝福/)
  assert.doesNotMatch(profile.strategyText, /不要把这句原文/)
})
