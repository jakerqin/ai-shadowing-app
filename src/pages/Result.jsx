import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useApp } from '../store/AppContext'
import { generateContentStream, translateText, explainWord, chatAboutText, generatePhonetics } from '../services/ai'
import { speakText, generateSpeech, createAudioPlayer } from '../services/tts'
import { LANGUAGES, SCENES } from '../utils/constants'
import { tokenizeText, getLanguageName, generateId } from '../utils/helpers'
import { Button, Card, Modal, Badge, Spinner, IconButton, Textarea } from '../components/UI'
import {
  ArrowLeft, Play, Pause, Volume2, Languages, BookmarkPlus,
  MessageCircle, Lightbulb, Send, X, Check, Home
} from 'lucide-react'

export default function Result() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { currentContent, settings, showTranslation, chatMessages, selectedText, isPlaying, isGenerating, generationError } = state
  
  const [isTranslating, setIsTranslating] = useState(false)
  const [playingWord, setPlayingWord] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [isExplaining, setIsExplaining] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [phonetics, setPhonetics] = useState({})
  const [saved, setSaved] = useState(false)
  
  const audioPlayerRef = useRef(createAudioPlayer())
  const chatEndRef = useRef(null)
  const hasStartedRef = useRef(false)
  const abortControllerRef = useRef(null)
  const typewriterTimerRef = useRef(null)
  const pendingTextRef = useRef('')
  const displayTextRef = useRef('')
  const streamDoneRef = useRef(false)
  const activeGenerationIdRef = useRef(null)

  const TYPEWRITER_INTERVAL_MS = 20
  const TYPEWRITER_CHUNK_SIZE = 3

  // Redirect if no content
  useEffect(() => {
    if (!currentContent && !isGenerating) {
      navigate('/')
    }
  }, [currentContent, isGenerating, navigate])

  useEffect(() => {
    if (!isGenerating) {
      hasStartedRef.current = false
      return
    }
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    startStreamingGeneration()

    return () => {
      hasStartedRef.current = false
      cleanupStreaming()
    }
  }, [isGenerating])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  if (!currentContent && !isGenerating) return null

  const targetLang = LANGUAGES.find(l => l.code === settings.targetLanguage)
  const nativeLang = LANGUAGES.find(l => l.code === settings.nativeLanguage)
  const scene = SCENES.find(s => s.id === settings.scene)
  const contentText = currentContent?.text || ''
  const tokens = tokenizeText(contentText, settings.targetLanguage)
  const isCJKLanguage = ['zh', 'ja'].includes(settings.targetLanguage)
  const isStreaming = isGenerating && !generationError

  const stopTypewriter = () => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }
  }

  const cleanupStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    stopTypewriter()
    pendingTextRef.current = ''
    displayTextRef.current = ''
    streamDoneRef.current = false
    activeGenerationIdRef.current = null
  }

  const finalizeStream = (generationId) => {
    if (activeGenerationIdRef.current !== generationId) return
    stopTypewriter()
    const trimmedText = displayTextRef.current.trim()
    if (trimmedText !== displayTextRef.current) {
      displayTextRef.current = trimmedText
      actions.updateCurrentContentText(trimmedText)
    }
    actions.setGenerating(false)
    activeGenerationIdRef.current = null
  }

  const startTypewriter = (generationId) => {
    if (typewriterTimerRef.current) return
    typewriterTimerRef.current = setInterval(() => {
      if (activeGenerationIdRef.current !== generationId) {
        stopTypewriter()
        return
      }

      if (!pendingTextRef.current.length) {
        if (streamDoneRef.current) {
          finalizeStream(generationId)
        }
        return
      }

      const nextChunk = pendingTextRef.current.slice(0, TYPEWRITER_CHUNK_SIZE)
      pendingTextRef.current = pendingTextRef.current.slice(TYPEWRITER_CHUNK_SIZE)
      displayTextRef.current += nextChunk
      actions.updateCurrentContentText(displayTextRef.current)
    }, TYPEWRITER_INTERVAL_MS)
  }

  const startStreamingGeneration = async () => {
    const generationId = generateId()
    activeGenerationIdRef.current = generationId
    streamDoneRef.current = false
    pendingTextRef.current = ''
    displayTextRef.current = ''
    actions.setGenerationError(null)
    actions.setGenerating(true)

    const content = {
      id: generationId,
      text: '',
      settings: { ...settings },
      createdAt: new Date().toISOString(),
      translation: null,
    }

    actions.setCurrentContent(content)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const targetLanguage = getLanguageName(settings.targetLanguage, LANGUAGES)
      const nativeLanguage = getLanguageName(settings.nativeLanguage, LANGUAGES)

      await generateContentStream(
        {
          targetLanguage,
          nativeLanguage,
          difficulty: settings.difficulty,
          scene: settings.scene,
          length: settings.length,
        },
        (chunk) => {
          if (activeGenerationIdRef.current !== generationId) return
          pendingTextRef.current += chunk
          startTypewriter(generationId)
        },
        { signal: controller.signal },
      )

      streamDoneRef.current = true
      if (!pendingTextRef.current.length) {
        finalizeStream(generationId)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      stopTypewriter()
      pendingTextRef.current = ''
      streamDoneRef.current = false
      actions.setGenerationError(error.message || 'Failed to generate content')
      actions.setGenerating(false)
    }
  }

  // Play full text
  const handlePlayFull = async () => {
    if (isStreaming || !contentText) return
    if (isPlaying) {
      audioPlayerRef.current.stop()
      actions.setPlaying(false)
      return
    }

    try {
      actions.setPlaying(true)
      await speakText(
        currentContent.text, 
        settings.targetLanguage, 
        settings.difficulty,
        (playing) => actions.setPlaying(playing)
      )
    } catch (error) {
      console.error('Playback failed:', error)
      actions.setPlaying(false)
    }
  }

  // Play single word
  const handlePlayWord = async (word) => {
    if (isStreaming || !contentText) return
    if (playingWord === word) {
      audioPlayerRef.current.stop()
      setPlayingWord(null)
      return
    }

    try {
      setPlayingWord(word)
      const audioUrl = await generateSpeech(word, settings.targetLanguage, { speed: 0.8 })
      await audioPlayerRef.current.play(audioUrl, (playing) => {
        if (!playing) setPlayingWord(null)
      })
    } catch (error) {
      console.error('Word playback failed:', error)
      setPlayingWord(null)
    }
  }

  // Get phonetics for a word
  const handleGetPhonetics = async (word) => {
    if (isStreaming || !contentText) return null
    if (phonetics[word]) return phonetics[word]
    
    try {
      const ipa = await generatePhonetics(word, getLanguageName(settings.targetLanguage, LANGUAGES))
      setPhonetics(prev => ({ ...prev, [word]: ipa }))
      return ipa
    } catch (error) {
      console.error('Phonetics failed:', error)
      return null
    }
  }

  // Translate content
  const handleTranslate = async () => {
    if (isStreaming || !contentText) return
    if (currentContent?.translation) {
      actions.toggleTranslation()
      return
    }

    setIsTranslating(true)
    actions.toggleTranslation() // Show translation area immediately

    try {
      const finalTranslation = await translateText(
        contentText,
        getLanguageName(settings.targetLanguage, LANGUAGES),
        getLanguageName(settings.nativeLanguage, LANGUAGES)
      )
      
      // Save final translation to state
      actions.setTranslation(finalTranslation)
    } catch (error) {
      console.error('Translation failed:', error)
    } finally {
      setIsTranslating(false)
    }
  }

  // Handle text selection
  const handleTextSelection = () => {
    if (isStreaming) return
    const selection = window.getSelection()
    const text = selection.toString().trim()
    if (text && text.length > 0) {
      actions.setSelectedText(text)
    }
  }

  // Open chat with selected text
  const handleOpenChat = () => {
    if (isStreaming) return
    if (selectedText) {
      setShowChat(true)
    }
  }

  // Send chat message
  const handleSendChat = async () => {
    if (isStreaming || !chatInput.trim() || isChatLoading) return

    const userMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
    }
    actions.addChatMessage(userMessage)
    setChatInput('')
    setIsChatLoading(true)

    try {
      const response = await chatAboutText(
        selectedText,
        chatInput,
        getLanguageName(settings.targetLanguage, LANGUAGES),
        getLanguageName(settings.nativeLanguage, LANGUAGES),
        chatMessages.map(m => ({ role: m.role, content: m.content }))
      )

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }
      actions.addChatMessage(assistantMessage)
    } catch (error) {
      console.error('Chat failed:', error)
    } finally {
      setIsChatLoading(false)
    }
  }

  // Explain word
  const handleExplainWord = async (word) => {
    if (isStreaming || !contentText) return
    actions.setSelectedText(word)
    setShowExplanation(true)
    setIsExplaining(true)
    setExplanation('')

    try {
      const result = await explainWord(
        word,
        getLanguageName(settings.targetLanguage, LANGUAGES),
        getLanguageName(settings.nativeLanguage, LANGUAGES),
        currentContent.text
      )
      setExplanation(result)
    } catch (error) {
      console.error('Explanation failed:', error)
      setExplanation('Failed to generate explanation. Please try again.')
    } finally {
      setIsExplaining(false)
    }
  }

  // Save to notebook
  const handleSave = () => {
    if (isStreaming || !currentContent) return
    actions.addToNotebook()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRetryGeneration = () => {
    cleanupStreaming()
    hasStartedRef.current = false
    actions.resetContent()
    actions.setGenerationError(null)
    actions.setGenerating(true)
  }

  const handleExit = () => {
    if (isStreaming) {
      cleanupStreaming()
      actions.resetContent()
      actions.setGenerating(false)
    }
    navigate('/')
  }

  return (
    <div className="page-container bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={handleExit}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2">
            <Badge variant="primary">{targetLang?.flag} {targetLang?.name}</Badge>
            <Badge variant="gray">{scene?.icon} {scene?.name}</Badge>
          </div>
          
          <button 
            onClick={handleExit}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Home className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">

        {generationError && (
          <Card className="p-4 mb-4 border-red-200 bg-red-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-600">Generation Failed</p>
                <p className="text-xs text-red-500 mt-1">{generationError}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleRetryGeneration}>
                Retry
              </Button>
            </div>
          </Card>
        )}
        
        {/* Play Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handlePlayFull}
            disabled={isStreaming || !contentText}
            className="relative w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isPlaying && <div className="pulse-ring" />}
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>

        {/* Text Content */}
        <Card className="p-3 mb-3">
          <div
            className={`text-sm leading-snug break-words ${isStreaming ? 'select-none pointer-events-none' : ''}`}
            style={{ letterSpacing: isCJKLanguage ? '0' : '-0.01em' }}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
          >
            {!contentText && isStreaming && (
              <span className="text-xs text-gray-400">Generating...</span>
            )}
            {tokens.map((token, index) => {
              if (token === '\n') {
                return <br key={index} />
              }
              
              // Check if next token is newline or end of array (no space needed after)
              const nextToken = tokens[index + 1]
              const needsSpace = !isCJKLanguage && nextToken && nextToken !== '\n'
              
              return (
                <span
                  key={index}
                  className="word-token cursor-pointer active:bg-primary-100 rounded-sm transition-colors"
                  onClick={() => handlePlayWord(token)}
                  onDoubleClick={() => handleExplainWord(token)}
                >
                  <span className={playingWord === token ? 'text-primary-600 font-medium' : ''}>
                    {token}
                  </span>
                  {playingWord === token && (
                    <Volume2 className="w-2.5 h-2.5 text-primary-500 inline ml-px" />
                  )}
                  {needsSpace && ' '}
                </span>
              )
            })}
            {isStreaming && <span className="typewriter-cursor" />}
          </div>
          
          {/* Translation */}
          {showTranslation && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {currentContent?.translation ? (
                <p className="text-gray-600 text-sm leading-snug whitespace-pre-wrap">
                  {currentContent?.translation}
                </p>
              ) : isTranslating ? (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1">Translating...</span>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* Selected Text Actions */}
        {selectedText && !isStreaming && (
          <Card className="p-3 mb-4 bg-primary-50 border-primary-200 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">Selected:</p>
                <p className="font-medium text-primary-700 truncate">{selectedText}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <IconButton
                  icon={MessageCircle}
                  size="sm"
                  variant="primary"
                  onClick={handleOpenChat}
                  title="Ask about this"
                />
                <IconButton
                  icon={Lightbulb}
                  size="sm"
                  variant="default"
                  onClick={() => handleExplainWord(selectedText)}
                  title="Explain this"
                />
                <IconButton
                  icon={X}
                  size="sm"
                  variant="ghost"
                  onClick={() => actions.setSelectedText('')}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="secondary"
            onClick={handleTranslate}
            loading={isTranslating}
            disabled={isStreaming || !contentText}
            className="justify-center"
          >
            <Languages className="w-4 h-4 mr-2" />
            {showTranslation ? 'Hide' : 'Translate'}
          </Button>
          
          <Button
            variant={saved ? 'primary' : 'secondary'}
            onClick={handleSave}
            disabled={saved || isStreaming || !currentContent}
            className="justify-center"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

      </main>

      {/* Chat Modal */}
      <Modal
        isOpen={showChat}
        onClose={() => {
          setShowChat(false)
          actions.clearChat()
        }}
        title={`Ask about: "${selectedText?.slice(0, 30)}${selectedText?.length > 30 ? '...' : ''}"`}
      >
        <div className="flex flex-col h-[60vh]">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Ask anything about this text!</p>
                <p className="text-sm mt-1">Grammar, meaning, usage...</p>
              </div>
            )}
            
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type your question..."
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
              />
              <Button
                variant="primary"
                onClick={handleSendChat}
                disabled={!chatInput.trim() || isChatLoading}
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Explanation Modal */}
      <Modal
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        title={`"${selectedText}"`}
      >
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {explanation ? (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800 prose-li:text-gray-700">
              <ReactMarkdown>{explanation}</ReactMarkdown>
              {isExplaining && <span className="typewriter-cursor" />}
            </div>
          ) : isExplaining ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-1">Generating explanation...</span>
            </div>
          ) : null}
          
          {/* Play pronunciation */}
          {selectedText && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePlayWord(selectedText)}
                className="w-full justify-center"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Listen to pronunciation
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
