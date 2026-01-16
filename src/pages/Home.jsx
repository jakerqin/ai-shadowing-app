import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { LANGUAGES, SCENES, LENGTH_OPTIONS, DIFFICULTY_LEVELS, AI_PROVIDERS, TTS_PROVIDERS } from '../utils/constants'
import { getAIConfig } from '../services/ai'
import { getTTSConfig } from '../services/tts'
import { Button, Card, Select, Slider, Badge } from '../components/UI'
import { BookOpen, Sparkles, ArrowRight, Volume2, Settings } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { settings } = state
  
  const aiConfig = getAIConfig()
  const ttsConfig = getTTSConfig()
  const currentAIProvider = AI_PROVIDERS[aiConfig.provider]
  const currentTTSProvider = TTS_PROVIDERS[ttsConfig.provider]

  const handleStart = () => {
    navigate('/generate')
  }

  const languageOptions = LANGUAGES.map(lang => ({
    value: lang.code,
    label: `${lang.flag} ${lang.nativeName} (${lang.name})`,
  }))

  const difficultyLabels = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Upper-Int',
    5: 'Advanced',
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 text-white">
        <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Volume2 className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl">AI Shadowing</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/notebook')}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Notebook"
              >
                <BookOpen className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">
            Practice Speaking <Sparkles className="inline w-7 h-7 text-accent-300" />
          </h1>
          <p className="text-white/80">
            Generate AI-powered content and practice pronunciation in any language
          </p>
          
          {/* Current Provider Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="bg-white/20 text-white border-0">
              {currentAIProvider?.icon} {currentAIProvider?.name}
            </Badge>
            <Badge className="bg-white/20 text-white border-0">
              {currentTTSProvider?.icon} {currentTTSProvider?.name}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-4 pb-8">
        <Card className="p-5 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Language Settings</h2>
          
          {/* Native Language */}
          <Select
            label="Your Native Language"
            value={settings.nativeLanguage}
            onChange={(value) => actions.setSettings({ nativeLanguage: value })}
            options={languageOptions}
            className="mb-4"
          />
          
          {/* Target Language */}
          <Select
            label="Language to Practice"
            value={settings.targetLanguage}
            onChange={(value) => actions.setSettings({ targetLanguage: value })}
            options={languageOptions}
            className="mb-4"
          />
          
          {/* Difficulty */}
          <Slider
            label="Difficulty Level"
            value={settings.difficulty}
            onChange={(value) => actions.setSettings({ difficulty: value })}
            min={1}
            max={5}
            valueLabels={difficultyLabels}
            className="mb-2"
          />
          <p className="text-xs text-gray-500 mb-4">
            {DIFFICULTY_LEVELS.find(d => d.level === settings.difficulty)?.description}
          </p>
        </Card>

        {/* Scene Selection */}
        <Card className="p-5 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Scene</h2>
          <div className="grid grid-cols-2 gap-3">
            {SCENES.map((scene) => (
              <button
                key={scene.id}
                onClick={() => actions.setSettings({ scene: scene.id })}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  settings.scene === scene.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-2xl mb-2 block">{scene.icon}</span>
                <span className={`font-medium block ${
                  settings.scene === scene.id ? 'text-primary-700' : 'text-gray-900'
                }`}>
                  {scene.name}
                </span>
                <span className="text-xs text-gray-500 line-clamp-2">{scene.description}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Length Selection */}
        <Card className="p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Length</h2>
          <div className="flex gap-3">
            {LENGTH_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => actions.setSettings({ length: option.id })}
                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  settings.length === option.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className={`font-semibold block ${
                  settings.length === option.id ? 'text-primary-700' : 'text-gray-900'
                }`}>
                  {option.name}
                </span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Start Button */}
        <Button
          variant="accent"
          size="xl"
          className="w-full"
          onClick={handleStart}
        >
          Generate Content
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </main>
    </div>
  )
}
