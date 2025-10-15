export interface MorganFreemanStreamResult {
  objectUrl: string
  base64Promise: Promise<string>
  cleanup: () => void
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Failed to convert audio to base64'))
        return
      }

      const [, base64] = result.split(',')
      if (!base64) {
        reject(new Error('Invalid audio data returned'))
        return
      }

      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Audio conversion error'))
    reader.readAsDataURL(blob)
  })
}

const getSupabaseConfig = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration for text-to-speech')
  }

  return { supabaseUrl, supabaseAnonKey }
}

export async function generateMorganFreemanSpeech(text: string): Promise<MorganFreemanStreamResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  const controller = new AbortController()

  const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ text }),
    signal: controller.signal,
  })

  if (!response.ok) {
    let message = 'Failed to generate speech'
    try {
      const errorText = await response.text()
      if (errorText) {
        message = errorText
      }
    } catch {
      // Ignore text parsing errors
    }
    throw new Error(message)
  }

  const supportsStreaming =
    typeof window !== 'undefined' &&
    'MediaSource' in window &&
    MediaSource.isTypeSupported('audio/mpeg') &&
    !!response.body

  if (!supportsStreaming) {
    const arrayBuffer = await response.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const objectUrl = URL.createObjectURL(blob)

    const cleanup = () => {
      controller.abort()
      URL.revokeObjectURL(objectUrl)
    }

    return {
      objectUrl,
      base64Promise: blobToBase64(blob),
      cleanup,
    }
  }

  const mediaSource = new MediaSource()
  const objectUrl = URL.createObjectURL(mediaSource)
  const reader = response.body!.getReader()
  const chunkBuffers: Uint8Array[] = []
  const appendQueue: ArrayBuffer[] = []

  let sourceBuffer: SourceBuffer | null = null
  let streamCompleted = false
  let streamClosed = false
  let settled = false
  let cleanedUp = false

  let resolveStream: (() => void) | null = null
  let rejectStream: ((error: Error) => void) | null = null

  const streamFinished = new Promise<void>((resolve, reject) => {
    resolveStream = resolve
    rejectStream = reject
  })

  const appendFromQueue = () => {
    if (!sourceBuffer || sourceBuffer.updating) {
      return
    }

    const nextChunk = appendQueue.shift()

    if (nextChunk) {
      try {
        sourceBuffer.appendBuffer(nextChunk)
      } catch (error) {
        if (settled) return
        settled = true
        controller.abort()
        const err = error instanceof Error ? error : new Error('Failed to append audio chunk')
        rejectStream?.(err)
        cleanup()
      }
      return
    }

    if (streamCompleted && !streamClosed) {
      try {
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream()
        }
        streamClosed = true
        if (!settled) {
          settled = true
          resolveStream?.()
        }
      } catch (error) {
        if (settled) return
        settled = true
        const err = error instanceof Error ? error : new Error('Failed to close audio stream')
        rejectStream?.(err)
        cleanup()
      }
    }
  }

  const handleUpdateEnd = () => appendFromQueue()

  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true

    controller.abort()

    try {
      void reader.cancel().catch(() => undefined)
    } catch {
      // ignore cancellation errors
    }

    if (sourceBuffer) {
      sourceBuffer.removeEventListener('updateend', handleUpdateEnd)
      try {
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream()
        }
      } catch {
        // ignore errors during cleanup
      }
    }

    URL.revokeObjectURL(objectUrl)
  }

  const sourceOpen = new Promise<void>((resolve, reject) => {
    const onSourceOpen = () => {
      try {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
        sourceBuffer.addEventListener('updateend', handleUpdateEnd)
        resolve()
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to initialise audio buffer')
        reject(err)
      }
    }

    mediaSource.addEventListener('sourceopen', onSourceOpen, { once: true })
    mediaSource.addEventListener(
      'error',
      () => reject(new Error('Media source error')),
      { once: true }
    )
  })

  const pumpStream = async () => {
    try {
      await sourceOpen

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value || value.length === 0) continue

        const chunkCopy = value.slice()
        chunkBuffers.push(chunkCopy)
        appendQueue.push(chunkCopy.buffer)
        appendFromQueue()
      }

      streamCompleted = true
      appendFromQueue()
    } catch (error) {
      if (controller.signal.aborted) {
        if (!settled) {
          settled = true
          rejectStream?.(new DOMException('Stream aborted', 'AbortError'))
        }
        return
      }

      const err = error instanceof Error ? error : new Error('Audio streaming failed')
      if (!settled) {
        settled = true
        rejectStream?.(err)
      }
      cleanup()
    }
  }

  pumpStream()

  const base64Promise = streamFinished.then(async () => {
    const blob = new Blob(chunkBuffers, { type: 'audio/mpeg' })
    return blobToBase64(blob)
  })

  return {
    objectUrl,
    base64Promise,
    cleanup,
  }
}
