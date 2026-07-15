import assert from 'node:assert/strict'
import test from 'node:test'
import type { HitLabVariant } from '../src/shared/types.ts'
import { creationContractErrors, evaluationContractErrors, hitLabCandidateId, mergeHitLabEvaluation } from '../src/main/hit-lab-contract.ts'

const scores = {
  hookCompression: 0,
  specificity: 70,
  conversationalNaturalness: 71,
  narrativeProgression: 72,
  singability: 73,
  quoteDesire: 74,
  remixOpenness: 75,
  fullSongExpansion: 76
}

function evaluation(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: 'candidate-1',
    lyricScores: { ...scores },
    douyinScore: 80,
    qishuiScore: 81,
    memorabilityScore: 82,
    spreadPotential: '短句适合复用',
    shortVideoUseCases: ['转场', '穿搭', '日常记录'],
    riskNotes: ['表达可能过直', '旋律依赖较强'],
    iterationAdvice: '压缩第二句',
    ...overrides
  }
}

test('candidate ids are deterministic and reject cross-wired responses', () => {
  assert.equal(hitLabCandidateId(2), 'candidate-3')
  assert.deepEqual(evaluationContractErrors(evaluation(), 'candidate-2'), ['candidateId=candidate-2'])
})

test('evaluation rejects fields owned by creation', () => {
  assert.ok(evaluationContractErrors(evaluation({ lyrics: '越权改词' }), 'candidate-1').includes('禁止字段:lyrics'))
})

test('evaluation requires every lyric score but accepts a real zero score', () => {
  assert.deepEqual(evaluationContractErrors(evaluation(), 'candidate-1'), [])
  const incomplete = evaluation({ lyricScores: { ...scores, singability: undefined } })
  assert.ok(evaluationContractErrors(incomplete, 'candidate-1').includes('lyricScores.singability'))
})

test('creation rejects evaluation fields and duplicate details', () => {
  const candidate = {
    candidateId: 'candidate-1',
    centralImage: '护腕',
    emotionalParadox: '想保护却留不住',
    narrativeMode: '物件第一人称',
    hookSpeechAct: '告别',
    perspectiveDistance: '第一人称近景',
    repeatPattern: '第二次改变落点',
    storyProgression: '出现、磨损、告别',
    specificDetails: ['线头', '线头'],
    lyricScores: scores
  }
  const errors = creationContractErrors(candidate, 'candidate-1')
  assert.ok(errors.includes('禁止字段:lyricScores'))
  assert.ok(errors.includes('specificDetails 至少需要 2 个不同的非空字符串，实际有效数量 1'))
})

test('creation reports the actual type when specific details are serialized as text', () => {
  const errors = creationContractErrors({
    candidateId: 'candidate-1',
    centralImage: '护腕',
    emotionalParadox: '想保护却留不住',
    narrativeMode: '物件第一人称',
    hookSpeechAct: '告别',
    perspectiveDistance: '第一人称近景',
    repeatPattern: '第二次改变落点',
    storyProgression: '出现、磨损、告别',
    specificDetails: '1. 松开的魔术贴；2. 汗渍留下的白边'
  }, 'candidate-1')

  assert.ok(errors.includes('specificDetails 必须是 JSON 字符串数组，实际收到 string'))
})

test('evaluation merge cannot overwrite lyrics or title', () => {
  const candidate = { title: '护腕', lyrics: '原歌词' } as HitLabVariant
  const merged = mergeHitLabEvaluation(candidate, evaluation({ title: '越权标题', lyrics: '越权歌词' }))
  assert.equal(merged.title, '护腕')
  assert.equal(merged.lyrics, '原歌词')
  assert.equal(merged.lyricScores.hookCompression, 0)
})
