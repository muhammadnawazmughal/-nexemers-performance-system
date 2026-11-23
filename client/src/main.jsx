import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const savedTheme = localStorage.getItem('nexemers_theme')
const initialTheme = savedTheme === 'dark' || savedTheme === 'light'
  ? savedTheme
  : 'light'
document.documentElement.dataset.theme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
