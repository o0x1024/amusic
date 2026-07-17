import assert from 'node:assert/strict'
import test from 'node:test'
import type { HitLabVariant } from '../src/shared/types.ts'
import { creationContractErrors, evaluationContractErrors, hitLabCandidateId, mergeHitLabEvaluation } from '../src/main/hit-lab-contract.ts'
import { openingMechanismForCandidate } from '../src/shared/hit-opening.ts'

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

test('automatic opening mechanisms diversify candidates while a fixed choice stays locked', () => {
  assert.notEqual(openingMechanismForCandidate('自动选择', 0), openingMechanismForCandidate('自动选择', 1))
  assert.equal(openingMechanismForCandidate('直接对话', 6), '直接对话')
})

test('creation requires the assigned opening mechanism', () => {
  const candidate = {
    candidateId: 'candidate-1',
    centralImage: '护腕',
    emotionalParadox: '想保护却留不住',
    narrativeMode: '物件第一人称',
    hookSpeechAct: '告别',
    openingMode: '动作现场',
    perspectiveDistance: '第一人称近景',
    repeatPattern: '第二次改变落点',
    storyProgression: '出现、磨损、告别',
    specificDetails: ['松开的魔术贴', '汗渍留下的白边']
  }
  assert.ok(creationContractErrors(candidate, 'candidate-1', '直接对话').includes('openingMode=直接对话'))
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
    openingMode: '中心意象',
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
    openingMode: '中心意象',
    perspectiveDistance: '第一人称近景',
    repeatPattern: '第二次改变落点',
    storyProgression: '出现、磨损、告别',
    specificDetails: '1. 松开的魔术贴；2. 汗渍留下的白边'
  }, 'candidate-1')

  assert.ok(errors.includes('specificDetails 必须是 JSON 字符串数组，实际收到 string'))
})

test('creation contract rejects omitted fields and incorrect scalar or array types', () => {
  const errors = creationContractErrors({
    candidateId: 'candidate-1',
    centralImage: '护腕',
    emotionalParadox: '想保护却留不住',
    narrativeMode: '物件第一人称',
    hookSpeechAct: '告别',
    openingMode: '中心意象',
    perspectiveDistance: '第一人称近景',
    repeatPattern: '第二次改变落点',
    storyProgression: '出现、磨损、告别',
    specificDetails: ['松开的魔术贴', '汗渍留下的白边'],
    hookEntrySeconds: '3',
    targetDurationSeconds: 0,
    introRisks: ['只有一个风险'],
    clicheRisks: [],
    derivativeSimilarityRisks: ['风险一', '风险二', '风险三', '风险四']
  }, 'candidate-1')

  assert.ok(errors.includes('title'))
  assert.ok(errors.includes('hookEntrySeconds[0..targetDurationSeconds]'))
  assert.ok(errors.includes('targetDurationSeconds(0..300]'))
  assert.ok(errors.includes('introRisks[2..3]'))
  assert.ok(errors.includes('clicheRisks[2..4]'))
  assert.ok(errors.includes('derivativeSimilarityRisks[1..3]'))
})

test('creation accepts a full-song hook after 30 seconds but rejects one after the song ends', () => {
  const fullSong = {
    candidateId: 'candidate-1',
    title: '旧鞋',
    positioning: '完整歌曲定位',
    targetPlatform: '汽水音乐',
    hookLine: '没关系',
    openingMode: '中心意象',
    firstThreeSeconds: '钢琴动机',
    introHook: '三音下行',
    introTimeline: '0-1s 钢琴；1-3s 鼓点；3-8s 和弦',
    hookEntrySeconds: 42,
    signatureSound: '三音钢琴',
    loopTransition: '尾音接回首音',
    introRisks: ['动机偏弱', '音色常见'],
    targetDurationSeconds: 150,
    structurePlan: '0-8s Intro；8-28s Verse；28-42s Pre-Chorus；42-62s Chorus',
    completenessTest: '情绪弧完整',
    chorusSnippet: '第一行\n第二行\n第三行\n第四行',
    lyrics: '[Verse]\n第一句\n第二句\n\n[Chorus]\n第三句\n第四句',
    centralImage: '旧鞋',
    emotionalParadox: '丧气却坚持',
    narrativeMode: '态度反转',
    hookSpeechAct: '自我确认',
    specificDetails: ['磨破的左鞋底', '绿色橡皮筋鞋带'],
    perspectiveDistance: '第一人称近景',
    repeatPattern: '第二次改变落点',
    storyProgression: '破损、犹豫、继续前进',
    clicheRisks: ['意象常见', '表达过直'],
    derivativeSimilarityRisks: ['励志结构常见'],
    stylePrompt: 'Lo-fi Hip Hop, 90 BPM',
    fullPrompt: '完整歌曲生成提示词'
  }

  assert.deepEqual(creationContractErrors(fullSong, 'candidate-1'), [])
  assert.ok(creationContractErrors({ ...fullSong, hookEntrySeconds: 151 }, 'candidate-1').includes('hookEntrySeconds[0..targetDurationSeconds]'))
})

test('evaluation merge cannot overwrite lyrics or title', () => {
  const candidate = { title: '护腕', lyrics: '原歌词' } as HitLabVariant
  const merged = mergeHitLabEvaluation(candidate, evaluation({ title: '越权标题', lyrics: '越权歌词' }))
  assert.equal(merged.title, '护腕')
  assert.equal(merged.lyrics, '原歌词')
  assert.equal(merged.lyricScores.hookCompression, 0)
})
