import type { HitExperimentRecord, HitIntelligenceState, HitLearnedProfile, HitExperimentVariant, PublishMetricRecord } from './types'

function addWeight(target: Map<string, number>, label: string, value: number) {
  const normalized = label.trim()
  if (normalized) target.set(normalized, (target.get(normalized) || 0) + value)
}

function ranked(map: Map<string, number>) {
  return [...map.entries()]
    .map(([label, weight]) => ({ label, weight: Math.round(weight * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12)
}

export function buildLearnedProfile(state: HitIntelligenceState, experiments: HitExperimentRecord[], now = Date.now()): HitLearnedProfile {
  const positive = new Map<string, number>()
  const negative = new Map<string, number>()

  for (const reference of state.tasteReferences) {
    const target = reference.preference === '喜欢' ? positive : negative
    for (const aspect of reference.aspects) addWeight(target, aspect, 2)
    addWeight(target, reference.note, 0.5)
  }

  for (const experiment of experiments) {
    for (const round of experiment.rounds) {
      for (const variant of round.variants) {
        addWeight(positive, variant.wins > variant.losses ? variant.hookLine : '', Math.max(0, variant.wins - variant.losses) * 0.5)
        addWeight(negative, variant.eliminationReason, variant.status === 'eliminated' ? 1.5 : 0)
        for (const external of variant.externalGenerations || []) {
          if (external.firstImpression === '想继续听') addWeight(positive, external.strongestPart, 1)
          if (external.hookVerdict === '成立') addWeight(positive, external.keep, 1)
          if (external.firstImpression === '想跳过' || external.hookVerdict === '不成立') addWeight(negative, external.biggestProblem, 1)
          addWeight(negative, external.change, external.advanceToNextRound ? 0.25 : 0.5)
        }
      }
    }
  }

  for (const metric of state.publishMetrics) {
    const peers = state.publishMetrics.filter(item => item.id !== metric.id)
    const baseline = accountBaseline(peers, metric.account, metric.platform)
    if (!baseline) continue
    const delta = engagementScore(metric) - baseline
    addWeight(delta >= 0 ? positive : negative, `${metric.platform}发布/${metric.variantTitle}`, Math.min(3, Math.abs(delta) / 10))
  }

  const positiveSignals = ranked(positive)
  const negativeSignals = ranked(negative)
  const validTrends = state.trendSamples.filter(item => item.expiresAt > now).sort((a, b) => b.observedAt - a.observedAt)
  const strategyText = [
    positiveSignals.length ? `历史偏好：${positiveSignals.slice(0, 6).map(item => item.label).join('；')}` : '',
    negativeSignals.length ? `明确避雷：${negativeSignals.slice(0, 6).map(item => item.label).join('；')}` : '',
    validTrends.length ? `有效趋势结构：${validTrends.slice(0, 4).map(item => `${item.platform}/${item.title}（${item.hookEntrySeconds}s 入 Hook，熟悉：${item.familiarElement}，意外：${item.surpriseElement}）`).join('；')}` : ''
  ].filter(Boolean).join('\n')

  return { positiveSignals, negativeSignals, validTrends, strategyText }
}

export function updateElo(winner: HitExperimentVariant, loser: HitExperimentVariant, k = 24): [number, number] {
  const expectedWinner = 1 / (1 + 10 ** ((loser.eloRating - winner.eloRating) / 400))
  const delta = Math.round(k * (1 - expectedWinner))
  return [winner.eloRating + delta, loser.eloRating - delta]
}

export function engagementScore(record: PublishMetricRecord): number {
  if (record.views <= 0) return 0
  const interactions = record.likes + record.favorites * 2 + record.comments * 1.5 + record.shares * 3 + record.musicUses * 5
  return Math.round((record.completionRate * 0.5 + Math.min(100, interactions / record.views * 100) * 0.5) * 100) / 100
}

export function accountBaseline(records: PublishMetricRecord[], account: string, platform: string): number {
  const scores = records.filter(item => item.account === account && item.platform === platform).map(engagementScore).sort((a, b) => a - b)
  if (!scores.length) return 0
  const middle = Math.floor(scores.length / 2)
  return scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2
}
