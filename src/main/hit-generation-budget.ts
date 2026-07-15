import type { HitCreationStage } from '../shared/types'

const MAX_OUTPUT_TOKENS = 32768
const BASE_OUTPUT_TOKENS = 800
const TOKENS_PER_VARIANT: Record<HitCreationStage, number> = {
  Hook探索: 1800,
  '15秒循环': 1800,
  '30秒短单曲': 2000,
  '90秒微型歌曲': 3200,
  '60秒微型歌曲': 2500,
  完整化: 4000
}

export function hitLabOutputTokenBudget(
  configuredMaxTokens: number,
  versionCount: number,
  creationStage: HitCreationStage
): number {
  const requiredTokens = BASE_OUTPUT_TOKENS + versionCount * TOKENS_PER_VARIANT[creationStage]
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(configuredMaxTokens, requiredTokens))
}
