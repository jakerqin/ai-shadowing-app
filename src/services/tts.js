import { TTS_PROVIDERS, getEnvConfig } from '../utils/constants'
import { getSpeechRate } from '../utils/helpers'

// Audio cache to avoid re-generating same audio
const audioCache = new Map()

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
  
  return {
    provider: 'openai',
    voice: 'alloy',
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
  
  // If no TTS-specific config, try to use the provider's config
  if (!baseUrl && config.provider === 'openai') {
    baseUrl = envConfig.openai.baseUrl
    apiKey = apiKey || envConfig.openai.apiKey
  } else if (!baseUrl && config.provider === 'glm') {
    baseUrl = envConfig.glm.baseUrl
    apiKey = apiKey || envConfig.glm.apiKey
  }
  
  return { baseUrl, apiKey }
}

// ============ OpenAI TTS ============
async function openaiTTS(text, options = {}) {
  const config = getTTSConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const voice = options.voice || config.voice || 'alloy'
  const speed = options.speed || 1.0

  // OpenAI TTS API: /v1/audio/speech
  const url = `${baseUrl}/v1/audio/speech`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
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

  // GLM TTS API format
  const url = `${baseUrl}/api/paas/v4/audio/speech`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
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
    body: ssml,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure TTS error: ${response.status} - ${error}`)
  }

  return await response.blob()
}

// ============ Unified TTS Interface ============
export async function generateSpeech(text, language, options = {}) {
  const cacheKey = `${text}-${language}-${options.speed || 1.0}`
  
  // Check cache first
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)
  }

  const config = getTTSConfig()
  
  if (!config.customBaseUrl && !getEnvConfig().tts.baseUrl) {
    throw new Error('TTS not configured. Please configure TTS in Settings.')
  }

  let audioBlob
  
  switch (config.provider) {
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
      audioBlob = await openaiTTS(text, options)
  }

  const audioUrl = URL.createObjectURL(audioBlob)
  
  // Cache the result
  audioCache.set(cacheKey, audioUrl)
  
  return audioUrl
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

  return {
    async play(audioUrl, onStateChange = null) {
      // Stop any currently playing audio
      this.stop()
      
      currentAudio = new Audio(audioUrl)
      isPlaying = true
      
      if (onStateChange) onStateChange(true)
      
      return new Promise((resolve, reject) => {
        currentAudio.onended = () => {
          isPlaying = false
          if (onStateChange) onStateChange(false)
          resolve()
        }
        
        currentAudio.onerror = (error) => {
          isPlaying = false
          if (onStateChange) onStateChange(false)
          reject(error)
        }
        
        currentAudio.play().catch((error) => {
          isPlaying = false
          if (onStateChange) onStateChange(false)
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

// Generate and play speech in one call
export async function speakText(text, language, difficulty = 3, onStateChange = null) {
  const speed = getSpeechRate(difficulty)
  const audioUrl = await generateSpeech(text, language, { speed })
  const player = createAudioPlayer()
  return player.play(audioUrl, onStateChange)
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
  speakText,
  clearAudioCache,
}
