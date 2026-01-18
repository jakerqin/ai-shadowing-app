# 学习计划功能设计文档

**日期：** 2026-01-18
**设计目标：** 从固定场景选择升级为个性化学习计划系统

---

## 背景

当前应用提供8个预定义场景（日常生活、旅行、商务等），用户选择后生成单次练习内容。希望升级为更系统化的学习体验：用户输入学习需求 → AI生成学习大纲/步骤 → 保存到localStorage → 系统化跟练口语。

---

## 核心设计决策

### 1. 用户输入方式
**选择：自然语言输入**

用户通过一段话描述学习目标，如："我想在2周内准备商务英语面试，重点提升自我介绍和回答问题的能力"

**原因：** 充分利用大语言模型的理解能力，让用户更自由地表达需求

### 2. 学习计划结构
**选择：灵活的模块系统**

```
学习计划：商务英语面试准备
├── 核心模块1：自我介绍（6个练习）
├── 核心模块2：工作经历（8个练习）
└── 核心模块3：行为面试（10个练习）
```

用户可以自由选择顺序和频率，不按固定时间线。

**原因：** 最大灵活性，适合不同学习节奏，避免让新手感到压力

### 3. 用户交互流程
**选择：渐进式引导**

- 首次使用：引导用户创建学习计划
- 后续访问：默认显示"今日建议练习"
- 保留快速练习入口（原有场景选择）

**原因：** 平衡新功能推广和老功能保留，不强制用户改变习惯

### 4. 计划生成方式
**选择：一次性生成完整计划**

用户输入需求后，AI立即生成完整的模块结构和所有练习（预计30-60秒）

**优点：**
- 用户能看到完整路径，心里有数
- 不依赖网络，后续使用流畅
- 实现简单

### 5. 练习内容格式
**选择：复用现有格式**

每个练习包含：标题、目标语言文本、难度级别、预估时长。点击练习后进入Result页面（现有流程）。

**原因：** 复用现有UI和逻辑，开发工作量小，用户体验一致

---

## 整体架构

### 核心流程

1. **首次访问** → 显示欢迎引导，邀请创建学习计划
2. **输入需求** → 自然语言描述
3. **AI生成计划** → 一次性生成完整的模块和练习（30-60秒）
4. **预览确认** → 用户查看计划大纲，满意后保存
5. **日常使用** → 首页显示"今日建议练习"，点击开始
6. **完成练习** → 进入Result页面，完成后标记进度
7. **随时查看** → 专门的学习计划页面查看所有模块和进度

### 数据结构

**localStorage存储：**
- `LEARNING_PLAN`：当前激活的学习计划

**学习计划JSON结构：**
```json
{
  "id": "plan_20260118_001",
  "title": "商务英语面试准备",
  "userInput": "我想在2周内准备商务英语面试...",
  "createdAt": "2026-01-18T10:00:00Z",
  "targetLanguage": "en",
  "nativeLanguage": "zh",
  "modules": [
    {
      "id": "mod_1",
      "name": "自我介绍",
      "description": "掌握基础自我介绍技巧",
      "order": 1,
      "exercises": [
        {
          "id": "ex_1_1",
          "title": "基础自我介绍",
          "text": "Hello, I'm...",
          "difficulty": 2,
          "estimatedMinutes": 5,
          "completed": false,
          "completedAt": null
        }
      ],
      "progress": {
        "total": 6,
        "completed": 0
      }
    }
  ],
  "overallProgress": {
    "totalExercises": 24,
    "completedExercises": 0,
    "percentage": 0
  }
}
```

---

## UI/UX设计

### 1. 首页改造 (Home.jsx)

**有学习计划时：**
- 显示学习计划标题和总进度
- 显示"今日建议练习"卡片（下一个未完成的练习）
- 提供"查看完整计划"和"修改计划"按钮
- 底部保留"快速练习一个场景"选项

**无学习计划时：**
- 显示引导文案："系统化学习，事半功倍"
- 突出"创建学习计划"按钮
- 提供"快速开始随机练习"选项

### 2. 创建学习计划页面

**路由：** `/create-plan`

- 显示示例（如"我想在2周内准备雅思口语考试"）
- 多行文本输入框（3-5行高度）
- "生成学习计划"按钮

### 3. 计划预览/确认页面

**路由：** `/plan-preview`

- 显示计划标题和总览（共N个模块，M个练习）
- 折叠显示每个模块和部分练习
- "开始学习"按钮（保存计划并跳转到首页）
- "重新生成"按钮（返回输入页面）

### 4. 学习计划详情页面

**路由：** `/my-plan`

- 显示总进度条和百分比
- 列出所有模块，显示每个模块的完成状态
- 已完成的练习显示✓，未完成的显示○并可点击"开始"
- 底部提供"删除计划"和"创建新计划"按钮

---

## 技术实现

### 1. AI提示词设计

```javascript
const generatePlanPrompt = (userInput, nativeLanguage, targetLanguage) => `
You are a language learning expert. Based on the user's learning goal, generate a structured learning plan.

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
   - Appropriate difficulty level
   - Estimated time in minutes

IMPORTANT: Return ONLY a valid JSON object in this exact format:
{
  "title": "Plan title in ${nativeLanguage}",
  "modules": [
    {
      "name": "Module name",
      "description": "Brief description",
      "exercises": [
        {
          "title": "Exercise title",
          "text": "Content in ${targetLanguage}",
          "difficulty": 2,
          "estimatedMinutes": 5
        }
      ]
    }
  ]
}

Make the content practical, progressive in difficulty, and directly related to the user's goal.
`
```

### 2. 状态管理扩展

**新增State（AppContext.jsx）：**
```javascript
learningPlan: null,           // 当前激活的学习计划
planGenerating: false,        // 是否正在生成计划
planGenerationError: null,    // 生成错误
```

**新增Actions：**
- `setLearningPlan(plan)` - 设置学习计划
- `setPlanGenerating(isGenerating)` - 设置生成状态
- `completeExercise(moduleId, exerciseId)` - 标记练习完成
- `resetPlan()` - 重置学习计划

### 3. 新增文件结构

```
src/
├── pages/
│   ├── Home.jsx (修改)
│   ├── CreatePlan.jsx (新增)
│   ├── PlanPreview.jsx (新增)
│   ├── MyPlan.jsx (新增)
│   └── Result.jsx (轻微修改)
├── services/
│   └── planGenerator.js (新增 - AI生成逻辑)
├── utils/
│   ├── constants.js (新增STORAGE_KEYS.LEARNING_PLAN)
│   └── planHelpers.js (新增 - 工具函数)
└── store/
    └── AppContext.jsx (修改)
```

### 4. 核心服务实现

**planGenerator.js：**
- `generateLearningPlan(userInput, nativeLanguage, targetLanguage)` - 调用AI生成计划
- `buildPlanObject(planData, ...)` - 构建完整的计划对象

**planHelpers.js：**
- `getNextSuggestedExercise(plan)` - 获取下一个建议练习
- `calculateProgress(plan)` - 计算总体进度
- `updateModuleProgress(module)` - 更新模块进度

---

## 实施步骤

### 阶段1：基础架构（第1-2天）
1. 扩展AppContext，添加学习计划相关state和actions
2. 在constants.js添加STORAGE_KEYS.LEARNING_PLAN
3. 创建planHelpers.js工具函数
4. 创建planGenerator.js服务

### 阶段2：AI生成逻辑（第3天）
1. 实现generateLearningPlan函数
2. 设计和测试AI提示词
3. 处理JSON解析和错误处理
4. 测试生成的计划结构

### 阶段3：UI页面开发（第4-6天）
1. 创建CreatePlan.jsx（输入页面）
2. 创建PlanPreview.jsx（预览确认页面）
3. 创建MyPlan.jsx（计划详情页面）
4. 修改Home.jsx（添加学习计划显示）
5. 添加路由配置

### 阶段4：练习流程整合（第7天）
1. 修改Result.jsx，支持从学习计划启动
2. 实现练习完成后的进度更新
3. 实现"下一个练习"推荐逻辑
4. localStorage持久化

### 阶段5：优化和测试（第8天）
1. 添加加载状态和错误提示
2. 优化生成速度提示
3. 测试各种用户输入场景
4. 边界情况处理

---

## 关键注意事项

### 1. AI生成质量保证
- 提示词需要多次调试，确保生成的JSON格式稳定
- 添加JSON解析的容错机制（去除markdown代码块标记等）
- 考虑添加重试机制

### 2. 用户体验优化
- 生成计划时显示友好的加载动画（"正在分析您的需求..."）
- 首次使用时的引导要清晰但不打扰
- 快速练习入口要保留，不强制用户使用学习计划

### 3. 数据管理
- 学习计划数据可能较大（20-30KB），注意localStorage容量
- 计划历史记录暂时不做，先支持单个活跃计划

### 4. 性能考虑
- 生成完整计划可能需要30-60秒
- 在UI上显示"大约需要1分钟"提示
- 考虑添加"生成中可以离开此页面"的提示

### 5. 边界情况处理
- 用户输入过于简单 → 提示更具体的目标描述
- 生成失败 → 显示友好错误提示，提供"重试"按钮
- 没有学习计划时访问/my-plan → 重定向到首页

---

## 扩展可能性（未来）

**短期扩展：**
- 添加"每日打卡"提醒
- 练习完成后的统计图表
- 支持编辑/调整计划中的练习

**长期扩展：**
- 根据用户完成情况动态调整后续练习难度
- 支持多个学习计划并行
- 社区分享优秀学习计划
- AI根据练习表现给出个性化建议

---

## 总结

✅ **核心功能：** 用户通过自然语言输入学习需求 → AI一次性生成完整的模块化学习计划 → 保存到localStorage → 渐进式引导用户系统学习

✅ **用户价值：** 从随机练习升级为系统化学习路径，提升学习效率和目标感

✅ **技术实现：** 复用现有AI服务和UI组件，开发周期约1周

✅ **YAGNI原则：** 暂不实现复杂的自适应算法、多计划管理、社交功能等，专注核心价值
