import { getEnvConfig, AI_PROVIDERS } from '../utils/constants'

// Get AI configuration from localStorage or defaults
export function getAIConfig() {
  const saved = localStorage.getItem('ai-shadowing-ai-config')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      // Remove legacy useProxy field if present
      delete config.useProxy
      
      // Validate that the saved model is still valid for the provider
      const provider = AI_PROVIDERS[config.provider]
      if (provider) {
        const validModels = provider.models.map(m => m.id)
        if (!validModels.includes(config.model)) {
          // Model no longer valid, use first option
          config.model = provider.models[0]?.id || ''
        }
      } else {
        const defaultProvider = Object.keys(AI_PROVIDERS)[0] || ''
        const defaultModels = AI_PROVIDERS[defaultProvider]?.models || []
        config.provider = defaultProvider
        config.model = defaultModels[0]?.id || ''
      }
      
      return config
    } catch {
      // Fall through to defaults
    }
  }
  
  // Default config - use values from AI_PROVIDERS (which reads from env)
  const defaultProvider = Object.keys(AI_PROVIDERS)[0] || ''
  const defaultModels = AI_PROVIDERS[defaultProvider]?.models || []
  return {
    provider: defaultProvider,
    model: defaultModels[0]?.id || '',
    // Custom overrides (from settings page)
    customBaseUrl: '',
    customApiKey: '',
  }
}

// Save AI configuration
export function saveAIConfig(config) {
  localStorage.setItem('ai-shadowing-ai-config', JSON.stringify(config))
}

// Get the actual API credentials (from env or custom)
function getCredentials(config) {
  const envConfig = getEnvConfig()
  const providerEnv = envConfig[config.provider] || {}
  
  return {
    baseUrl: config.customBaseUrl || providerEnv.baseUrl || '',
    apiKey: config.customApiKey || providerEnv.apiKey || '',
  }
}

// ============ Gemini Native API ============
async function geminiNativeChat(messages, options = {}) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model
  
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  
  // Add system instruction if present
  const systemMessage = messages.find(m => m.role === 'system')
  
  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
  }
  
  if (systemMessage) {
    requestBody.systemInstruction = {
      parts: [{ text: systemMessage.content }]
    }
  }

  // Gemini native API format: /v1beta/models/{model}:generateContent
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  
  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text
  }
  
  throw new Error('Invalid response from Gemini API')
}

// ============ OpenAI Native API ============
async function openaiNativeChat(messages, options = {}) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model

  // OpenAI native API format: /v1/chat/completions
  const url = `${baseUrl}/v1/chat/completions`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// ============ Anthropic Native API ============
async function anthropicNativeChat(messages, options = {}) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model

  // Extract system message
  const systemMessage = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  // Anthropic native API format: /v1/messages
  const url = `${baseUrl}/v1/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 2048,
      system: systemMessage?.content || '',
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// ============ GLM (Zhipu) Native API ============
async function glmNativeChat(messages, options = {}) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model

  // GLM native API format: /api/paas/v4/chat/completions
  const url = `${baseUrl}/api/paas/v4/chat/completions`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GLM API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// ============ Streaming API Functions ============

// Gemini Streaming
async function geminiStreamChat(messages, options = {}, onChunk) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model
  
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  
  const systemMessage = messages.find(m => m.role === 'system')
  
  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
  }
  
  if (systemMessage) {
    requestBody.systemInstruction = {
      parts: [{ text: systemMessage.content }]
    }
  }

  // Gemini streaming endpoint
  const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    
    // Process complete SSE events (separated by double newlines)
    let eventEnd
    while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
      const event = buffer.slice(0, eventEnd)
      buffer = buffer.slice(eventEnd + 2)
      
      // Extract data from the event
      const lines = event.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6))
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (text) {
              fullText += text
              onChunk(text, fullText)
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
  
  // Process any remaining data in buffer
  if (buffer.trim()) {
    const lines = buffer.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6))
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (text) {
            fullText += text
            onChunk(text, fullText)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText
}

// OpenAI Streaming
async function openaiStreamChat(messages, options = {}, onChunk) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model

  const url = `${baseUrl}/v1/chat/completions`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const json = JSON.parse(line.slice(6))
          const content = json.choices?.[0]?.delta?.content || ''
          if (content) {
            fullText += content
            onChunk(content, fullText)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText
}

// Anthropic Streaming
async function anthropicStreamChat(messages, options = {}, onChunk) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model

  const systemMessage = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const url = `${baseUrl}/v1/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 2048,
      system: systemMessage?.content || '',
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'content_block_delta' && json.delta?.text) {
            fullText += json.delta.text
            onChunk(json.delta.text, fullText)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText
}

// GLM Streaming (similar to OpenAI)
async function glmStreamChat(messages, options = {}, onChunk) {
  const config = getAIConfig()
  const { baseUrl, apiKey } = getCredentials(config)
  const model = options.model || config.model

  const url = `${baseUrl}/api/paas/v4/chat/completions`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GLM API error: ${response.status} - ${error}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const json = JSON.parse(line.slice(6))
          const content = json.choices?.[0]?.delta?.content || ''
          if (content) {
            fullText += content
            onChunk(content, fullText)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText
}

// ============ Unified Chat Interface ============
// Always uses native API format for each provider
async function chatCompletion(messages, options = {}) {
  const config = getAIConfig()
  const provider = config.provider

  switch (provider) {
    case 'gemini':
      return geminiNativeChat(messages, options)
    case 'openai':
      return openaiNativeChat(messages, options)
    case 'anthropic':
      return anthropicNativeChat(messages, options)
    case 'glm':
      return glmNativeChat(messages, options)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

// Streaming chat completion with callback
export async function chatCompletionStream(messages, options = {}, onChunk) {
  const config = getAIConfig()
  const provider = config.provider

  switch (provider) {
    case 'gemini':
      return geminiStreamChat(messages, options, onChunk)
    case 'openai':
      return openaiStreamChat(messages, options, onChunk)
    case 'anthropic':
      return anthropicStreamChat(messages, options, onChunk)
    case 'glm':
      return glmStreamChat(messages, options, onChunk)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

// ============ Application Functions ============

// Generate shadowing content
export async function generateContent({ targetLanguage, nativeLanguage, difficulty, scene, length }) {
  const lengthGuide = {
    short: '2-3 sentences (20-40 words)',
    medium: '4-6 sentences (50-80 words)',
    long: '7-10 sentences (100-150 words)',
  }

  const difficultyGuide = {
    1: 'Use very simple vocabulary and short sentences. Speak very slowly.',
    2: 'Use basic vocabulary and simple sentence structures. Speak slowly.',
    3: 'Use moderate vocabulary with some variety. Normal conversational pace.',
    4: 'Use natural vocabulary and varied sentence structures. Near-native pace.',
    5: 'Use native-level vocabulary, idioms, and complex structures. Natural native speed.',
  }

  const sceneDescriptions = {
    daily: 'daily life conversations like greetings, small talk, or daily routines',
    travel: 'travel scenarios like asking for directions, booking hotels, or transportation',
    business: 'business situations like meetings, presentations, or professional emails',
    food: 'food and dining scenarios like ordering at restaurants or discussing recipes',
    shopping: 'shopping situations like asking prices, bargaining, or product inquiries',
    health: 'health-related conversations like describing symptoms or pharmacy visits',
    culture: 'cultural topics like movies, music, art, or entertainment',
    tech: 'technology discussions like apps, devices, or internet services',
  }

  const prompt = `Generate a ${length} (${lengthGuide[length]}) dialogue or monologue in ${targetLanguage} about ${sceneDescriptions[scene]}.

Difficulty level: ${difficulty}/5
${difficultyGuide[difficulty]}

Requirements:
- Write ONLY the ${targetLanguage} text, no translations or explanations
- Make it natural and conversational
- If it's a dialogue, use A: and B: to indicate speakers
- Content should be practical and useful for language learners

Output the text directly without any markdown formatting or additional commentary.`

  const messages = [
    { role: 'system', content: `You are a language learning content creator. Generate natural, practical ${targetLanguage} content for language learners.` },
    { role: 'user', content: prompt },
  ]

  return await chatCompletion(messages, { temperature: 0.8 })
}

// Generate shadowing content with streaming
export async function generateContentStream({ targetLanguage, nativeLanguage, difficulty, scene, length }, onChunk, options = {}) {
  const lengthGuide = {
    short: '2-3 sentences (20-40 words)',
    medium: '4-6 sentences (50-80 words)',
    long: '7-10 sentences (100-150 words)',
  }

  const difficultyGuide = {
    1: 'Use very simple vocabulary and short sentences. Speak very slowly.',
    2: 'Use basic vocabulary and simple sentence structures. Speak slowly.',
    3: 'Use moderate vocabulary with some variety. Normal conversational pace.',
    4: 'Use natural vocabulary and varied sentence structures. Near-native pace.',
    5: 'Use native-level vocabulary, idioms, and complex structures. Natural native speed.',
  }

  const sceneDescriptions = {
    daily: 'daily life conversations like greetings, small talk, or daily routines',
    travel: 'travel scenarios like asking for directions, booking hotels, or transportation',
    business: 'business situations like meetings, presentations, or professional emails',
    food: 'food and dining scenarios like ordering at restaurants or discussing recipes',
    shopping: 'shopping situations like asking prices, bargaining, or product inquiries',
    health: 'health-related conversations like describing symptoms or pharmacy visits',
    culture: 'cultural topics like movies, music, art, or entertainment',
    tech: 'technology discussions like apps, devices, or internet services',
  }

  const prompt = `Generate a ${length} (${lengthGuide[length]}) dialogue or monologue in ${targetLanguage} about ${sceneDescriptions[scene]}.

Difficulty level: ${difficulty}/5
${difficultyGuide[difficulty]}

Requirements:
- Write ONLY the ${targetLanguage} text, no translations or explanations
- Make it natural and conversational
- If it's a dialogue, use A: and B: to indicate speakers
- Content should be practical and useful for language learners

Output the text directly without any markdown formatting or additional commentary.`

  const messages = [
    { role: 'system', content: `You are a language learning content creator. Generate natural, practical ${targetLanguage} content for language learners.` },
    { role: 'user', content: prompt },
  ]

  return await chatCompletionStream(messages, { temperature: 0.8, ...options }, onChunk)
}

// Translate text
export async function translateText(text, fromLanguage, toLanguage) {
  const messages = [
    { role: 'system', content: `You are a professional translator. Translate accurately while maintaining natural expression in the target language.` },
    { role: 'user', content: `Translate the following ${fromLanguage} text to ${toLanguage}. Output only the translation, no explanations:\n\n${text}` },
  ]

  return await chatCompletion(messages, { temperature: 0.3 })
}

// Translate text with streaming
export async function translateTextStream(text, fromLanguage, toLanguage, onChunk, options = {}) {
  const messages = [
    { role: 'system', content: `You are a professional translator. Translate accurately while maintaining natural expression in the target language.` },
    { role: 'user', content: `Translate the following ${fromLanguage} text to ${toLanguage}. Output only the translation, no explanations:\n\n${text}` },
  ]

  return await chatCompletionStream(messages, { temperature: 0.3, ...options }, onChunk)
}

// Generate word/phrase explanation
export async function explainWord(word, targetLanguage, nativeLanguage, context = '') {
  const prompt = `Explain the word/phrase "${word}" in ${targetLanguage} to a ${nativeLanguage} speaker.

${context ? `Context: "${context}"` : ''}

Be casual and fun, like chatting with a friend. Use markdown formatting. Cover:
- **Meaning**: What it means (brief, clear)
- **Cultural context**: Any nuances or cultural aspects
- **Examples**: 1-2 common usage scenarios
- **Tone**: formal, casual, slang?
- **Similar words**: Easily confused words and their differences

Keep it concise and engaging. Skip textbook language. Use ${nativeLanguage} for explanations but keep examples in ${targetLanguage}.`

  const messages = [
    { role: 'system', content: `You are a friendly language tutor who explains things in a casual, engaging way. Use markdown formatting for better readability. Respond in ${nativeLanguage}.` },
    { role: 'user', content: prompt },
  ]

  return await chatCompletion(messages, { temperature: 0.7 })
}

// Generate word/phrase explanation with streaming
export async function explainWordStream(word, targetLanguage, nativeLanguage, context = '', onChunk, options = {}) {
  const prompt = `Explain the word/phrase "${word}" in ${targetLanguage} to a ${nativeLanguage} speaker.

${context ? `Context: "${context}"` : ''}

Be casual and fun, like chatting with a friend. Use markdown formatting. Cover:
- **Meaning**: What it means (brief, clear)
- **Cultural context**: Any nuances or cultural aspects
- **Examples**: 1-2 common usage scenarios
- **Tone**: formal, casual, slang?
- **Similar words**: Easily confused words and their differences

Keep it concise and engaging. Skip textbook language. Use ${nativeLanguage} for explanations but keep examples in ${targetLanguage}.`

  const messages = [
    { role: 'system', content: `You are a friendly language tutor who explains things in a casual, engaging way. Use markdown formatting for better readability. Respond in ${nativeLanguage}.` },
    { role: 'user', content: prompt },
  ]

  return await chatCompletionStream(messages, { temperature: 0.7, ...options }, onChunk)
}

// Chat about selected text
export async function chatAboutText(selectedText, userQuestion, targetLanguage, nativeLanguage, chatHistory = []) {
  const systemPrompt = `You are a friendly language learning assistant. The user is learning ${targetLanguage} and their native language is ${nativeLanguage}.

They have selected this text: "${selectedText}"

Help them understand it better. Be encouraging, patient, and explain things clearly in ${nativeLanguage}. If they ask about grammar, vocabulary, or usage, provide helpful explanations with examples.`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: userQuestion },
  ]

  return await chatCompletion(messages, { temperature: 0.7 })
}

// Generate phonetic transcription (IPA)
export async function generatePhonetics(text, language) {
  const messages = [
    { role: 'system', content: `You are a linguistics expert. Provide accurate IPA (International Phonetic Alphabet) transcriptions.` },
    { role: 'user', content: `Provide the IPA phonetic transcription for this ${language} text. Output ONLY the IPA transcription in square brackets, nothing else:\n\n${text}` },
  ]

  return await chatCompletion(messages, { temperature: 0.1, maxTokens: 256 })
}

export default {
  getAIConfig,
  saveAIConfig,
  generateContent,
  generateContentStream,
  translateText,
  translateTextStream,
  explainWord,
  explainWordStream,
  chatAboutText,
  generatePhonetics,
}
