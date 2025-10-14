const DEFAULT_CONCLUSION_PHRASES = new Set([
  'in conclusion',
  'to conclude',
  'in summary',
  'to summarize',
  'overall',
  'in closing',
  'finally',
  'to wrap up',
  'all in all',
  'ultimately'
])

const TRANSITION_STARTERS = [
  'additionally',
  'also',
  'beyond that',
  'furthermore',
  'however',
  'in addition',
  'meanwhile',
  'notably',
  'on the other hand',
  'separately',
  'still',
  'yet'
]

const MIN_WORDS_PER_BULLET = 18
const MAX_WORDS_PER_BULLET = 72

const stripCitations = (text: string): string => text.replace(/\[\^?\d+\]/g, '')

const countWords = (text: string): number =>
  stripCitations(text)
    .split(/\s+/)
    .filter(Boolean).length

const hasTerminalPunctuation = (text: string): boolean =>
  /[.!?]"?(\]|\))?$/.test(text.trim())

const normalizeSentence = (sentence: string): string =>
  sentence
    .replace(/^[\s•*-]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()

const normalizeBullet = (parts: string[]): string => {
  const combined = parts.join(' ')
  const cleaned = normalizeSentence(combined)

  if (!cleaned) {
    return ''
  }

  if (!hasTerminalPunctuation(cleaned)) {
    return `${cleaned}.`
  }

  return cleaned
}

const shouldSkipSentence = (sentence: string): boolean => {
  const normalized = sentence.toLowerCase()

  for (const phrase of DEFAULT_CONCLUSION_PHRASES) {
    if (
      normalized.startsWith(phrase) ||
      normalized.includes(`, ${phrase},`) ||
      normalized.includes(`. ${phrase}`)
    ) {
      return true
    }
  }

  return false
}

const sentenceStartsWithTransition = (sentence: string): boolean => {
  const lower = sentence.toLowerCase()
  return TRANSITION_STARTERS.some(
    (starter) =>
      lower.startsWith(`${starter} `) ||
      lower.startsWith(`${starter},`)
  )
}

export const transformToBulletPoints = (text: string): string[] => {
  if (!text) {
    return []
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const bullets: string[] = []
  let currentParts: string[] = []
  let currentWordCount = 0

  const commitCurrent = (force = false) => {
    if (!currentParts.length) {
      return
    }

    const bullet = normalizeBullet(currentParts)
    const words = countWords(bullet)

    if (!bullet) {
      currentParts = []
      currentWordCount = 0
      return
    }

    if (!force && words === 0) {
      currentParts = []
      currentWordCount = 0
      return
    }

    bullets.push(bullet)
    currentParts = []
    currentWordCount = 0
  }

  for (const paragraph of paragraphs) {
    const sentences =
      paragraph.match(/[^.!?]+(?:\[\^?\d+\])?[.!?]+(?=\s|$)/g) || [paragraph]

    for (const rawSentence of sentences) {
      const sentence = normalizeSentence(rawSentence)

      if (!sentence || shouldSkipSentence(sentence)) {
        continue
      }

      const sentenceWordCount = countWords(sentence)
      const combinedWordCount = currentWordCount + sentenceWordCount
      const continuation =
        !hasTerminalPunctuation(sentence) ||
        sentenceWordCount < 6 ||
        currentWordCount < MIN_WORDS_PER_BULLET

      const needsNewBullet =
        currentParts.length > 0 &&
        !continuation &&
        (combinedWordCount > MAX_WORDS_PER_BULLET ||
          (currentWordCount >= MIN_WORDS_PER_BULLET &&
            (sentenceStartsWithTransition(sentence) ||
              sentenceWordCount >= MIN_WORDS_PER_BULLET / 1.2)))

      if (needsNewBullet) {
        commitCurrent()
      }

      currentParts.push(sentence)
      currentWordCount += sentenceWordCount

      if (currentWordCount >= MAX_WORDS_PER_BULLET) {
        commitCurrent()
      }
    }

    if (currentWordCount >= MIN_WORDS_PER_BULLET) {
      commitCurrent()
    }
  }

  if (currentParts.length) {
    commitCurrent(true)
  }

  const postProcessed: string[] = []

  for (const bullet of bullets) {
    const words = countWords(bullet)

    if (words < MIN_WORDS_PER_BULLET * 0.6 && postProcessed.length) {
      const merged = normalizeBullet([postProcessed.pop() as string, bullet])
      postProcessed.push(merged)
    } else {
      postProcessed.push(bullet)
    }
  }

  return postProcessed
}

export default transformToBulletPoints
