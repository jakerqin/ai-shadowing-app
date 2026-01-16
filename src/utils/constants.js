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

// Parse models from env string (format: "id,id,id,...")
function parseModelsFromEnv(envString, defaultModels) {
  if (!envString || envString.trim() === '') {
    return defaultModels
  }
  
  try {
    return envString.split(',').map(id => {
      const trimmedId = id.trim()
      return { id: trimmedId, name: trimmedId }
    }).filter(m => m.id)
  } catch {
    return defaultModels
  }
}

// Default model configurations (fallback when env not set)
const DEFAULT_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  glm: [
    { id: 'glm-4-flash', name: 'GLM-4 Flash' },
    { id: 'glm-4', name: 'GLM-4' },
    { id: 'glm-4-plus', name: 'GLM-4 Plus' },
  ],
}

// Get models from env or use defaults
const getProviderModels = (provider) => {
  const envKey = `${provider.toUpperCase()}_MODELS`
  const envModels = import.meta.env[envKey] || ''
  return parseModelsFromEnv(envModels, DEFAULT_MODELS[provider])
}

// Get default model from env or use first model in list
const getDefaultModel = (provider, models) => {
  const envKey = `${provider.toUpperCase()}_DEFAULT_MODEL`
  const envDefault = import.meta.env[envKey] || ''
  if (envDefault && models.some(m => m.id === envDefault)) {
    return envDefault
  }
  return models[0]?.id || ''
}

// Build AI Providers configuration dynamically
const buildAIProviders = () => {
  const providers = {
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      icon: '✨',
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      icon: '🤖',
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic Claude',
      icon: '🧠',
    },
    glm: {
      id: 'glm',
      name: 'GLM (智谱)',
      icon: '🔮',
    },
  }

  // Add models and defaultModel to each provider
  for (const [key, provider] of Object.entries(providers)) {
    provider.models = getProviderModels(key)
    provider.defaultModel = getDefaultModel(key, provider.models)
  }

  return providers
}

// AI Providers configuration (loaded from env or defaults)
export const AI_PROVIDERS = buildAIProviders()

// TTS Providers configuration
export const TTS_PROVIDERS = {
  glm: {
    id: 'glm',
    name: 'GLM-TTS (智谱)',
    icon: '🎙️',
    voices: [
      { id: 'male-1', name: 'Male Voice 1' },
      { id: 'female-1', name: 'Female Voice 1' },
    ],
    defaultVoice: 'female-1',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI TTS',
    icon: '🔊',
    voices: [
      { id: 'alloy', name: 'Alloy' },
      { id: 'echo', name: 'Echo' },
      { id: 'fable', name: 'Fable' },
      { id: 'onyx', name: 'Onyx' },
      { id: 'nova', name: 'Nova' },
      { id: 'shimmer', name: 'Shimmer' },
    ],
    defaultVoice: 'alloy',
  },
  azure: {
    id: 'azure',
    name: 'Azure Speech',
    icon: '☁️',
    voices: [
      { id: 'en-US-JennyNeural', name: 'Jenny (English)' },
      { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Chinese)' },
    ],
    defaultVoice: 'en-US-JennyNeural',
  },
}

// Storage keys
export const STORAGE_KEYS = {
  NOTEBOOK: 'ai-shadowing-notebook',
  SETTINGS: 'ai-shadowing-settings',
  AI_CONFIG: 'ai-shadowing-ai-config',
  TTS_CONFIG: 'ai-shadowing-tts-config',
  AUDIO_CACHE: 'ai-shadowing-audio-cache',
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
})
