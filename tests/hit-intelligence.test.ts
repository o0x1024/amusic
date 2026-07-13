import assert from 'node:assert/strict'
import test from 'node:test'
import { accountBaseline, buildLearnedProfile, engagementScore, updateElo } from '../src/shared/hit-intelligence.ts'
import type { HitExperimentVariant, HitIntelligenceState, PublishMetricRecord } from '../src/shared/types.ts'

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
