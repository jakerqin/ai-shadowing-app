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
  }, [])
  
  // Save notebook to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTEBOOK, JSON.stringify(state.notebook))
  }, [state.notebook])
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings))
  }, [state.settings])
  
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
