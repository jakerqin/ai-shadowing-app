import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Button, Card } from '../components/UI'
import { ArrowLeft, Check, Circle, Trash2, PlusCircle, Clock } from 'lucide-react'

export default function MyPlan() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { learningPlan, settings } = state

  // 如果没有学习计划，显示空状态
  if (!learningPlan) {
    return (
      <div className="page-container">
        <header className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 text-white">
          <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/90 hover:text-white mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>

            <h1 className="text-3xl font-bold">我的学习计划</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 -mt-4 pb-8">
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              暂无学习计划
            </h2>
            <p className="text-gray-600 mb-6">
              创建一个学习计划，开始系统化的语言学习吧！
            </p>
            <Button
              variant="accent"
              onClick={() => navigate('/create-plan')}
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              创建学习计划
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  const handleStartExercise = (module, exercise) => {
    // 设置当前内容并跳转到Result页面
    actions.setCurrentContent({
      text: exercise.text,
      difficulty: exercise.difficulty,
      scene: 'learning-plan',
      length: 'custom',
      moduleId: module.id,
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      moduleName: module.name,
    })
    navigate('/result')
  }

  const handleDeletePlan = () => {
    if (window.confirm('确定要删除这个学习计划吗？删除后无法恢复。')) {
      actions.resetPlan()
      navigate('/')
    }
  }

  const handleCreateNewPlan = () => {
    if (window.confirm('创建新计划将会覆盖当前计划，是否继续？')) {
      actions.resetPlan()
      navigate('/create-plan')
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

          <h1 className="text-2xl font-bold mb-2">
            {learningPlan.title}
          </h1>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/90">总进度</span>
              <span className="font-semibold">
                {learningPlan.overallProgress?.completedExercises || 0}/{learningPlan.overallProgress?.totalExercises || 0} ({learningPlan.overallProgress?.percentage || 0}%)
              </span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-400 transition-all duration-500"
                style={{ width: `${learningPlan.overallProgress?.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-4 pb-8">
        {/* Modules */}
        <div className="space-y-4 mb-6">
          {(learningPlan.modules || []).map((module) => {
            const isCompleted = (module.progress?.completed || 0) === (module.progress?.total || 0)

            return (
              <Card key={module.id} className="overflow-hidden">
                {/* Module Header */}
                <div className={`p-4 ${isCompleted ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                        {module.name}
                      </h3>
                      {module.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      <span className={isCompleted ? 'text-green-700' : 'text-primary-600'}>
                        {module.progress?.completed || 0}/{module.progress?.total || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exercises */}
                <div className="p-4 space-y-2">
                  {(module.exercises || []).map((exercise) => (
                    <div
                      key={exercise.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        exercise.completed
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-primary-200'
                      }`}
                    >
                      {exercise.completed ? (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${exercise.completed ? 'text-green-900' : 'text-gray-900'}`}>
                          {exercise.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{exercise.estimatedMinutes || 10}分钟</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < (exercise.difficulty || 3) ? 'bg-primary-500' : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {!exercise.completed && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStartExercise(module, exercise)}
                        >
                          开始
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleCreateNewPlan}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            创建新计划
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={handleDeletePlan}
          >
            <Trash2 className="w-5 h-5 mr-2" />
            删除计划
          </Button>
        </div>
      </main>
    </div>
  )
}
