import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { LANGUAGES, SCENES, LENGTH_OPTIONS, DIFFICULTY_LEVELS, AI_PROVIDERS, TTS_PROVIDERS } from '../utils/constants'
import { getAIConfig } from '../services/ai'
import { getTTSConfig } from '../services/tts'
import { getNextSuggestedExercise } from '../utils/planHelpers'
import { Button, Card, Select, Slider, Badge } from '../components/UI'
import { BookOpen, Sparkles, ArrowRight, Volume2, Settings, Target, TrendingUp } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { settings } = state
  
  const aiConfig = getAIConfig()
  const ttsConfig = getTTSConfig()
  const currentAIProvider = AI_PROVIDERS[aiConfig.provider]
  const currentTTSProvider = TTS_PROVIDERS[ttsConfig.provider]

  const handleStart = () => {
    actions.resetContent()
    actions.setGenerating(true)
    navigate('/result')
  }

  // 处理学习计划练习开始
  const handleStartPlanExercise = (suggestion) => {
    actions.setCurrentContent({
      text: suggestion.exercise.text,
      difficulty: suggestion.exercise.difficulty,
      scene: 'learning-plan',
      length: 'custom',
      moduleId: suggestion.module.id,
      exerciseId: suggestion.exercise.id,
      exerciseTitle: suggestion.exercise.title,
      moduleName: suggestion.module.name,
    })
    navigate('/result')
  }

  // 获取下一个建议练习
  const nextSuggestion = state.learningPlan ? getNextSuggestedExercise(state.learningPlan) : null

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
        {/* Learning Plan Section (如果存在学习计划) */}
        {state.learningPlan && (
          <>
            <Card className="p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-600" />
                  我的学习计划
                </h2>
                <button
                  onClick={() => navigate('/my-plan')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  查看全部 →
                </button>
              </div>

              <p className="text-gray-700 mb-3">{state.learningPlan.title}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">总进度</span>
                  <span className="font-semibold text-primary-600">
                    {state.learningPlan.overallProgress?.completedExercises || 0}/{state.learningPlan.overallProgress?.totalExercises || 0} ({state.learningPlan.overallProgress?.percentage || 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${state.learningPlan.overallProgress?.percentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Next Suggested Exercise */}
              {nextSuggestion ? (
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-4 rounded-xl border-2 border-primary-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-primary-600 font-semibold mb-1">💡 今日建议练习</p>
                      <p className="font-semibold text-gray-900">
                        {nextSuggestion.module.name} - {nextSuggestion.exercise.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                    <span>⏱️ 约{nextSuggestion.exercise.estimatedMinutes}分钟</span>
                    <span>难度: {'⭐'.repeat(nextSuggestion.exercise.difficulty)}</span>
                  </div>
                  <Button
                    variant="accent"
                    size="md"
                    className="w-full"
                    onClick={() => handleStartPlanExercise(nextSuggestion)}
                  >
                    开始练习
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 text-center">
                  <p className="text-green-800 font-semibold mb-1">🎉 恭喜！</p>
                  <p className="text-sm text-green-700">您已完成所有练习</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => navigate('/my-plan')}
                  className="px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  查看完整计划
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('创建新计划将会覆盖当前计划，是否继续？')) {
                      actions.resetPlan()
                      navigate('/create-plan')
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  修改计划
                </button>
              </div>
            </Card>

            {/* Separator */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm text-gray-500">或者</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          </>
        )}

        {/* No Plan: Create Plan CTA */}
        {!state.learningPlan && (
          <Card className="p-6 mb-4 text-center bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              系统化学习，事半功倍
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              告诉我你的学习目标，我会为你生成个性化的学习计划
            </p>
            <Button
              variant="accent"
              size="lg"
              onClick={() => navigate('/create-plan')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              创建学习计划
            </Button>

            {/* Separator */}
            <div className="flex items-center gap-3 mt-6 mb-2">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm text-gray-500">或</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          </Card>
        )}

        {/* Quick Practice Button */}
        <Card className="p-5 mb-4 text-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {state.learningPlan ? '快速练习' : '快速开始'}
          </h3>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleStart}
          >
            🎲 随机练习一个场景
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Card>

        {/* Language Settings */}
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
          <p className="text-xs text-gray-500">
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

        {/* Start Button (只在没有学习计划时显示) */}
        {!state.learningPlan && (
          <Button
            variant="accent"
            size="xl"
            className="w-full"
            onClick={handleStart}
          >
            Generate Content
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </main>
    </div>
  )
}
