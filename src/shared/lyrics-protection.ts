import type { HitLyricProtection } from './types'

function lyricLines(value: string): string[] {
  return value
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^\[[^\]]+\]$/.test(line) && !/^\([^)]*\)$/.test(line))
}

export function protectedLyricsViolations(source: string, candidate: string, protection: HitLyricProtection): string[] {
  if (protection === '允许轻微润色' || protection === '允许深度改编') return []
  const sourceLines = lyricLines(source)
  const candidateLines = lyricLines(candidate)
  const sourceSet = new Set(sourceLines)
  return [...new Set(candidateLines.filter(line => !sourceSet.has(line)))]
}
