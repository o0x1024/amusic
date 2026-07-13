import type { HitCreationStage } from './types'

export interface HitCreationStageConfig {
  value: HitCreationStage
  label: string
  durationLabel: string
  description: string
  requiresLoop: boolean
  structure: string
}

export const HIT_CREATION_STAGES: HitCreationStageConfig[] = [
  { value: 'Hook探索', label: '探索 8–20 秒 Hook', durationLabel: '8–20s', description: '只验证核心句、旋律入口和声音人格', requiresLoop: false, structure: '抓手 → 核心 Hook' },
  { value: '15秒循环', label: '15 秒循环', durationLabel: '15s', description: '卡点、转场和一句话表达，结尾无缝接回开头', requiresLoop: true, structure: '0–1s 标志声音 → 1–3s 建立身份 → 3–12s Hook → 12–15s 回环' },
  { value: '30秒短单曲', label: '30 秒短单曲', durationLabel: '30s', description: '最推荐的短视频完整情绪闭环', requiresLoop: true, structure: '0–3s 抓手 → 3–8s 预 Hook → 8–23s 核心 Hook → 23–27s 复唱变体 → 27–30s 回环' },
  { value: '60秒微型歌曲', label: '60 秒微型歌曲', durationLabel: '45–60s', description: '兼顾短视频传播与汽水完整收听', requiresLoop: false, structure: '0–3s 入口 → 3–13s 极短主歌 → 13–18s 预副歌 → 18–35s Hook → 35–45s 变体 → 45–60s 最终 Hook' },
  { value: '完整化', label: '完整歌曲', durationLabel: '2–3min', description: '围绕胜出 Hook 扩展完整主歌、桥段和最终副歌', requiresLoop: false, structure: 'Intro → Verse → Pre-Chorus → Chorus → Verse → Bridge → Final Chorus → Outro' }
]

export function getCreationStageConfig(stage?: HitCreationStage): HitCreationStageConfig {
  return HIT_CREATION_STAGES.find(item => item.value === stage) || HIT_CREATION_STAGES[0]
}
