import type { HitLyricRouteCard } from './types'

const REQUIRED_ROUTE_IDS = ['scene', 'dialogue', 'metaphor', 'declaration']

export function hasSufficientLyricRouteDiversity(cards: HitLyricRouteCard[]): boolean {
  if (cards.length !== 4) return false
  const ids = new Set(cards.map(card => card.id))
  const modes = new Set(cards.map(card => card.narrativeMode.trim()).filter(Boolean))
  const blueprints = new Set(cards.map(card => card.hookBlueprint.trim()).filter(Boolean))
  return REQUIRED_ROUTE_IDS.every(id => ids.has(id as HitLyricRouteCard['id']))
    && modes.size === 4
    && blueprints.size === 4
}

export function lyricRouteContext(card: HitLyricRouteCard): string {
  return [
    `路线：${card.title}（${card.narrativeMode}）`,
    `定位：${card.positioning}`,
    `中心意象：${card.centralImage}`,
    `情绪矛盾：${card.emotionalParadox}`,
    `Hook言语动作：${card.hookSpeechAct}`,
    `具体细节：${card.specificDetails.join('；')}`,
    `人称距离：${card.perspectiveDistance}`,
    `重复方式：${card.repeatPattern}`,
    `叙事推进：${card.storyProgression}`,
    `开场：${card.openingScene}`,
    `Hook骨架：${card.hookBlueprint}`,
    `路线规划：${card.routePlan}`,
    `陈词风险：${card.clicheRisks.join('；')}`,
    `相似风险：${card.derivativeSimilarityRisks.join('；')}`
  ].join('\n')
}
