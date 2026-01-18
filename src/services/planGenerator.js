import { chatCompletionStream } from './ai'

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

    const messages = [
      { role: 'system', content: 'You are a language learning expert who creates structured learning plans in JSON format.' },
      { role: 'user', content: prompt }
    ]

    await chatCompletionStream(
      messages,
      { temperature: 0.7, maxTokens: 4096 },
      (chunk) => {
        fullResponse += chunk
        if (onProgress) {
          onProgress({ type: 'chunk', data: chunk })
        }
      }
    )

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
