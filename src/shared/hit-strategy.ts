import type { HitLabRequest, HitStrategyCard, HitStrategyField } from './types'

export const HIT_STRATEGY_FIELDS: HitStrategyField[] = ['audience', 'emotionalCore', 'styleBlend', 'hookType', 'lyricAngle']

export function mergeStrategyFields(current: HitLabRequest, card: HitStrategyCard, locked: HitStrategyField[]): Partial<HitLabRequest> {
  const result: Partial<HitLabRequest> = {}
  for (const field of HIT_STRATEGY_FIELDS) {
    if (!locked.includes(field)) result[field] = card[field]
  }
  return result
}

export function hasSufficientStrategyDiversity(cards: HitStrategyCard[]): boolean {
  if (cards.length < 4) return false
  const strengths = new Set(cards.map(card => card.primaryStrength.trim()).filter(Boolean))
  const hooks = new Set(cards.map(card => card.hookType.trim()).filter(Boolean))
  const styles = new Set(cards.map(card => card.styleBlend.trim()).filter(Boolean))
  const intros = new Set(cards.map(card => `${card.signatureSound}|${card.hookEntrySeconds}`).filter(Boolean))
  return strengths.size >= 3 && hooks.size >= 3 && styles.size >= 3 && intros.size >= 3
}
