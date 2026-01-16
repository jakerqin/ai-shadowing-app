import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import Home from './pages/Home'
import Generator from './pages/Generator'
import Result from './pages/Result'
import Notebook from './pages/Notebook'
import Settings from './pages/Settings'

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generate" element={<Generator />} />
            <Route path="/result" element={<Result />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  )
}

export default App
