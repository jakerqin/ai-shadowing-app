import { TTS_PROVIDERS, getEnvConfig } from '../utils/constants'
import { getSpeechRate } from '../utils/helpers'

// Audio cache to avoid re-generating same audio
const audioCache = new Map()
const audioInFlight = new Map()
const DEFAULT_SEGMENT_MAX_CHARS = 240

// Get TTS configuration from localStorage or defaults
export function getTTSConfig() {
  const saved = localStorage.getItem('ai-shadowing-tts-config')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // Fall through to defaults
    }
  }
  
  const defaultProvider = Object.keys(TTS_PROVIDERS)[0] || ''
  const defaultVoices = TTS_PROVIDERS[defaultProvider]?.voices || []

  return {
    provider: defaultProvider,
    voice: defaultVoices[0]?.id || '',
    customBaseUrl: '',
    customApiKey: '',
  }
}

// Save TTS configuration
export function saveTTSConfig(config) {
  localStorage.setItem('ai-shadowing-tts-config', JSON.stringify(config))
}

// Get credentials
function getCredentials(config) {
  const envConfig = getEnvConfig()
  
  // TTS can use its own config or fall back to provider-specific config
  let baseUrl = config.customBaseUrl || envConfig.tts.baseUrl
  let apiKey = config.customApiKey || envConfig.tts.apiKey
  let model = ''
  
  // If no TTS-specific config, try to use the provider's config
  if (config.provider === 'gemini') {
    baseUrl = config.customBaseUrl || envConfig.geminiTts.baseUrl
    apiKey = config.customApiKey || envConfig.geminiTts.apiKey
    model = envConfig.geminiTts.model
  } else if (!baseUrl && config.provider === 'openai') {
    baseUrl = envConfig.openai.baseUrl
    apiKey = apiKey || envConfig.openai.apiKey
  } else if (!baseUrl && config.provider === 'glm') {
    baseUrl = envConfig.glm.baseUrl
    apiKey = apiKey || envConfig.glm.apiKey
  }
  
  return { baseUrl, apiKey, model }
}

// ============ OpenAI TTS ============
async function openaiTTS(text, options = {}) {
  const config = getTTSConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const voice = options.voice || config.voice || 'alloy'
  const speed = options.speed || 1.0
  const signal = options.signal

  // OpenAI TTS API: /v1/audio/speech
  const url = `${baseUrl}/v1/audio/speech`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: text,
      voice: voice,
      speed: speed,
      response_format: 'mp3',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI TTS error: ${response.status} - ${error}`)
  }

  return await response.blob()
}

// ============ GLM TTS ============
async function glmTTS(text, options = {}) {
  const config = getTTSConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const voice = options.voice || config.voice || 'female-1'
  const speed = options.speed || 1.0
  const signal = options.signal

  // GLM TTS API format
  const url = `${baseUrl}/api/paas/v4/audio/speech`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      speed: speed,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GLM TTS error: ${response.status} - ${error}`)
  }

  return await response.blob()
}

// ============ Azure TTS ============
async function azureTTS(text, options = {}) {
  const config = getTTSConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const voice = options.voice || config.voice || 'en-US-JennyNeural'
  const signal = options.signal

  // Azure TTS uses SSML format
  const ssml = `<speak version='1.0' xml:lang='en-US'>
    <voice name='${voice}'>${text}</voice>
  </speak>`

  const response = await fetch(`${baseUrl}/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'Ocp-Apim-Subscription-Key': apiKey,
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    signal,
    body: ssml,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure TTS error: ${response.status} - ${error}`)
  }

  return await response.blob()
}

// ============ Gemini TTS ============

// Helper: Get pacing prefix based on speed value
// Gemini TTS uses natural language prompts in the text itself to control speech style
function getGeminiPacingPrefix(speed) {
  // speed ranges from 0.6 (very slow) to 1.0 (normal)
  if (speed <= 0.6) {
    return 'Say very slowly and clearly: '
  } else if (speed <= 0.7) {
    return 'Say slowly: '
  } else if (speed <= 0.8) {
    return 'Say at a moderate pace: '
  } else if (speed <= 0.9) {
    return 'Say naturally: '
  } else {
    return '' // Normal speed, no prefix needed
  }
}

async function geminiTTS(text, options = {}) {
  const config = getTTSConfig()
  const { baseUrl, apiKey, model } = getCredentials(config)
  const voice = options.voice || config.voice || 'Kore'
  const speed = options.speed || 1.0
  const signal = options.signal

  // Gemini TTS API: /v1beta/models/{model}:generateContent
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  // Get pacing prefix based on speed (Gemini TTS uses text prompts for style control)
  const pacingPrefix = getGeminiPacingPrefix(speed)
  const textWithPacing = pacingPrefix + text
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: textWithPacing
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      }
    },
    model: model
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini TTS error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  
  // Extract base64 audio data from response
  const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!audioData) {
    throw new Error('No audio data in Gemini TTS response')
  }

  // Convert base64 PCM to WAV blob
  const pcmBuffer = base64ToArrayBuffer(audioData)
  const wavBlob = pcmToWav(pcmBuffer, 24000, 1, 16)
  
  return wavBlob
}

// Helper: Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper: Convert PCM to WAV format
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const pcmData = new Uint8Array(pcmBuffer)
  const wavHeader = createWavHeader(pcmData.length, sampleRate, numChannels, bitsPerSample)
  
  // Combine header and PCM data
  const wavBuffer = new Uint8Array(wavHeader.length + pcmData.length)
  wavBuffer.set(wavHeader, 0)
  wavBuffer.set(pcmData, wavHeader.length)
  
  return new Blob([wavBuffer], { type: 'audio/wav' })
}

// Helper: Create WAV header
function createWavHeader(dataLength, sampleRate, numChannels, bitsPerSample) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true) // File size - 8
  writeString(view, 8, 'WAVE')
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  
  // data sub-chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)
  
  return new Uint8Array(header)
}

// Helper: Write string to DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

// ============ Unified TTS Interface ============
export async function generateSpeech(text, language, options = {}) {
  const config = getTTSConfig()
  const cacheKey = `${config.provider}-${config.voice}-${text}-${language}-${options.speed || 1.0}`
  
  // Check cache first
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)
  }

  if (audioInFlight.has(cacheKey)) {
    return audioInFlight.get(cacheKey)
  }

  const envConfig = getEnvConfig()
  
  // Check if TTS is configured based on provider
  const isConfigured = config.customBaseUrl ||
    (config.provider === 'gemini' && envConfig.geminiTts.baseUrl) ||
    (config.provider === 'openai' && (envConfig.tts.baseUrl || envConfig.openai.baseUrl)) ||
    (config.provider === 'glm' && (envConfig.tts.baseUrl || envConfig.glm.baseUrl)) ||
    (config.provider === 'azure' && envConfig.tts.baseUrl)
  
  if (!isConfigured) {
    throw new Error('TTS not configured. Please configure TTS in Settings.')
  }

  const requestPromise = (async () => {
    let audioBlob
  
    switch (config.provider) {
      case 'gemini':
        audioBlob = await geminiTTS(text, options)
        break
      case 'openai':
        audioBlob = await openaiTTS(text, options)
        break
      case 'glm':
        audioBlob = await glmTTS(text, options)
        break
      case 'azure':
        audioBlob = await azureTTS(text, options)
        break
      default:
        audioBlob = await geminiTTS(text, options)
    }

    const audioUrl = URL.createObjectURL(audioBlob)
  
    // Cache the result
    audioCache.set(cacheKey, audioUrl)
  
    return audioUrl
  })()

  audioInFlight.set(cacheKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    audioInFlight.delete(cacheKey)
  }
}

// Play audio from URL
export function playAudio(audioUrl, onEnd = null) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl)
    
    audio.onended = () => {
      if (onEnd) onEnd()
      resolve()
    }
    
    audio.onerror = (error) => {
      reject(error)
    }
    
    audio.play().catch(reject)
  })
}

// Create an audio player instance with controls
export function createAudioPlayer() {
  let currentAudio = null
  let isPlaying = false
  let currentResolve = null
  let currentReject = null
  let currentOnStateChange = null

  return {
    async play(audioUrl, onStateChange = null) {
      // Stop any currently playing audio
      this.stop()
      
      currentAudio = new Audio(audioUrl)
      isPlaying = true
      currentOnStateChange = onStateChange
      
      if (onStateChange) onStateChange(true)
      
      return new Promise((resolve, reject) => {
        currentResolve = resolve
        currentReject = reject
        currentAudio.onended = () => {
          isPlaying = false
          if (onStateChange) onStateChange(false)
          currentResolve = null
          currentReject = null
          currentOnStateChange = null
          resolve()
        }
        
        currentAudio.onerror = (error) => {
          isPlaying = false
          if (onStateChange) onStateChange(false)
          currentResolve = null
          currentReject = null
          currentOnStateChange = null
          reject(error)
        }
        
        currentAudio.play().catch((error) => {
          isPlaying = false
          if (onStateChange) onStateChange(false)
          currentResolve = null
          currentReject = null
          currentOnStateChange = null
          reject(error)
        })
      })
    },
    
    stop() {
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        currentAudio = null
        isPlaying = false
        if (currentOnStateChange) currentOnStateChange(false)
        if (currentResolve) currentResolve()
        currentResolve = null
        currentReject = null
        currentOnStateChange = null
      }
    },
    
    pause() {
      if (currentAudio && isPlaying) {
        currentAudio.pause()
        isPlaying = false
      }
    },
    
    resume() {
      if (currentAudio && !isPlaying) {
        currentAudio.play()
        isPlaying = true
      }
    },
    
    isPlaying() {
      return isPlaying
    },
  }
}

function normalizeTtsText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function chunkByLength(text, maxChars) {
  const chunks = []
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars))
  }
  return chunks
}

function splitLongSegment(segment, maxChars) {
  if (segment.length <= maxChars) return [segment]

  const words = segment.split(' ')
  if (words.length === 1) {
    return chunkByLength(segment, maxChars)
  }

  const chunks = []
  let buffer = ''
  for (const word of words) {
    const candidate = buffer ? `${buffer} ${word}` : word
    if (candidate.length > maxChars) {
      if (buffer) chunks.push(buffer)
      buffer = word
    } else {
      buffer = candidate
    }
  }
  if (buffer) chunks.push(buffer)
  return chunks
}

function splitTextIntoSegments(text, maxChars = DEFAULT_SEGMENT_MAX_CHARS) {
  const normalized = normalizeTtsText(text)
  if (!normalized) return []

  const rawSentences = normalized.match(/[^.!?。！？]+[.!?。！？]*/g) || [normalized]
  const segments = []
  let buffer = ''

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    if (trimmed.length > maxChars) {
      const longParts = splitLongSegment(trimmed, maxChars)
      for (const part of longParts) {
        if (buffer) {
          segments.push(buffer)
          buffer = ''
        }
        segments.push(part)
      }
      continue
    }

    const candidate = buffer ? `${buffer} ${trimmed}` : trimmed
    if (candidate.length > maxChars) {
      if (buffer) segments.push(buffer)
      buffer = trimmed
    } else {
      buffer = candidate
    }
  }

  if (buffer) segments.push(buffer)
  return segments
}

// Prefetch audio for faster playback
export async function prefetchSpeech(text, language, difficulty = 3, options = {}) {
  const speed = getSpeechRate(difficulty)
  const segments = options.segmented === false
    ? [text]
    : splitTextIntoSegments(text, options.maxChars || DEFAULT_SEGMENT_MAX_CHARS)
  const signal = options.signal
  const maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency || 2))

  if (!segments.length || signal?.aborted) return

  let nextIndex = 0
  let inFlightCount = 0

  return new Promise((resolve) => {
    const schedule = () => {
      if (signal?.aborted) {
        resolve()
        return
      }
      if (nextIndex >= segments.length && inFlightCount === 0) {
        resolve()
        return
      }
      while (inFlightCount < maxConcurrency && nextIndex < segments.length) {
        const index = nextIndex
        nextIndex += 1
        inFlightCount += 1
        generateSpeech(segments[index], language, { speed, signal })
          .catch(() => {})
          .finally(() => {
            inFlightCount -= 1
            schedule()
          })
      }
    }

    schedule()
  })
}

// Generate and play speech in one call
export async function speakText(text, language, difficulty = 3, onStateChange = null, options = {}) {
  const speed = getSpeechRate(difficulty)
  const segments = options.segmented === false
    ? [text]
    : splitTextIntoSegments(text, options.maxChars || DEFAULT_SEGMENT_MAX_CHARS)
  const player = options.player || createAudioPlayer()
  const signal = options.signal
  const prefetchCount = Math.max(1, Math.floor(options.prefetchCount || 2))
  const maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency || 2))

  if (!segments.length || signal?.aborted) return

  if (onStateChange) onStateChange(true)

  try {
    let nextIndexToFetch = 0
    let nextIndexToPlay = 0
    let inFlightCount = 0
    let fetchError = null
    const started = new Array(segments.length).fill(false)
    const deferreds = segments.map(() => {
      let resolve
      let reject
      const promise = new Promise((innerResolve, innerReject) => {
        resolve = innerResolve
        reject = innerReject
      })
      return { promise, resolve, reject }
    })

    const startFetch = (index) => {
      if (started[index] || signal?.aborted || fetchError) return
      started[index] = true
      inFlightCount += 1
      generateSpeech(segments[index], language, { speed, signal })
        .then((audioUrl) => {
          deferreds[index].resolve(audioUrl)
        })
        .catch((error) => {
          if (!signal?.aborted && !fetchError) {
            fetchError = error
          }
          deferreds[index].reject(error)
        })
        .finally(() => {
          inFlightCount -= 1
          scheduleFetches()
        })
    }

    const scheduleFetches = () => {
      if (signal?.aborted || fetchError) return
      while (
        nextIndexToFetch < segments.length &&
        (nextIndexToFetch - nextIndexToPlay) < prefetchCount &&
        inFlightCount < maxConcurrency
      ) {
        const index = nextIndexToFetch
        nextIndexToFetch += 1
        startFetch(index)
      }
    }

    scheduleFetches()

    for (nextIndexToPlay = 0; nextIndexToPlay < segments.length; nextIndexToPlay += 1) {
      if (signal?.aborted) break
      scheduleFetches()
      let audioUrl
      try {
        audioUrl = await deferreds[nextIndexToPlay].promise
      } catch (error) {
        if (signal?.aborted) break
        throw error
      }
      if (signal?.aborted) break
      await player.play(audioUrl)
      scheduleFetches()
    }
  } finally {
    if (onStateChange) onStateChange(false)
  }
}

// Clear audio cache
export function clearAudioCache() {
  audioCache.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  audioCache.clear()
}

export default {
  getTTSConfig,
  saveTTSConfig,
  generateSpeech,
  playAudio,
  createAudioPlayer,
  prefetchSpeech,
  speakText,
  clearAudioCache,
}
