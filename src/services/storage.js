import { STORAGE_KEYS } from '../utils/constants'
import { safeJsonParse } from '../utils/helpers'

// Get notebook entries
export function getNotebook() {
  const data = localStorage.getItem(STORAGE_KEYS.NOTEBOOK)
  return safeJsonParse(data, [])
}

// Save notebook entries
export function saveNotebook(entries) {
  localStorage.setItem(STORAGE_KEYS.NOTEBOOK, JSON.stringify(entries))
}

// Add entry to notebook
export function addToNotebook(entry) {
  const notebook = getNotebook()
  notebook.unshift(entry)
  saveNotebook(notebook)
  return notebook
}

// Remove entry from notebook
export function removeFromNotebook(id) {
  const notebook = getNotebook()
  const filtered = notebook.filter(entry => entry.id !== id)
  saveNotebook(filtered)
  return filtered
}

// Get user settings
export function getSettings() {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  return safeJsonParse(data, null)
}

// Save user settings
export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

// Clear all app data
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}

export default {
  getNotebook,
  saveNotebook,
  addToNotebook,
  removeFromNotebook,
  getSettings,
  saveSettings,
  clearAllData,
}
