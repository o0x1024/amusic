import type { HitLabVariant } from '../shared/types'

const CREATION_FIELDS = new Set([
  'candidateId', 'title', 'positioning', 'targetPlatform', 'hookLine', 'firstThreeSeconds', 'introHook',
  'introTimeline', 'hookEntrySeconds', 'signatureSound', 'loopTransition', 'introRisks', 'targetDurationSeconds',
  'structurePlan', 'completenessTest', 'chorusSnippet', 'lyrics', 'centralImage', 'emotionalParadox',
  'narrativeMode', 'hookSpeechAct', 'specificDetails', 'perspectiveDistance', 'repeatPattern', 'storyProgression',
  'clicheRisks', 'derivativeSimilarityRisks', 'stylePrompt', 'fullPrompt'
])

const REQUIRED_DNA_FIELDS = [
  'centralImage', 'emotionalParadox', 'narrativeMode', 'hookSpeechAct',
  'perspectiveDistance', 'repeatPattern', 'storyProgression'
] as const

export const HIT_LYRIC_SCORE_FIELDS = [
  'hookCompression', 'specificity', 'conversationalNaturalness', 'narrativeProgression',
  'singability', 'quoteDesire', 'remixOpenness', 'fullSongExpansion'
] as const

const EVALUATION_FIELDS = new Set([
  'candidateId', 'lyricScores', 'douyinScore', 'qishuiScore', 'memorabilityScore', 'spreadPotential',
  'shortVideoUseCases', 'riskNotes', 'iterationAdvice'
])

export function hitLabCandidateId(index: number): string {
  return `candidate-${index + 1}`
}

export function creationContractErrors(value: unknown, candidateId: string): string[] {
  if (!value || typeof value !== 'object') return ['candidate']
  const candidate = value as Record<string, unknown>
  const errors: string[] = []
  if (candidate.candidateId !== candidateId) errors.push(`candidateId=${candidateId}`)
  for (const field of Object.keys(candidate)) {
    if (!CREATION_FIELDS.has(field)) errors.push(`禁止字段:${field}`)
  }
  for (const field of REQUIRED_DNA_FIELDS) {
    if (typeof candidate[field] !== 'string' || !candidate[field].trim()) errors.push(field)
  }
  if (!Array.isArray(candidate.specificDetails)) {
    errors.push(`specificDetails 必须是 JSON 字符串数组，实际收到 ${typeof candidate.specificDetails}`)
  } else {
    const details = candidate.specificDetails.filter(item => typeof item === 'string' && item.trim())
    const uniqueDetails = new Set(details.map(item => item.trim()))
    if (uniqueDetails.size < 2) {
      errors.push(`specificDetails 至少需要 2 个不同的非空字符串，实际有效数量 ${uniqueDetails.size}`)
    }
  }
  return errors
}

function validScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= 100
}

export function evaluationContractErrors(value: unknown, candidateId: string): string[] {
  if (!value || typeof value !== 'object') return ['evaluation']
  const evaluation = value as Record<string, unknown>
  const errors: string[] = []
  if (evaluation.candidateId !== candidateId) errors.push(`candidateId=${candidateId}`)
  for (const field of Object.keys(evaluation)) {
    if (!EVALUATION_FIELDS.has(field)) errors.push(`禁止字段:${field}`)
  }
  const scores = evaluation.lyricScores
  if (!scores || typeof scores !== 'object') {
    errors.push('lyricScores')
  } else {
    const scoreRecord = scores as Record<string, unknown>
    for (const field of HIT_LYRIC_SCORE_FIELDS) {
      if (!validScore(scoreRecord[field])) errors.push(`lyricScores.${field}`)
    }
    for (const field of Object.keys(scoreRecord)) {
      if (!HIT_LYRIC_SCORE_FIELDS.includes(field as typeof HIT_LYRIC_SCORE_FIELDS[number])) errors.push(`禁止字段:lyricScores.${field}`)
    }
  }
  for (const field of ['douyinScore', 'qishuiScore', 'memorabilityScore'] as const) {
    if (!validScore(evaluation[field])) errors.push(field)
  }
  for (const field of ['spreadPotential', 'iterationAdvice'] as const) {
    if (typeof evaluation[field] !== 'string' || !evaluation[field].trim()) errors.push(field)
  }
  if (!Array.isArray(evaluation.shortVideoUseCases) || evaluation.shortVideoUseCases.length < 3 || evaluation.shortVideoUseCases.length > 5) {
    errors.push('shortVideoUseCases[3..5]')
  }
  if (!Array.isArray(evaluation.riskNotes) || evaluation.riskNotes.length < 2 || evaluation.riskNotes.length > 4) {
    errors.push('riskNotes[2..4]')
  }
  return errors
}

export function mergeHitLabEvaluation(candidate: HitLabVariant, value: unknown): HitLabVariant {
  const evaluation = value as Record<string, unknown>
  const scores = evaluation.lyricScores as HitLabVariant['lyricScores']
  return {
    ...candidate,
    lyricScores: { ...scores },
    douyinScore: evaluation.douyinScore as number,
    qishuiScore: evaluation.qishuiScore as number,
    memorabilityScore: evaluation.memorabilityScore as number,
    spreadPotential: (evaluation.spreadPotential as string).trim(),
    shortVideoUseCases: [...evaluation.shortVideoUseCases as string[]],
    riskNotes: [...evaluation.riskNotes as string[]],
    iterationAdvice: (evaluation.iterationAdvice as string).trim()
  }
}
