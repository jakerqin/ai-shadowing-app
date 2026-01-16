// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Format date for display
export const formatDate = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// Debounce function
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Parse text into words/tokens for display
export const tokenizeText = (text, language) => {
  // For CJK languages (Chinese, Japanese), split by character but preserve newlines
  if (['zh', 'ja'].includes(language)) {
    const tokens = []
    for (const char of text) {
      if (char === '\n') {
        tokens.push('\n')
      } else if (char.trim()) {
        tokens.push(char)
      }
    }
    return tokens
  }
  
  // For other languages, split by whitespace but preserve newlines
  const tokens = []
  const lines = text.split('\n')
  
  lines.forEach((line, lineIndex) => {
    // Split line into words
    const words = line.match(/[^\s]+/g) || []
    tokens.push(...words)
    
    // Add newline token between lines (not after the last line)
    if (lineIndex < lines.length - 1) {
      tokens.push('\n')
    }
  })
  
  return tokens
}

// Check if text contains CJK characters
export const isCJK = (text) => {
  return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text)
}

// Get language name by code
export const getLanguageName = (code, languages) => {
  const lang = languages.find(l => l.code === code)
  return lang ? lang.name : code
}

// Get language native name by code
export const getLanguageNativeName = (code, languages) => {
  const lang = languages.find(l => l.code === code)
  return lang ? lang.nativeName : code
}

// Sleep utility for async operations
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Safe JSON parse
export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// Copy text to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return true
  }
}

// Get speech rate from difficulty level
export const getSpeechRate = (difficulty) => {
  const rates = { 1: 0.6, 2: 0.7, 3: 0.8, 4: 0.9, 5: 1.0 }
  return rates[difficulty] || 0.8
}
