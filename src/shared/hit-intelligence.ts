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

function lyricStructureLabels(variant: HitExperimentVariant): string[] {
  return [
    variant.narrativeMode && `叙事引擎：${variant.narrativeMode}`,
    variant.perspectiveDistance && `人称距离：${variant.perspectiveDistance}`,
    variant.hookSpeechAct && `Hook动作：${variant.hookSpeechAct}`,
    variant.repeatPattern && `重复方式：${variant.repeatPattern}`,
    variant.narrativeMode && variant.perspectiveDistance && variant.hookSpeechAct
      ? `歌词结构：${variant.narrativeMode} + ${variant.perspectiveDistance} + ${variant.hookSpeechAct}`
      : ''
  ].filter((item): item is string => Boolean(item))
}

export function buildLearnedProfile(state: HitIntelligenceState, experiments: HitExperimentRecord[], now = Date.now()): HitLearnedProfile {
  const positive = new Map<string, number>()
  const negative = new Map<string, number>()
  const variantsById = new Map(experiments.flatMap(experiment => experiment.rounds.flatMap(round => round.variants.map(variant => [variant.id, variant] as const))))

  for (const reference of state.tasteReferences) {
    const target = reference.preference === '喜欢' ? positive : negative
    for (const aspect of reference.aspects) addWeight(target, aspect, 2)
    addWeight(target, reference.note, 0.5)
  }

  for (const experiment of experiments) {
    for (const round of experiment.rounds) {
      for (const variant of round.variants) {
        const winWeight = Math.max(0, variant.wins - variant.losses) * 0.5
        if (winWeight > 0) {
          for (const label of lyricStructureLabels(variant)) addWeight(positive, label, winWeight)
        }
        addWeight(negative, variant.eliminationReason, variant.status === 'eliminated' ? 1.5 : 0)
        if (variant.status === 'eliminated') {
          for (const risk of variant.clicheRisks || []) addWeight(negative, `陈词风险：${risk}`, 0.5)
        }
        for (const external of variant.externalGenerations || []) {
          if (external.firstImpression === '想继续听') addWeight(positive, external.strongestPart, 1)
          if (external.hookVerdict === '成立') addWeight(positive, external.keep, 1)
          if (external.firstImpression === '想跳过' || external.hookVerdict === '不成立') addWeight(negative, external.biggestProblem, 1)
          addWeight(negative, external.change, external.advanceToNextRound ? 0.25 : 0.5)
        }
      }
    }
    for (const feedback of experiment.feedback || []) {
      const winner = variantsById.get(feedback.winnerVariantId)
      if (!winner) continue
      const prefix = feedback.stage === 'audio' ? '音频盲测' : '歌词盲测'
      for (const label of lyricStructureLabels(winner)) addWeight(positive, `${prefix}/${label}`, 0.5)
    }
  }

  for (const metric of state.publishMetrics) {
    const peers = state.publishMetrics.filter(item => item.id !== metric.id)
    const baseline = accountBaseline(peers, metric.account, metric.platform)
    if (!baseline) continue
    const delta = engagementScore(metric) - baseline
    const target = delta >= 0 ? positive : negative
    const weight = Math.min(3, Math.abs(delta) / 10)
    const variant = variantsById.get(metric.variantId)
    if (variant) {
      for (const label of lyricStructureLabels(variant)) addWeight(target, `发布验证/${metric.platform}/${label}`, weight)
    } else {
      addWeight(target, `发布验证/${metric.platform}`, weight)
    }
  }

  const positiveSignals = ranked(positive)
  const negativeSignals = ranked(negative)
  const validTrends = state.trendSamples.filter(item => item.expiresAt > now).sort((a, b) => b.observedAt - a.observedAt)
  const strategyText = [
    positiveSignals.length ? `历史偏好：${positiveSignals.slice(0, 6).map(item => item.label).join('；')}` : '',
    negativeSignals.length ? `明确避雷：${negativeSignals.slice(0, 6).map(item => item.label).join('；')}` : '',
    validTrends.length ? `有效趋势结构：${validTrends.slice(0, 4).map(item => {
      const lyricShape = [item.narrativeMode, item.perspectiveDistance, item.hookSpeechAct].filter(Boolean).join(' + ')
      return `${item.platform}/${item.title}（${item.hookEntrySeconds}s 入 Hook${lyricShape ? `，歌词：${lyricShape}` : ''}${item.centralImage ? `，中心意象：${item.centralImage}` : ''}${item.specificDetailCount ? `，细节数：${item.specificDetailCount}` : ''}，熟悉：${item.familiarElement}，意外：${item.surpriseElement}）`
    }).join('；')}` : ''
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
