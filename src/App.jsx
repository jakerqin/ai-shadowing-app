import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import Home from './pages/Home'
import Generator from './pages/Generator'
import Result from './pages/Result'
import Notebook from './pages/Notebook'
import Settings from './pages/Settings'
import CreatePlan from './pages/CreatePlan'
import PlanPreview from './pages/PlanPreview'
import MyPlan from './pages/MyPlan'

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
            <Route path="/create-plan" element={<CreatePlan />} />
            <Route path="/plan-preview" element={<PlanPreview />} />
            <Route path="/my-plan" element={<MyPlan />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  )
}

export default App
