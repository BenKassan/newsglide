export const normalizeParagraphSeparators = (text: string): string => {
  if (!text) {
    return ''
  }

  let normalized = text.replace(/\r\n/g, '\n')

  // Convert literal "\n" sequences into actual newlines
  normalized = normalized.replace(/\\n/g, '\n')

  // Replace slash-based separators that appear to act as paragraph breaks.
  normalized = normalized.replace(
    /([^\s])\s*\/\s+(?=[A-Z0-9“"(\[‘'—-])/g,
    (_match, before: string) => `${before}\n\n`
  )

  // Handle cases where the slash is at the start of the string or right after a newline
  normalized = normalized.replace(
    /(^|\n)\s*\/\s+(?=[A-Z0-9“"(\[‘'—-])/g,
    (_match, prefix: string) => `${prefix}\n\n`
  )

  // Trim stray spaces around newline characters without collapsing paragraph spacing
  normalized = normalized.replace(/[ \t]+\n/g, '\n')
  normalized = normalized.replace(/\n[ \t]+/g, '\n')

  // Avoid more than two consecutive newlines
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  return normalized
}

export const splitIntoParagraphs = (text: string): string[] => {
  if (!text) {
    return []
  }

  const normalized = normalizeParagraphSeparators(text)

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 0) {
    return paragraphs
  }

  const fallback = normalized
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (fallback.length > 0) {
    return fallback
  }

  const trimmed = normalized.trim()
  return trimmed ? [trimmed] : []
}
