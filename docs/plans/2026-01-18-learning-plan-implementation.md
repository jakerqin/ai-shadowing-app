# 学习计划功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 实现基于AI生成的个性化学习计划系统，用户可通过自然语言描述学习目标，系统生成模块化学习路径并跟踪进度

**架构：** 扩展现有AppContext状态管理，添加学习计划相关state和actions；创建AI生成服务复用现有AI配置；新增3个页面（创建计划、预览计划、我的计划）；修改首页支持学习计划展示

**技术栈：** React 18, React Router v7, Vite, TailwindCSS, Lucide Icons, 现有AI服务（Gemini/OpenAI/GLM）

---

## Task 1: 扩展状态管理 - 添加学习计划相关State

**文件：**
- Modify: `src/store/AppContext.jsx`
- Modify: `src/utils/constants.js`

**Step 1: 添加localStorage key常量**

在 `src/utils/constants.js:156-163` 的 STORAGE_KEYS 对象中添加：

```javascript
export const STORAGE_KEYS = {
  NOTEBOOK: 'ai-shadowing-notebook',
  SETTINGS: 'ai-shadowing-settings',
  AI_CONFIG: 'ai-shadowing-ai-config',
  TTS_CONFIG: 'ai-shadowing-tts-config',
  AUDIO_CACHE: 'ai-shadowing-audio-cache',
  LEARNING_PLAN: 'ai-shadowing-learning-plan',  // 新增
}
```

**Step 2: 在AppContext中添加学习计划状态**

修改 `src/store/AppContext.jsx:6-34` 的 initialState：

```javascript
const initialState = {
  // User settings
  settings: {
    nativeLanguage: 'zh',
    targetLanguage: 'en',
    difficulty: 3,
    scene: 'daily',
    length: 'medium',
  },

  // Current generated content
  currentContent: null,

  // Generation status
  isGenerating: false,
  generationError: null,

  // Notebook entries
  notebook: [],

  // Chat state
  chatMessages: [],
  selectedText: '',

  // UI state
  showTranslation: false,
  isPlaying: false,

  // Learning plan state (新增)
  learningPlan: null,
  planGenerating: false,
  planGenerationError: null,
}
```

**Step 3: 添加学习计划Action类型**

在 `src/store/AppContext.jsx:36-52` 的 ActionTypes 中添加：

```javascript
const ActionTypes = {
  SET_SETTINGS: 'SET_SETTINGS',
  SET_CURRENT_CONTENT: 'SET_CURRENT_CONTENT',
  SET_GENERATING: 'SET_GENERATING',
  SET_GENERATION_ERROR: 'SET_GENERATION_ERROR',
  ADD_TO_NOTEBOOK: 'ADD_TO_NOTEBOOK',
  REMOVE_FROM_NOTEBOOK: 'REMOVE_FROM_NOTEBOOK',
  SET_NOTEBOOK: 'SET_NOTEBOOK',
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  CLEAR_CHAT: 'CLEAR_CHAT',
  SET_SELECTED_TEXT: 'SET_SELECTED_TEXT',
  TOGGLE_TRANSLATION: 'TOGGLE_TRANSLATION',
  SET_TRANSLATION: 'SET_TRANSLATION',
  SET_PLAYING: 'SET_PLAYING',
  UPDATE_CURRENT_CONTENT_TEXT: 'UPDATE_CURRENT_CONTENT_TEXT',
  RESET_CONTENT: 'RESET_CONTENT',
  // Learning plan actions (新增)
  SET_LEARNING_PLAN: 'SET_LEARNING_PLAN',
  SET_PLAN_GENERATING: 'SET_PLAN_GENERATING',
  SET_PLAN_GENERATION_ERROR: 'SET_PLAN_GENERATION_ERROR',
  COMPLETE_EXERCISE: 'COMPLETE_EXERCISE',
  RESET_PLAN: 'RESET_PLAN',
}
```

**Step 4: 添加reducer处理逻辑**

在 `src/store/AppContext.jsx:55` 的 appReducer switch语句最后（在default之前）添加：

```javascript
    case ActionTypes.SET_LEARNING_PLAN:
      return {
        ...state,
        learningPlan: action.payload,
        planGenerating: false,
        planGenerationError: null,
      }

    case ActionTypes.SET_PLAN_GENERATING:
      return {
        ...state,
        planGenerating: action.payload,
        planGenerationError: action.payload ? null : state.planGenerationError,
      }

    case ActionTypes.SET_PLAN_GENERATION_ERROR:
      return {
        ...state,
        planGenerationError: action.payload,
        planGenerating: false,
      }

    case ActionTypes.COMPLETE_EXERCISE:
      if (!state.learningPlan) return state

      const { moduleId, exerciseId } = action.payload
      const updatedModules = state.learningPlan.modules.map(module => {
        if (module.id !== moduleId) return module

        const updatedExercises = module.exercises.map(exercise => {
          if (exercise.id !== exerciseId) return exercise
          return {
            ...exercise,
            completed: true,
            completedAt: new Date().toISOString(),
          }
        })

        const completedCount = updatedExercises.filter(ex => ex.completed).length

        return {
          ...module,
          exercises: updatedExercises,
          progress: {
            total: module.exercises.length,
            completed: completedCount,
          }
        }
      })

      const totalExercises = updatedModules.reduce((sum, m) => sum + m.exercises.length, 0)
      const completedExercises = updatedModules.reduce((sum, m) => sum + m.progress.completed, 0)

      return {
        ...state,
        learningPlan: {
          ...state.learningPlan,
          modules: updatedModules,
          overallProgress: {
            totalExercises,
            completedExercises,
            percentage: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
          }
        }
      }

    case ActionTypes.RESET_PLAN:
      return {
        ...state,
        learningPlan: null,
        planGenerating: false,
        planGenerationError: null,
      }
```

**Step 5: 添加localStorage持久化**

在 `src/store/AppContext.jsx:179-191` 的useEffect中添加学习计划加载：

```javascript
  // Load notebook from localStorage on mount
  useEffect(() => {
    const savedNotebook = localStorage.getItem(STORAGE_KEYS.NOTEBOOK)
    if (savedNotebook) {
      const parsed = safeJsonParse(savedNotebook, [])
      dispatch({ type: ActionTypes.SET_NOTEBOOK, payload: parsed })
    }

    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (savedSettings) {
      const parsed = safeJsonParse(savedSettings, {})
      dispatch({ type: ActionTypes.SET_SETTINGS, payload: parsed })
    }

    // 新增：加载学习计划
    const savedPlan = localStorage.getItem(STORAGE_KEYS.LEARNING_PLAN)
    if (savedPlan) {
      const parsed = safeJsonParse(savedPlan, null)
      dispatch({ type: ActionTypes.SET_LEARNING_PLAN, payload: parsed })
    }
  }, [])
```

在 `src/store/AppContext.jsx:193-201` 的useEffect之后添加新的useEffect：

```javascript
  // Save learning plan to localStorage when it changes
  useEffect(() => {
    if (state.learningPlan) {
      localStorage.setItem(STORAGE_KEYS.LEARNING_PLAN, JSON.stringify(state.learningPlan))
    } else {
      localStorage.removeItem(STORAGE_KEYS.LEARNING_PLAN)
    }
  }, [state.learningPlan])
```

**Step 6: 添加action creators**

在 `src/store/AppContext.jsx:204-260` 的actions对象中添加：

```javascript
    setLearningPlan: (plan) => {
      dispatch({ type: ActionTypes.SET_LEARNING_PLAN, payload: plan })
    },

    setPlanGenerating: (isGenerating) => {
      dispatch({ type: ActionTypes.SET_PLAN_GENERATING, payload: isGenerating })
    },

    setPlanGenerationError: (error) => {
      dispatch({ type: ActionTypes.SET_PLAN_GENERATION_ERROR, payload: error })
    },

    completeExercise: (moduleId, exerciseId) => {
      dispatch({ type: ActionTypes.COMPLETE_EXERCISE, payload: { moduleId, exerciseId } })
    },

    resetPlan: () => {
      dispatch({ type: ActionTypes.RESET_PLAN })
    },
```

**Step 7: 验证并提交**

验证：检查文件语法，确保没有遗漏的逗号或括号

```bash
cd /Volumes/Samsung990Pro/workspace/self/coding/jsProject/ai-shadowing-app/.worktrees/feature/learning-plan
npm run build
```

预期：构建成功，无语法错误

提交：

```bash
git add src/store/AppContext.jsx src/utils/constants.js
git commit -m "feat(state): add learning plan state management

- Add LEARNING_PLAN to localStorage keys
- Add learningPlan, planGenerating, planGenerationError to state
- Add action types for plan operations
- Implement reducer logic for plan CRUD and exercise completion
- Add localStorage persistence for learning plan
- Add action creators for plan management"
```

---

## Task 2: 创建工具函数 - 学习计划辅助方法

**文件：**
- Create: `src/utils/planHelpers.js`

**Step 1: 创建planHelpers.js文件**

创建 `src/utils/planHelpers.js`：

```javascript
/**
 * 学习计划相关工具函数
 */

/**
 * 获取下一个建议练习
 * @param {Object} plan - 学习计划对象
 * @returns {Object|null} - { module, exercise } 或 null（所有练习已完成）
 */
export function getNextSuggestedExercise(plan) {
  if (!plan) return null

  for (const module of plan.modules) {
    const nextExercise = module.exercises.find(ex => !ex.completed)
    if (nextExercise) {
      return {
        module,
        exercise: nextExercise,
      }
    }
  }

  return null // 所有练习已完成
}

/**
 * 计算学习计划的总体进度
 * @param {Object} plan - 学习计划对象
 * @returns {Object} - { total, completed, percentage }
 */
export function calculateProgress(plan) {
  if (!plan) return { total: 0, completed: 0, percentage: 0 }

  let total = 0
  let completed = 0

  plan.modules.forEach(module => {
    module.exercises.forEach(exercise => {
      total++
      if (exercise.completed) completed++
    })
  })

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/**
 * 更新模块进度统计
 * @param {Object} module - 模块对象
 * @returns {Object} - 更新后的模块对象
 */
export function updateModuleProgress(module) {
  const completed = module.exercises.filter(ex => ex.completed).length
  return {
    ...module,
    progress: {
      total: module.exercises.length,
      completed,
    }
  }
}

/**
 * 检查学习计划是否已完成
 * @param {Object} plan - 学习计划对象
 * @returns {boolean}
 */
export function isPlanCompleted(plan) {
  if (!plan) return false
  return plan.overallProgress.percentage === 100
}

/**
 * 获取模块完成状态
 * @param {Object} module - 模块对象
 * @returns {boolean}
 */
export function isModuleCompleted(module) {
  return module.progress.completed === module.progress.total
}
```

**Step 2: 验证并提交**

验证：确保文件创建成功

```bash
ls -la src/utils/planHelpers.js
```

预期：文件存在

提交：

```bash
git add src/utils/planHelpers.js
git commit -m "feat(utils): add plan helper functions

- getNextSuggestedExercise: find next uncompleted exercise
- calculateProgress: compute overall plan progress
- updateModuleProgress: update module statistics
- isPlanCompleted: check if all exercises are done
- isModuleCompleted: check if module is done"
```

---

## Task 3: 创建AI生成服务 - 学习计划生成器

**文件：**
- Create: `src/services/planGenerator.js`

**Step 1: 创建planGenerator.js基础结构**

创建 `src/services/planGenerator.js`：

```javascript
import { streamGenerateContent } from './ai'

/**
 * 生成学习计划的AI提示词
 * @param {string} userInput - 用户输入的学习目标
 * @param {string} nativeLanguage - 母语代码
 * @param {string} targetLanguage - 目标语言代码
 * @returns {string} - AI提示词
 */
function generatePlanPrompt(userInput, nativeLanguage, targetLanguage) {
  return `You are a language learning expert. Based on the user's learning goal, generate a structured learning plan.

User's Goal: ${userInput}
Native Language: ${nativeLanguage}
Target Language: ${targetLanguage}

Generate a learning plan with the following structure:

1. Analyze the user's goal and determine:
   - Main focus areas (e.g., interview, travel, daily conversation)
   - Estimated difficulty level (1-5)
   - Suggested learning modules

2. Create 3-5 learning modules, each containing 4-8 exercises

3. For each exercise, generate:
   - A clear title
   - Practical content in the target language (2-6 sentences)
   - Appropriate difficulty level (1-5)
   - Estimated time in minutes (5-15)

IMPORTANT: Return ONLY a valid JSON object in this exact format (no markdown code blocks):
{
  "title": "Plan title in Chinese",
  "modules": [
    {
      "name": "Module name in Chinese",
      "description": "Brief description in Chinese",
      "exercises": [
        {
          "title": "Exercise title in Chinese",
          "text": "Content in ${targetLanguage}",
          "difficulty": 2,
          "estimatedMinutes": 5
        }
      ]
    }
  ]
}

Make the content practical, progressive in difficulty, and directly related to the user's goal.
Ensure the JSON is valid and can be parsed directly without any modifications.`
}

/**
 * 解析AI响应，提取JSON数据
 * @param {string} response - AI原始响应
 * @returns {Object} - 解析后的计划数据
 */
function parseAIPlanResponse(response) {
  try {
    // 尝试直接解析JSON
    return JSON.parse(response)
  } catch (error) {
    // 如果失败，尝试去除markdown代码块标记
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                     response.match(/```\s*([\s\S]*?)\s*```/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    throw new Error('无法解析AI响应为有效的JSON格式')
  }
}

/**
 * 构建完整的学习计划对象
 * @param {Object} planData - AI返回的计划数据
 * @param {string} userInput - 用户原始输入
 * @param {string} nativeLanguage - 母语代码
 * @param {string} targetLanguage - 目标语言代码
 * @returns {Object} - 完整的学习计划对象
 */
function buildPlanObject(planData, userInput, nativeLanguage, targetLanguage) {
  const planId = `plan_${Date.now()}`

  const modules = planData.modules.map((module, moduleIndex) => {
    const exercises = module.exercises.map((exercise, exerciseIndex) => ({
      id: `${planId}_ex_${moduleIndex}_${exerciseIndex}`,
      title: exercise.title,
      text: exercise.text,
      difficulty: exercise.difficulty || 3,
      estimatedMinutes: exercise.estimatedMinutes || 10,
      completed: false,
      completedAt: null,
    }))

    return {
      id: `${planId}_mod_${moduleIndex}`,
      name: module.name,
      description: module.description || '',
      order: moduleIndex + 1,
      exercises,
      progress: {
        total: exercises.length,
        completed: 0,
      }
    }
  })

  const totalExercises = modules.reduce((sum, m) => sum + m.exercises.length, 0)

  return {
    id: planId,
    title: planData.title,
    userInput,
    createdAt: new Date().toISOString(),
    targetLanguage,
    nativeLanguage,
    modules,
    overallProgress: {
      totalExercises,
      completedExercises: 0,
      percentage: 0,
    }
  }
}

/**
 * 生成学习计划
 * @param {string} userInput - 用户输入的学习目标
 * @param {string} nativeLanguage - 母语代码
 * @param {string} targetLanguage - 目标语言代码
 * @param {Function} onProgress - 进度回调函数（可选）
 * @returns {Promise<Object>} - 生成的学习计划对象
 */
export async function generateLearningPlan(userInput, nativeLanguage, targetLanguage, onProgress) {
  const prompt = generatePlanPrompt(userInput, nativeLanguage, targetLanguage)

  try {
    // 调用AI生成内容
    let fullResponse = ''

    await streamGenerateContent(prompt, {
      onChunk: (chunk) => {
        fullResponse += chunk
        if (onProgress) {
          onProgress({ type: 'chunk', data: chunk })
        }
      }
    })

    if (onProgress) {
      onProgress({ type: 'parsing', data: null })
    }

    // 解析AI响应
    const planData = parseAIPlanResponse(fullResponse)

    // 构建完整的计划对象
    const plan = buildPlanObject(planData, userInput, nativeLanguage, targetLanguage)

    if (onProgress) {
      onProgress({ type: 'complete', data: plan })
    }

    return plan
  } catch (error) {
    console.error('生成学习计划失败:', error)
    throw new Error(`生成学习计划失败: ${error.message}`)
  }
}
```

**Step 2: 验证并提交**

验证：检查文件语法

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/services/planGenerator.js
git commit -m "feat(service): add AI learning plan generator

- generatePlanPrompt: create AI prompt for plan generation
- parseAIPlanResponse: parse and clean AI JSON response
- buildPlanObject: construct complete plan object with IDs
- generateLearningPlan: main function to generate plan via AI
- Support progress callbacks for UI feedback"
```

---

## Task 4: 创建UI页面 - 创建学习计划

**文件：**
- Create: `src/pages/CreatePlan.jsx`

**Step 1: 创建CreatePlan.jsx页面**

创建 `src/pages/CreatePlan.jsx`：

```javascript
import { useState } from 'react'
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
          if (progress.type === 'chunk') {
            setProgressMessage('正在生成学习计划...')
          } else if (progress.type === 'parsing') {
            setProgressMessage('正在整理学习路径...')
          }
        }
      )

      // 保存计划到state（会自动保存到localStorage）
      actions.setLearningPlan(plan)

      // 跳转到预览页面
      navigate('/plan-preview')
    } catch (err) {
      console.error('生成计划失败:', err)
      setError(err.message || '生成计划失败，请稍后重试')
    } finally {
      setIsGenerating(false)
      setProgressMessage('')
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
            onChange={(e) => setInput(e.target.value)}
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
```

**Step 2: 验证并提交**

验证：

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/pages/CreatePlan.jsx
git commit -m "feat(ui): add create learning plan page

- User input field for learning goals
- Example goals for quick selection
- AI generation with progress feedback
- Error handling and loading states
- Navigate to preview after generation"
```

---

## Task 5: 创建UI页面 - 预览学习计划

**文件：**
- Create: `src/pages/PlanPreview.jsx`

**Step 1: 创建PlanPreview.jsx页面**

创建 `src/pages/PlanPreview.jsx`：

```javascript
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Button, Card, Badge } from '../components/UI'
import { ArrowLeft, BookOpen, Clock, TrendingUp } from 'lucide-react'

export default function PlanPreview() {
  const navigate = useNavigate()
  const { state } = useApp()
  const { learningPlan } = state

  // 如果没有学习计划，重定向到创建页面
  if (!learningPlan) {
    navigate('/create-plan')
    return null
  }

  const handleStartLearning = () => {
    navigate('/')
  }

  const handleRegenerate = () => {
    navigate('/create-plan')
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
            {learningPlan.title}
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
              {learningPlan.modules.length} 个模块
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">
                {learningPlan.overallProgress.totalExercises}
              </div>
              <div className="text-sm text-gray-600 mt-1">总练习数</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">
                {Math.round(
                  learningPlan.modules.reduce((sum, m) =>
                    sum + m.exercises.reduce((s, e) => s + e.estimatedMinutes, 0), 0
                  ) / 60
                )}h
              </div>
              <div className="text-sm text-gray-600 mt-1">预计时长</div>
            </div>
          </div>
        </Card>

        {/* Modules */}
        <div className="space-y-4 mb-6">
          {learningPlan.modules.map((module, moduleIndex) => (
            <Card key={module.id} className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                  {moduleIndex + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {module.name}
                  </h3>
                  {module.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {module.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <BookOpen className="w-4 h-4" />
                    <span>{module.exercises.length} 个练习</span>
                  </div>
                </div>
              </div>

              {/* Show first 3 exercises as preview */}
              <div className="mt-3 space-y-2">
                {module.exercises.slice(0, 3).map((exercise, exIndex) => (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xs text-gray-500 w-6">
                      {exIndex + 1}.
                    </span>
                    <span className="text-sm text-gray-700 flex-1">
                      {exercise.title}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{exercise.estimatedMinutes}分钟</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < exercise.difficulty ? 'bg-primary-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {module.exercises.length > 3 && (
                  <p className="text-xs text-gray-500 text-center pt-1">
                    还有 {module.exercises.length - 3} 个练习...
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
```

**Step 2: 验证并提交**

验证：

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/pages/PlanPreview.jsx
git commit -m "feat(ui): add plan preview page

- Display plan title and overview stats
- Show all modules with exercise previews
- Difficulty and time indicators
- Start learning or regenerate actions
- Auto-redirect if no plan exists"
```

---

## Task 6: 创建UI页面 - 我的学习计划

**文件：**
- Create: `src/pages/MyPlan.jsx`

**Step 1: 创建MyPlan.jsx页面**

创建 `src/pages/MyPlan.jsx`：

```javascript
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
                {learningPlan.overallProgress.completedExercises}/{learningPlan.overallProgress.totalExercises} ({learningPlan.overallProgress.percentage}%)
              </span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-400 transition-all duration-500"
                style={{ width: `${learningPlan.overallProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-4 pb-8">
        {/* Modules */}
        <div className="space-y-4 mb-6">
          {learningPlan.modules.map((module) => {
            const isCompleted = module.progress.completed === module.progress.total

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
                        {module.progress.completed}/{module.progress.total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exercises */}
                <div className="p-4 space-y-2">
                  {module.exercises.map((exercise) => (
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
                            <span>{exercise.estimatedMinutes}分钟</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < exercise.difficulty ? 'bg-primary-500' : 'bg-gray-300'
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
```

**Step 2: 验证并提交**

验证：

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/pages/MyPlan.jsx
git commit -m "feat(ui): add my learning plan page

- Display all modules with progress
- Show completed vs pending exercises
- Start button for uncompleted exercises
- Delete and create new plan actions
- Empty state when no plan exists"
```

---

## Task 7: 修改首页 - 添加学习计划展示

**文件：**
- Modify: `src/pages/Home.jsx`

**Step 1: 导入依赖和工具函数**

在 `src/pages/Home.jsx:1-7` 添加导入：

```javascript
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { LANGUAGES, SCENES, LENGTH_OPTIONS, DIFFICULTY_LEVELS, AI_PROVIDERS, TTS_PROVIDERS } from '../utils/constants'
import { getAIConfig } from '../services/ai'
import { getTTSConfig } from '../services/tts'
import { getNextSuggestedExercise } from '../utils/planHelpers'  // 新增
import { Button, Card, Select, Slider, Badge } from '../components/UI'
import { BookOpen, Sparkles, ArrowRight, Volume2, Settings, Target, TrendingUp } from 'lucide-react'  // 新增 Target, TrendingUp
```

**Step 2: 添加学习计划相关的处理函数**

在 `src/pages/Home.jsx` 的 `Home` 函数中，在 `handleStart` 函数之后添加：

```javascript
  const handleStart = () => {
    actions.resetContent()
    actions.setGenerating(true)
    navigate('/result')
  }

  // 新增：处理学习计划练习开始
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
```

**Step 3: 修改页面主体，添加学习计划展示**

将 `src/pages/Home.jsx` 的 `<main>` 部分替换为：

```javascript
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
                    {state.learningPlan.overallProgress.completedExercises}/{state.learningPlan.overallProgress.totalExercises} ({state.learningPlan.overallProgress.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${state.learningPlan.overallProgress.percentage}%` }}
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

        {/* Language Settings (保持不变，但放在下面) */}
        <Card className="p-5 mb-2">
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

        {/* Scene Selection (保持不变) */}
        <Card className="pl-5 pr-5">
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

        {/* Length Selection (保持不变) */}
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

        {/* Start Button (原来的生成按钮，现在只用于快速练习) */}
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
```

**Step 4: 验证并提交**

验证：

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/pages/Home.jsx
git commit -m "feat(ui): integrate learning plan into home page

- Show learning plan card with progress when plan exists
- Display next suggested exercise with start button
- Add quick actions: view full plan, modify plan
- Show create plan CTA when no plan exists
- Add separator between plan and quick practice
- Reorganize layout: plan first, then quick practice options"
```

---

## Task 8: 修改Result页面 - 支持学习计划练习完成

**文件：**
- Modify: `src/pages/Result.jsx`

**Step 1: 读取Result.jsx了解当前结构**

```bash
head -100 /Volumes/Samsung990Pro/workspace/self/coding/jsProject/ai-shadowing-app/.worktrees/feature/learning-plan/src/pages/Result.jsx
```

**Step 2: 在Result页面添加完成练习的逻辑**

在 `src/pages/Result.jsx` 中找到处理"回到首页"或类似导航的位置，添加完成练习的逻辑。

在处理返回首页的函数中添加：

```javascript
  const handleBackHome = () => {
    // 如果是从学习计划启动的练习，标记为完成
    if (state.currentContent?.scene === 'learning-plan' &&
        state.currentContent?.moduleId &&
        state.currentContent?.exerciseId) {
      actions.completeExercise(
        state.currentContent.moduleId,
        state.currentContent.exerciseId
      )
    }

    navigate('/')
  }
```

并且在保存到Notebook时也要检查是否需要标记完成：

```javascript
  const handleSaveToNotebook = () => {
    actions.addToNotebook()

    // 如果是从学习计划启动的练习，标记为完成
    if (state.currentContent?.scene === 'learning-plan' &&
        state.currentContent?.moduleId &&
        state.currentContent?.exerciseId) {
      actions.completeExercise(
        state.currentContent.moduleId,
        state.currentContent.exerciseId
      )
    }

    // 可选：显示成功提示或导航
  }
```

**Step 3: 验证并提交**

验证：

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/pages/Result.jsx
git commit -m "feat(result): add learning plan exercise completion tracking

- Mark exercise as completed when returning home
- Mark exercise as completed when saving to notebook
- Check if current content is from learning plan
- Update plan progress automatically"
```

---

## Task 9: 添加路由配置

**文件：**
- Modify: `src/App.jsx`

**Step 1: 导入新页面组件**

在 `src/App.jsx` 的导入部分添加：

```javascript
import CreatePlan from './pages/CreatePlan'
import PlanPreview from './pages/PlanPreview'
import MyPlan from './pages/MyPlan'
```

**Step 2: 添加路由**

在 `src/App.jsx` 的路由配置中添加新路由（通常在 `<Routes>` 内）：

```javascript
<Route path="/create-plan" element={<CreatePlan />} />
<Route path="/plan-preview" element={<PlanPreview />} />
<Route path="/my-plan" element={<MyPlan />} />
```

**Step 3: 验证并提交**

验证：

```bash
npm run build
```

预期：构建成功

提交：

```bash
git add src/App.jsx
git commit -m "feat(routes): add learning plan routes

- /create-plan: user input and plan generation
- /plan-preview: preview generated plan before saving
- /my-plan: view and manage learning plan progress"
```

---

## Task 10: 最终测试和优化

**Step 1: 构建并测试**

```bash
cd /Volumes/Samsung990Pro/workspace/self/coding/jsProject/ai-shadowing-app/.worktrees/feature/learning-plan
npm run build
npm run dev
```

在浏览器中测试：
1. 访问首页，查看"创建学习计划"按钮
2. 点击创建学习计划，输入学习目标
3. 等待AI生成（30-60秒）
4. 查看预览页面
5. 点击"开始学习"
6. 查看首页显示学习计划和建议练习
7. 点击开始练习
8. 完成练习后检查进度更新
9. 访问"我的学习计划"页面查看所有模块
10. 测试删除计划功能

**Step 2: 修复发现的问题**

根据测试结果修复任何bug或UI问题

**Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete learning plan feature implementation

Implemented comprehensive learning plan system:
- AI-generated personalized learning paths
- Module-based exercise organization
- Progress tracking and completion marking
- Three new pages: Create, Preview, My Plan
- Home page integration with suggested exercises
- localStorage persistence

Users can now create customized learning plans by describing
their goals in natural language, and the system generates a
structured path with trackable progress."
```

---

## 实施后检查清单

- [ ] 所有新文件已创建并提交
- [ ] 所有修改的文件已更新并提交
- [ ] 代码可以成功构建（npm run build）
- [ ] 本地开发服务器可以运行（npm run dev）
- [ ] localStorage正确保存和加载学习计划
- [ ] 学习计划生成功能正常工作
- [ ] 进度跟踪正确更新
- [ ] 所有页面导航正常
- [ ] UI在移动端和桌面端都正常显示
- [ ] 错误处理和加载状态正常工作

---

## 注意事项

1. **AI生成时间**: 生成完整计划可能需要30-60秒，需要良好的用户反馈
2. **错误处理**: 确保网络错误、AI错误等都有友好提示
3. **数据验证**: 确保AI返回的JSON格式正确，添加容错机制
4. **状态同步**: 确保localStorage和state始终同步
5. **用户体验**: 加载状态、进度指示要清晰明显

## 后续优化建议

1. 添加练习完成后的成就动画
2. 支持编辑单个练习内容
3. 添加学习统计和图表
4. 支持导出/导入学习计划
5. 添加每日提醒功能
