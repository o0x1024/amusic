function escapeControlCharactersInStrings(text: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (const character of text) {
    if (!inString) {
      result += character
      if (character === '"') inString = true
      continue
    }

    if (escaped) {
      result += character
      escaped = false
      continue
    }

    if (character === '\\') {
      result += character
      escaped = true
      continue
    }

    if (character === '"') {
      result += character
      inString = false
      continue
    }

    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint <= 0x1f) {
      result += `\\u${codePoint.toString(16).padStart(4, '0')}`
      continue
    }

    result += character
  }

  return result
}

export function parseModelJson(text: string): unknown {
  const normalized = escapeControlCharactersInStrings(text.trim())

  try {
    return JSON.parse(normalized)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`模型返回的 JSON 格式无效：${detail}`)
  }
}
