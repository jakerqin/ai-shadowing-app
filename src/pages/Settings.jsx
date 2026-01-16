import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAIConfig, saveAIConfig } from '../services/ai'
import { getTTSConfig, saveTTSConfig } from '../services/tts'
import { AI_PROVIDERS, TTS_PROVIDERS } from '../utils/constants'
import { Button, Card, Select, Input } from '../components/UI'
import { ArrowLeft, Check, Settings as SettingsIcon, Key, Cpu, Volume2 } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const [aiConfig, setAIConfig] = useState(getAIConfig())
  const [ttsConfig, setTTSConfig] = useState(getTTSConfig())
  const [saved, setSaved] = useState(false)
  const [showAIKey, setShowAIKey] = useState(false)
  const [showTTSKey, setShowTTSKey] = useState(false)

  const currentAIProvider = AI_PROVIDERS[aiConfig.provider]
  const currentTTSProvider = TTS_PROVIDERS[ttsConfig.provider]
  
  const aiProviderOptions = Object.values(AI_PROVIDERS).map(p => ({
    value: p.id,
    label: `${p.icon} ${p.name}`,
  }))

  const aiModelOptions = currentAIProvider?.models.map(m => ({
    value: m.id,
    label: m.name,
  })) || []

  const ttsProviderOptions = Object.values(TTS_PROVIDERS).map(p => ({
    value: p.id,
    label: `${p.icon} ${p.name}`,
  }))

  const ttsVoiceOptions = currentTTSProvider?.voices.map(v => ({
    value: v.id,
    label: v.name,
  })) || []

  const handleAIProviderChange = (providerId) => {
    const provider = AI_PROVIDERS[providerId]
    setAIConfig({
      ...aiConfig,
      provider: providerId,
      model: provider.defaultModel,
    })
  }

  const handleTTSProviderChange = (providerId) => {
    const provider = TTS_PROVIDERS[providerId]
    setTTSConfig({
      ...ttsConfig,
      provider: providerId,
      voice: provider.defaultVoice,
    })
  }

  const handleSave = () => {
    saveAIConfig(aiConfig)
    saveTTSConfig(ttsConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page-container bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary-500" />
            Settings
          </h1>
          
          <div className="w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* AI Provider Section */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI Provider</h2>
          </div>
          
          <Select
            label="Select Provider"
            value={aiConfig.provider}
            onChange={handleAIProviderChange}
            options={aiProviderOptions}
            className="mb-4"
          />
          
          <Select
            label="Model"
            value={aiConfig.model}
            onChange={(model) => setAIConfig({ ...aiConfig, model })}
            options={aiModelOptions}
            className="mb-4"
          />

          {/* Custom AI API */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">
              Custom API (optional - leave empty to use env variables)
            </p>
            
            <Input
              label="Base URL"
              value={aiConfig.customBaseUrl}
              onChange={(value) => setAIConfig({ ...aiConfig, customBaseUrl: value })}
              placeholder={
                aiConfig.provider === 'gemini' ? 'e.g., https://generativelanguage.googleapis.com' :
                aiConfig.provider === 'openai' ? 'e.g., https://api.openai.com' :
                aiConfig.provider === 'anthropic' ? 'e.g., https://api.anthropic.com' :
                aiConfig.provider === 'glm' ? 'e.g., https://open.bigmodel.cn' :
                'e.g., https://api.example.com'
              }
              className="mb-3"
            />
            
            <div className="relative">
              <Input
                label="API Key"
                type={showAIKey ? 'text' : 'password'}
                value={aiConfig.customApiKey}
                onChange={(value) => setAIConfig({ ...aiConfig, customApiKey: value })}
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={() => setShowAIKey(!showAIKey)}
                className="absolute right-3 top-9 text-sm text-primary-500 hover:text-primary-600"
              >
                {showAIKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </Card>

        {/* TTS Provider Section */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-gray-900">TTS Provider</h2>
          </div>
          
          <Select
            label="Select Provider"
            value={ttsConfig.provider}
            onChange={handleTTSProviderChange}
            options={ttsProviderOptions}
            className="mb-4"
          />
          
          <Select
            label="Voice"
            value={ttsConfig.voice}
            onChange={(voice) => setTTSConfig({ ...ttsConfig, voice })}
            options={ttsVoiceOptions}
            className="mb-4"
          />

          {/* Custom TTS API */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">
              Custom API (optional - leave empty to use env variables)
            </p>
            
            <Input
              label="Base URL"
              value={ttsConfig.customBaseUrl}
              onChange={(value) => setTTSConfig({ ...ttsConfig, customBaseUrl: value })}
              placeholder={`e.g., https://api.example.com`}
              className="mb-3"
            />
            
            <div className="relative">
              <Input
                label="API Key"
                type={showTTSKey ? 'text' : 'password'}
                value={ttsConfig.customApiKey}
                onChange={(value) => setTTSConfig({ ...ttsConfig, customApiKey: value })}
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={() => setShowTTSKey(!showTTSKey)}
                className="absolute right-3 top-9 text-sm text-primary-500 hover:text-primary-600"
              >
                {showTTSKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </Card>

        {/* Provider Info */}
        <Card className="p-5 bg-primary-50 border-primary-200">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-primary-900 flex items-center gap-2">
                {currentAIProvider?.icon} {currentAIProvider?.name}
              </h3>
              <p className="text-sm text-primary-700">
                {aiConfig.provider === 'gemini' && 'Google Gemini - Fast, multimodal AI with excellent language understanding.'}
                {aiConfig.provider === 'openai' && 'OpenAI GPT - High-quality text generation and understanding.'}
                {aiConfig.provider === 'anthropic' && 'Claude - Nuanced, helpful, and safe responses.'}
                {aiConfig.provider === 'glm' && 'GLM (智谱) - Excellent Chinese language support.'}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-primary-900">
                {currentTTSProvider?.icon} {currentTTSProvider?.name}
              </h3>
              <p className="text-sm text-primary-700">
                {ttsConfig.provider === 'openai' && 'OpenAI TTS - Natural, expressive voices.'}
                {ttsConfig.provider === 'glm' && 'GLM TTS - High-quality Chinese speech synthesis.'}
                {ttsConfig.provider === 'azure' && 'Azure Speech - Enterprise-grade TTS with many voices.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button
          variant={saved ? 'primary' : 'accent'}
          size="lg"
          className="w-full"
          onClick={handleSave}
        >
          {saved ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Saved!
            </>
          ) : (
            'Save Settings'
          )}
        </Button>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500">
          Settings are saved locally on your device.
        </p>
      </main>
    </div>
  )
}
