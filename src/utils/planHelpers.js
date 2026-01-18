/**
 * 学习计划相关工具函数
 */

/**
 * 获取下一个建议练习
 * @param {Object} plan - 学习计划对象
 * @returns {Object|null} - { module, exercise } 或 null（所有练习已完成）
 */
export function getNextSuggestedExercise(plan) {
  if (!plan || !plan.modules) return null

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
  if (!plan || !plan.modules) return { total: 0, completed: 0, percentage: 0 }

  let total = 0
  let completed = 0

  plan.modules.forEach(module => {
    if (!module.exercises) return  // 额外防御
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
  if (!module || !module.exercises) return null

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
  const { percentage } = calculateProgress(plan)
  return percentage === 100
}

/**
 * 获取模块完成状态
 * @param {Object} module - 模块对象
 * @returns {boolean}
 */
export function isModuleCompleted(module) {
  if (!module || !module.exercises || module.exercises.length === 0) return false
  return module.exercises.every(ex => ex.completed)
}
