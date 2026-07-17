import type { HitOpeningMode } from './types'

export const HIT_OPENING_MODES: HitOpeningMode[] = ['自动选择', '核心句直入', '动作现场', '直接对话', '中心意象', '反常判断', '声音拟声', '结果先行']

const AUTO_OPENINGS: Exclude<HitOpeningMode, '自动选择'>[] = ['核心句直入', '动作现场', '直接对话', '中心意象', '反常判断', '声音拟声', '结果先行']

export function openingMechanismForCandidate(mode: HitOpeningMode | undefined, index: number): Exclude<HitOpeningMode, '自动选择'> {
  if (mode && mode !== '自动选择') return mode
  return AUTO_OPENINGS[Math.abs(index) % AUTO_OPENINGS.length]
}
