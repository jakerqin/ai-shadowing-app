import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { LANGUAGES, SCENES } from '../utils/constants'
import { formatDate, truncateText } from '../utils/helpers'
import { Button, Card, Badge, Modal } from '../components/UI'
import { 
  ArrowLeft, BookOpen, Trash2, Play, Search, 
  Calendar, Globe, Volume2, ChevronRight, AlertCircle
} from 'lucide-react'

export default function Notebook() {
  const navigate = useNavigate()
  const { state, actions } = useApp()
  const { notebook } = state
  
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)

  // Filter notebook entries
  const filteredEntries = notebook.filter(entry => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      entry.content.text.toLowerCase().includes(query) ||
      entry.content.translation?.toLowerCase().includes(query)
    )
  })

  // Handle delete
  const handleDelete = (id) => {
    actions.removeFromNotebook(id)
    setDeleteConfirm(null)
  }

  // View entry details
  const handleViewEntry = (entry) => {
    // Set the content and navigate to result page
    actions.setCurrentContent(entry.content)
    navigate('/result')
  }

  return (
    <div className="page-container bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              My Notebook
            </h1>
            
            <div className="w-9" /> {/* Spacer for alignment */}
          </div>
          
          {/* Search */}
          {notebook.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved content..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none text-sm"
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {notebook.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No saved content yet</h2>
            <p className="text-gray-500 mb-6">
              Generate some content and save it here for later review
            </p>
            <Button variant="primary" onClick={() => navigate('/')}>
              Start Practicing
            </Button>
          </div>
        ) : filteredEntries.length === 0 ? (
          // No search results
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No results found</h2>
            <p className="text-gray-500">Try a different search term</p>
          </div>
        ) : (
          // Notebook entries
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const targetLang = LANGUAGES.find(l => l.code === entry.content.settings.targetLanguage)
              const scene = SCENES.find(s => s.id === entry.content.settings.scene)
              
              return (
                <Card 
                  key={entry.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewEntry(entry)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Tags */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="primary" className="text-xs">
                          {targetLang?.flag} {targetLang?.name}
                        </Badge>
                        <Badge variant="gray" className="text-xs">
                          {scene?.icon} {scene?.name}
                        </Badge>
                      </div>
                      
                      {/* Preview text */}
                      <p className="text-gray-900 line-clamp-2 mb-2">
                        {truncateText(entry.content.text, 100)}
                      </p>
                      
                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(entry.savedAt)}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(entry.id)
                        }}
                        className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
        
        {/* Entry count */}
        {notebook.length > 0 && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {filteredEntries.length} of {notebook.length} entries
          </p>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Entry"
      >
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Are you sure?</h3>
              <p className="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
