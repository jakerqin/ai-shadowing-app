import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'

export default function Generator() {
  const navigate = useNavigate()
  const { actions } = useApp()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (hasRedirectedRef.current) return
    hasRedirectedRef.current = true
    actions.resetContent()
    actions.setGenerating(true)
    navigate('/result', { replace: true })
  }, [actions, navigate])

  return null
}
