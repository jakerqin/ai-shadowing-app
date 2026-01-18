import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Button, Card, Badge } from '../components/UI'
import { ArrowLeft, BookOpen, Clock, TrendingUp } from 'lucide-react'

export default function PlanPreview() {
  const navigate = useNavigate()
  const { state } = useApp()
  const { learningPlan } = state

  // 如果没有学习计划或数据不完整，重定向到创建页面
  useEffect(() => {
    if (!learningPlan) {
      navigate('/create-plan')
      return
    }

    // 添加数据完整性检查
    if (!learningPlan.modules?.length || !learningPlan.overallProgress) {
      console.error('学习计划数据不完整')
      navigate('/create-plan')
    }
  }, [learningPlan, navigate])

  // 渲染保护
  if (!learningPlan) {
    return null
  }

  const handleStartLearning = () => {
    navigate('/')
  }

  const handleRegenerate = () => {
    if (window.confirm('重新生成将丢失当前计划,是否继续?')) {
      navigate('/create-plan')
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 text-white">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
          <button
            onClick={() => navigate('/create-plan')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>

          <h1 className="text-2xl font-bold mb-2">
            📚 为您生成的学习计划
          </h1>
          <h2 className="text-xl text-white/90">
            {learningPlan?.title || '未命名计划'}
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-4 pb-8">
        {/* Overview */}
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900">学习概览</span>
            </div>
            <Badge className="bg-primary-100 text-primary-700 border-0">
              {learningPlan?.modules?.length || 0} 个模块
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">
                {learningPlan?.overallProgress?.totalExercises || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">总练习数</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">
                {Math.round(
                  (learningPlan?.modules || []).reduce((sum, m) =>
                    sum + (m?.exercises || []).reduce((s, e) =>
                      s + (Number(e?.estimatedMinutes) || 0), 0
                    ), 0
                  ) / 60
                )}h
              </div>
              <div className="text-sm text-gray-600 mt-1">预计时长</div>
            </div>
          </div>
        </Card>

        {/* Modules */}
        <div className="space-y-4 mb-6">
          {(learningPlan?.modules || []).map((module, moduleIndex) => (
            <Card key={module.id} className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                  {moduleIndex + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {module?.name || '未命名模块'}
                  </h3>
                  {module?.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {module.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <BookOpen className="w-4 h-4" />
                    <span>{module?.exercises?.length || 0} 个练习</span>
                  </div>
                </div>
              </div>

              {/* Show first 3 exercises as preview */}
              <div className="mt-3 space-y-2">
                {(module?.exercises || []).slice(0, 3).map((exercise, exIndex) => (
                  <div
                    key={exercise?.id || exIndex}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xs text-gray-500 w-6">
                      {exIndex + 1}.
                    </span>
                    <span className="text-sm text-gray-700 flex-1">
                      {exercise?.title || '未命名练习'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{exercise?.estimatedMinutes || 0}分钟</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < (exercise?.difficulty || 0) ? 'bg-primary-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {(module?.exercises?.length || 0) > 3 && (
                  <p className="text-xs text-gray-500 text-center pt-1">
                    还有 {(module?.exercises?.length || 0) - 3} 个练习...
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="accent"
            size="xl"
            className="w-full"
            onClick={handleStartLearning}
          >
            开始学习
            <TrendingUp className="w-5 h-5 ml-2" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleRegenerate}
          >
            重新生成
          </Button>
        </div>
      </main>
    </div>
  )
}
