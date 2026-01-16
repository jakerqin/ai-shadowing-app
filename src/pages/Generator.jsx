import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { generateContentStream } from '../services/ai'
import { LANGUAGES, SCENES } from '../utils/constants'
import { generateId, getLanguageName } from '../utils/helpers'
import { Button, Card } from '../components/UI'
import { ArrowLeft, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'

export default function Generator() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { settings, isGenerating, generationError } = state
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const hasStartedRef = useRef(false)
  const abortControllerRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    // Prevent double execution in React StrictMode
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    
    // Start generation when page loads
    startGeneration()
    
    // Cleanup on unmount - only abort if user navigates away, not during StrictMode remount
    return () => {
      isMountedRef.current = false
      // Don't abort here - let the request complete or be manually cancelled
    }
  }, [])

  const startGeneration = async () => {
    actions.setGenerating(true)
    actions.setGenerationError(null)
    setStreamingText('')
    setIsStreaming(true)
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const targetLang = getLanguageName(settings.targetLanguage, LANGUAGES)
      const nativeLang = getLanguageName(settings.nativeLanguage, LANGUAGES)

      const finalText = await generateContentStream(
        {
          targetLanguage: targetLang,
          nativeLanguage: nativeLang,
          difficulty: settings.difficulty,
          scene: settings.scene,
          length: settings.length,
        },
        (chunk, fullText) => {
          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setStreamingText(fullText)
          }
        },
        { signal: abortControllerRef.current.signal }
      )

      // Only update state if component is still mounted
      if (!isMountedRef.current) return
      
      setIsStreaming(false)

      // Create content object
      const content = {
        id: generateId(),
        text: finalText.trim(),
        settings: { ...settings },
        createdAt: new Date().toISOString(),
        translation: null,
      }

      actions.setCurrentContent(content)
      
      // Small delay to show completed text
      setTimeout(() => {
        navigate('/result')
      }, 500)

    } catch (error) {
      if (error.name === 'AbortError') {
        // User cancelled, don't show error
        return
      }
      console.error('Generation failed:', error)
      actions.setGenerationError(error.message || 'Failed to generate content')
      actions.setGenerating(false)
      setIsStreaming(false)
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    actions.setGenerating(false)
    navigate('/')
  }

  const handleRetry = () => {
    hasStartedRef.current = false
    startGeneration()
  }

  const scene = SCENES.find(s => s.id === settings.scene)
  const targetLang = LANGUAGES.find(l => l.code === settings.targetLanguage)

  return (
    <div className="page-container bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <button 
          onClick={handleCancel}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Cancel</span>
        </button>

        {/* Main Content */}
        <div className="text-center text-white">
          {generationError ? (
            // Error State
            <div className="animate-fade-in">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-300" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Generation Failed</h1>
              <p className="text-white/70 mb-6 max-w-xs mx-auto">
                {generationError}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleCancel}>
                  Go Back
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleRetry}
                  className="bg-white text-primary-600 hover:bg-white/90"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            // Streaming State
            <div className="animate-fade-in">
              {streamingText ? (
                // Show streaming text
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    <span className="text-white/80 text-sm">Generating...</span>
                  </div>
                  
                  <Card className="bg-white/95 backdrop-blur text-left p-4 mb-6 max-h-[50vh] overflow-y-auto">
                    <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                      {streamingText}
                      {isStreaming && <span className="typewriter-cursor" />}
                    </p>
                  </Card>
                  
                  {!isStreaming && (
                    <p className="text-white/70 text-sm">
                      ✨ Content ready! Redirecting...
                    </p>
                  )}
                </>
              ) : (
                // Initial loading state
                <>
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                    <div className="absolute inset-2 bg-white/30 rounded-full animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-white animate-bounce-slow" />
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold mb-3">Creating Your Content</h1>
                  <p className="text-white/70 mb-8">
                    Generating {settings.length} {scene?.name.toLowerCase()} content in {targetLang?.nativeName}...
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
