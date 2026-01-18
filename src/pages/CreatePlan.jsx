import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { generateLearningPlan } from '../services/planGenerator'
import { Button, Card } from '../components/UI'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'

export default function CreatePlan() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { settings } = state
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [progressMessage, setProgressMessage] = useState('')

  // 防止组件卸载后的状态更新（内存泄漏）
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const examples = [
    '我想在2周内准备雅思口语考试',
    '学习日常旅游英语，准备去美国旅行',
    '提升商务邮件写作和会议沟通能力',
    '准备英语面试，重点是自我介绍和回答问题',
  ]

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError('请输入您的学习目标')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgressMessage('正在分析您的需求...')

    try {
      const plan = await generateLearningPlan(
        input,
        settings.nativeLanguage,
        settings.targetLanguage,
        (progress) => {
          if (!isMountedRef.current) return

          if (progress.type === 'chunk') {
            setProgressMessage('正在生成学习计划...')
          } else if (progress.type === 'parsing') {
            setProgressMessage('正在整理学习路径...')
          }
        }
      )

      if (!isMountedRef.current) return

      // 保存计划到state（会自动保存到localStorage）
      actions.setLearningPlan(plan)

      // 跳转到预览页面
      navigate('/plan-preview')
    } catch (err) {
      if (!isMountedRef.current) return

      console.error('生成计划失败:', err)
      setError(err.message || '生成计划失败，请稍后重试')
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false)
        setProgressMessage('')
      }
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 text-white">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>

          <h1 className="text-3xl font-bold mb-2">
            创建学习计划 <Sparkles className="inline w-7 h-7 text-accent-300" />
          </h1>
          <p className="text-white/90">
            告诉我您的学习目标，我将为您生成个性化的学习路径
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-4 pb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">描述您的学习目标</h2>

          {/* Examples */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">示例：</p>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example)}
                  disabled={isGenerating}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  • {example}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (error) setError(null)
            }}
            disabled={isGenerating}
            placeholder="请详细描述您的学习目标，包括学习场景、时间计划、重点领域等..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            rows={5}
          />

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{progressMessage}</p>
                  <p className="text-xs text-blue-600 mt-1">预计需要30-60秒，请稍候...</p>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            variant="accent"
            size="xl"
            className="w-full mt-6"
            onClick={handleGenerate}
            disabled={isGenerating || !input.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                生成学习计划
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </Card>
      </main>
    </div>
  )
}
