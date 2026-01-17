import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  // Expose environment variables without VITE_ prefix
  envPrefix: ['VITE_', 'AI_', 'GEMINI_', 'OPENAI_', 'ANTHROPIC_', 'GLM_', 'TTS_'],
})
