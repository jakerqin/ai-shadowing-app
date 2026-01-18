import { createContext, useContext, useReducer, useEffect } from 'react'
import { STORAGE_KEYS, LANGUAGES } from '../utils/constants'
import { safeJsonParse, generateId } from '../utils/helpers'

// Initial state
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

  // Learning plan state
  learningPlan: null,
  planGenerating: false,
  planGenerationError: null,
}

// Action types
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
  // Learning plan actions
  SET_LEARNING_PLAN: 'SET_LEARNING_PLAN',
  SET_PLAN_GENERATING: 'SET_PLAN_GENERATING',
  SET_PLAN_GENERATION_ERROR: 'SET_PLAN_GENERATION_ERROR',
  COMPLETE_EXERCISE: 'COMPLETE_EXERCISE',
  RESET_PLAN: 'RESET_PLAN',
}

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      }
    
    case ActionTypes.SET_CURRENT_CONTENT:
      return {
        ...state,
        currentContent: action.payload,
        showTranslation: false,
        chatMessages: [],
        selectedText: '',
      }
    
    case ActionTypes.SET_GENERATING:
      return {
        ...state,
        isGenerating: action.payload,
        generationError: action.payload ? null : state.generationError,
      }
    
    case ActionTypes.SET_GENERATION_ERROR:
      return {
        ...state,
        generationError: action.payload,
        isGenerating: false,
      }
    
    case ActionTypes.ADD_TO_NOTEBOOK:
      const newEntry = {
        id: generateId(),
        content: state.currentContent,
        savedAt: new Date().toISOString(),
      }
      return {
        ...state,
        notebook: [newEntry, ...state.notebook],
      }
    
    case ActionTypes.REMOVE_FROM_NOTEBOOK:
      return {
        ...state,
        notebook: state.notebook.filter(entry => entry.id !== action.payload),
      }
    
    case ActionTypes.SET_NOTEBOOK:
      return {
        ...state,
        notebook: action.payload,
      }
    
    case ActionTypes.ADD_CHAT_MESSAGE:
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      }
    
    case ActionTypes.CLEAR_CHAT:
      return {
        ...state,
        chatMessages: [],
        selectedText: '',
      }
    
    case ActionTypes.SET_SELECTED_TEXT:
      return {
        ...state,
        selectedText: action.payload,
      }
    
    case ActionTypes.TOGGLE_TRANSLATION:
      return {
        ...state,
        showTranslation: !state.showTranslation,
      }
    
    case ActionTypes.SET_TRANSLATION:
      return {
        ...state,
        currentContent: state.currentContent
          ? { ...state.currentContent, translation: action.payload }
          : null,
      }
    
    case ActionTypes.SET_PLAYING:
      return {
        ...state,
        isPlaying: action.payload,
      }

    case ActionTypes.UPDATE_CURRENT_CONTENT_TEXT:
      return {
        ...state,
        currentContent: state.currentContent
          ? { ...state.currentContent, text: action.payload }
          : state.currentContent,
      }
    
    case ActionTypes.RESET_CONTENT:
      return {
        ...state,
        currentContent: null,
        chatMessages: [],
        selectedText: '',
        showTranslation: false,
        isPlaying: false,
      }

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

    default:
      return state
  }
}

// Context
const AppContext = createContext(null)

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  
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

    const savedPlan = localStorage.getItem(STORAGE_KEYS.LEARNING_PLAN)
    if (savedPlan) {
      const parsed = safeJsonParse(savedPlan, null)
      dispatch({ type: ActionTypes.SET_LEARNING_PLAN, payload: parsed })
    }
  }, [])
  
  // Save notebook to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTEBOOK, JSON.stringify(state.notebook))
  }, [state.notebook])
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings))
  }, [state.settings])

  // Save learning plan to localStorage when it changes
  useEffect(() => {
    if (state.learningPlan) {
      localStorage.setItem(STORAGE_KEYS.LEARNING_PLAN, JSON.stringify(state.learningPlan))
    } else {
      localStorage.removeItem(STORAGE_KEYS.LEARNING_PLAN)
    }
  }, [state.learningPlan])
  
  // Action creators
  const actions = {
    setSettings: (settings) => {
      dispatch({ type: ActionTypes.SET_SETTINGS, payload: settings })
    },
    
    setCurrentContent: (content) => {
      dispatch({ type: ActionTypes.SET_CURRENT_CONTENT, payload: content })
    },
    
    setGenerating: (isGenerating) => {
      dispatch({ type: ActionTypes.SET_GENERATING, payload: isGenerating })
    },
    
    setGenerationError: (error) => {
      dispatch({ type: ActionTypes.SET_GENERATION_ERROR, payload: error })
    },
    
    addToNotebook: () => {
      dispatch({ type: ActionTypes.ADD_TO_NOTEBOOK })
    },
    
    removeFromNotebook: (id) => {
      dispatch({ type: ActionTypes.REMOVE_FROM_NOTEBOOK, payload: id })
    },
    
    addChatMessage: (message) => {
      dispatch({ type: ActionTypes.ADD_CHAT_MESSAGE, payload: message })
    },
    
    clearChat: () => {
      dispatch({ type: ActionTypes.CLEAR_CHAT })
    },
    
    setSelectedText: (text) => {
      dispatch({ type: ActionTypes.SET_SELECTED_TEXT, payload: text })
    },
    
    toggleTranslation: () => {
      dispatch({ type: ActionTypes.TOGGLE_TRANSLATION })
    },
    
    setTranslation: (translation) => {
      dispatch({ type: ActionTypes.SET_TRANSLATION, payload: translation })
    },
    
    setPlaying: (isPlaying) => {
      dispatch({ type: ActionTypes.SET_PLAYING, payload: isPlaying })
    },

    updateCurrentContentText: (text) => {
      dispatch({ type: ActionTypes.UPDATE_CURRENT_CONTENT_TEXT, payload: text })
    },

    resetContent: () => {
      dispatch({ type: ActionTypes.RESET_CONTENT })
    },

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
  }
  
  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  )
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
