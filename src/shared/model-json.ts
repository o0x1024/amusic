export function repairJsonLikeQuotes(input: string): string {
  let output = ''
  let inDouble = false
  let inSingle = false
  let escaped = false

  const nextSignificant = (start: number): string => {
    for (let index = start; index < input.length; index += 1) {
      if (!/\s/.test(input[index])) return input[index]
    }
    return ''
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (inDouble) {
      output += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inDouble = false
      continue
    }

    if (inSingle) {
      if (escaped) {
        if (char === "'") output += "'"
        else if (char === '"') output += '\\"'
        else output += `\\${char}`
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === "'" && /[,\]}:]/.test(nextSignificant(index + 1))) {
        output += '"'
        inSingle = false
      } else if (char === '"') {
        output += '\\"'
      } else if (char === '\n' || char === '\r') {
        output += '\\n'
      } else {
        output += char
      }
      continue
    }

    if (char === '"') {
      inDouble = true
      output += char
    } else if (char === "'") {
      inSingle = true
      output += '"'
    } else {
      output += char
    }
  }

  return output
}
