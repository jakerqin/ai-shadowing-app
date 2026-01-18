// Supported languages (Top 10 global languages)
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
]

// Difficulty levels
export const DIFFICULTY_LEVELS = [
  { level: 1, name: 'Beginner', description: 'Very slow, simple vocabulary', speechRate: 0.6 },
  { level: 2, name: 'Elementary', description: 'Slow pace, basic sentences', speechRate: 0.7 },
  { level: 3, name: 'Intermediate', description: 'Moderate pace, varied vocabulary', speechRate: 0.8 },
  { level: 4, name: 'Upper-Intermediate', description: 'Near-native pace', speechRate: 0.9 },
  { level: 5, name: 'Advanced', description: 'Native speed, natural expressions', speechRate: 1.0 },
]

// Scenes/Topics
export const SCENES = [
  { id: 'daily', name: 'Daily Life', icon: '☀️', description: 'Greetings, small talk, daily routines' },
  { id: 'travel', name: 'Travel', icon: '✈️', description: 'Directions, booking, transportation' },
  { id: 'business', name: 'Business', icon: '💼', description: 'Meetings, emails, presentations' },
  { id: 'food', name: 'Food & Dining', icon: '🍽️', description: 'Ordering, recipes, restaurants' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', description: 'Prices, bargaining, products' },
  { id: 'health', name: 'Health', icon: '🏥', description: 'Symptoms, pharmacy, appointments' },
  { id: 'culture', name: 'Culture', icon: '🎭', description: 'Movies, music, entertainment' },
  { id: 'tech', name: 'Technology', icon: '📱', description: 'Apps, devices, internet' },
]

// Content length options
export const LENGTH_OPTIONS = [
  { id: 'short', name: 'Short', description: '2-3 sentences', wordCount: '20-40 words' },
  { id: 'medium', name: 'Medium', description: '4-6 sentences', wordCount: '50-80 words' },
  { id: 'long', name: 'Long', description: '7-10 sentences', wordCount: '100-150 words' },
]

function parseDelimitedList(envString) {
  if (!envString || envString.trim() === '') {
    return []
  }
  return envString.split(',').map(item => item.trim()).filter(Boolean)
}

function parseIdNameList(envString) {
  return parseDelimitedList(envString).map((entry) => {
    const [idPart, namePart] = entry.split('|')
    const id = (idPart || '').trim()
    if (!id) return null
    const name = (namePart || '').trim() || id
    return { id, name }
  }).filter(Boolean)
}

function parseIdNameIconList(envString) {
  return parseDelimitedList(envString).map((entry) => {
    const [idPart, namePart, iconPart] = entry.split('|')
    const id = (idPart || '').trim()
    if (!id) return null
    const name = (namePart || '').trim() || id
    const icon = (iconPart || '').trim() || ''
    return { id, name, icon }
  }).filter(Boolean)
}

function getFirstId(items) {
  return items[0]?.id || ''
}

// Get models from env (format: "id|name,id|name,...")
const getProviderModels = (provider) => {
  const envKey = `${provider.toUpperCase()}_MODELS`
  return parseIdNameList(import.meta.env[envKey] || '')
}

const getAiProviderList = () => {
  return parseIdNameIconList(import.meta.env.AI_PROVIDERS || '')
}

const DEFAULT_TTS_VOICES = {
  gemini: [
    { id: 'Zephyr', name: 'Zephyr (Bright)' },
    { id: 'Puck', name: 'Puck (Upbeat)' },
    { id: 'Charon', name: 'Charon (Informative)' },
    { id: 'Kore', name: 'Kore (Firm)' },
    { id: 'Fenrir', name: 'Fenrir (Excitable)' },
    { id: 'Leda', name: 'Leda (Youthful)' },
    { id: 'Orus', name: 'Orus (Firm)' },
    { id: 'Aoede', name: 'Aoede (Breezy)' },
  ],
  glm: [
    { id: 'male-1', name: 'Male Voice 1' },
    { id: 'female-1', name: 'Female Voice 1' },
  ],
  openai: [
    { id: 'alloy', name: 'Alloy' },
    { id: 'ash', name: 'Ash' },
    { id: 'ballad', name: 'Ballad' },
    { id: 'coral', name: 'Coral' },
    { id: 'cedar', name: 'Cedar' },
    { id: 'echo', name: 'Echo' },
    { id: 'fable', name: 'Fable' },
    { id: 'marin', name: 'Marin' },
    { id: 'sage', name: 'Sage' },
    { id: 'verse', name: 'Verse' },
    { id: 'onyx', name: 'Onyx' },
    { id: 'nova', name: 'Nova' },
    { id: 'shimmer', name: 'Shimmer' },
  ],
  azure: [
    { id: 'en-US-JennyNeural', name: 'Jenny (English)' },
    { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Chinese)' },
  ],
}

const getTtsVoices = (providerId) => {
  const envKey = `TTS_VOICES_${providerId.toUpperCase()}`
  const envVoices = parseIdNameList(import.meta.env[envKey] || '')
  if (envVoices.length) return envVoices
  return DEFAULT_TTS_VOICES[providerId] || []
}

const getTtsProviderList = () => {
  return parseIdNameIconList(import.meta.env.TTS_PROVIDERS || '')
}

// Build AI Providers configuration dynamically
const buildAIProviders = () => {
  const providerList = getAiProviderList()
  return providerList.reduce((acc, provider) => {
    acc[provider.id] = {
      ...provider,
      models: getProviderModels(provider.id),
    }
    return acc
  }, {})
}

// AI Providers configuration (loaded from env)
export const AI_PROVIDERS = buildAIProviders()

// TTS Providers configuration (loaded from env)
export const TTS_PROVIDERS = getTtsProviderList().reduce((acc, provider) => {
  acc[provider.id] = {
    ...provider,
    voices: getTtsVoices(provider.id),
  }
  return acc
}, {})

// Storage keys
export const STORAGE_KEYS = {
  NOTEBOOK: 'ai-shadowing-notebook',
  SETTINGS: 'ai-shadowing-settings',
  AI_CONFIG: 'ai-shadowing-ai-config',
  TTS_CONFIG: 'ai-shadowing-tts-config',
  AUDIO_CACHE: 'ai-shadowing-audio-cache',
  LEARNING_PLAN: 'ai-shadowing-learning-plan',
}

// Get API config from environment variables
export const getEnvConfig = () => ({
  gemini: {
    baseUrl: import.meta.env.GEMINI_BASE_URL || '',
    apiKey: import.meta.env.GEMINI_API_KEY || '',
  },
  openai: {
    baseUrl: import.meta.env.OPENAI_BASE_URL || '',
    apiKey: import.meta.env.OPENAI_API_KEY || '',
  },
  anthropic: {
    baseUrl: import.meta.env.ANTHROPIC_BASE_URL || '',
    apiKey: import.meta.env.ANTHROPIC_API_KEY || '',
  },
  glm: {
    baseUrl: import.meta.env.GLM_BASE_URL || '',
    apiKey: import.meta.env.GLM_API_KEY || '',
  },
  tts: {
    baseUrl: import.meta.env.TTS_BASE_URL || '',
    apiKey: import.meta.env.TTS_API_KEY || '',
  },
  geminiTts: {
    baseUrl: import.meta.env.GEMINI_TTS_BASE_URL || '',
    apiKey: import.meta.env.GEMINI_TTS_API_KEY || '',
    model: getFirstId(parseIdNameList(import.meta.env.GEMINI_TTS_MODELS || '')),
  },
})
