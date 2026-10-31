import { formatIcuPluralMessage } from './icuPluralFormat.js'

/**
 * Production CSP forbids eval, so translations are interpolated here
 * instead of vue-i18n's default compiler.
 * Supports `{name}`, `{'literal'}`, `|` plurals, and `{n, plural, ...}`.
 */
export function cspSafeMessageCompiler(message, compileContext = {}) {
  if (typeof message !== 'string') {
    return () => ''
  }

  if (message.includes(', plural,')) {
    const locale = compileContext.locale || 'en'
    return (ctx) => {
      const text = formatIcuPluralMessage(message, locale, namedParamsFromMessage(message, ctx))
      return normalizeText(ctx, text)
    }
  }

  const branches = splitTopLevelPipes(message)
  if (branches.length > 1) {
    const compiled = branches.map((branch) => compileSequence(branch))
    return (ctx) => {
      const forms = compiled.map((render) => render(ctx))
      if (typeof ctx?.plural === 'function') return ctx.plural(forms)
      return forms[0]
    }
  }

  return compileSequence(message)
}

function compileSequence(message) {
  const tokens = parseMessage(message)
  return (ctx) => {
    const interpolate = typeof ctx?.interpolate === 'function'
      ? ctx.interpolate
      : (value) => (value == null ? '' : String(value))
    const named = typeof ctx?.named === 'function' ? ctx.named : () => ''
    const list = typeof ctx?.list === 'function' ? ctx.list : () => ''
    const parts = tokens.map((token) => {
      if (token.type === 'text') return token.value
      if (/^\d+$/.test(token.value)) return interpolate(list(Number(token.value)))
      return interpolate(named(token.value))
    })
    const normalize = typeof ctx?.normalize === 'function'
      ? ctx.normalize
      : (chunks) => chunks.join('')
    return normalize(parts.length ? parts : [''])
  }
}

function parseMessage(message) {
  const tokens = []
  let index = 0
  let text = ''
  const flush = () => {
    if (!text) return
    tokens.push({ type: 'text', value: text })
    text = ''
  }

  while (index < message.length) {
    if (message[index] !== '{') {
      text += message[index]
      index += 1
      continue
    }

    flush()
    if (message[index + 1] === "'") {
      const literal = readQuotedLiteral(message, index + 2)
      if (!literal) {
        text += message.slice(index)
        break
      }
      tokens.push({ type: 'text', value: literal.value })
      index = literal.next
      continue
    }

    const close = message.indexOf('}', index + 1)
    if (close < 0) {
      text += message.slice(index)
      break
    }
    tokens.push({ type: 'named', value: message.slice(index + 1, close).trim() })
    index = close + 1
  }

  flush()
  return tokens
}

function readQuotedLiteral(message, start) {
  let value = ''
  let index = start
  while (index < message.length) {
    if (message[index] === '\\' && index + 1 < message.length) {
      value += message[index + 1]
      index += 2
      continue
    }
    if (message[index] === "'" && message[index + 1] === '}') {
      return { value, next: index + 2 }
    }
    value += message[index]
    index += 1
  }
  return null
}

function splitTopLevelPipes(message) {
  const parts = []
  let depth = 0
  let buffer = ''
  for (const char of message) {
    if (char === '{') depth += 1
    else if (char === '}') depth = Math.max(0, depth - 1)
    if (char === '|' && depth === 0) {
      parts.push(buffer)
      buffer = ''
      continue
    }
    buffer += char
  }
  parts.push(buffer)
  return parts
}

function namedParamsFromMessage(message, ctx) {
  const params = {}
  if (typeof ctx?.named !== 'function') return params
  const pattern = /\{([^,}]+)/g
  let match = pattern.exec(message)
  while (match) {
    const name = String(match[1] || '').trim()
    if (name && !(name in params)) params[name] = ctx.named(name)
    match = pattern.exec(message)
  }
  return params
}

function normalizeText(ctx, text) {
  if (typeof ctx?.normalize === 'function') return ctx.normalize([text])
  return text
}
