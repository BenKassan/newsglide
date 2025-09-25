import { createRoot } from 'react-dom/client'
import App from './app/App'
import './index.css'
import { validateEnvironment } from './lib/env'

// Validate environment variables before starting the app
try {
  validateEnvironment()
} catch (error) {
  console.error('Environment validation failed:', error)
  // In development, show a helpful error message
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: red;">
        <h1>Environment Configuration Error</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Please create a .env.local file in the project root with the required variables.</p>
        <p>See .env.example for reference.</p>
      </div>
    `
  }
  throw error
}

createRoot(document.getElementById('root')!).render(<App />)
