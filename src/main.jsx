import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { fallbackFor } from './photos.js'

// If a linked stock photo cannot load, show the bundled sample artwork instead.
document.addEventListener('error', (e) => {
  const t = e.target
  if (t instanceof HTMLImageElement) {
    const fb = fallbackFor(t.currentSrc || t.src)
    if (fb && !t.dataset.fellBack) { t.dataset.fellBack = '1'; t.src = fb }
  }
}, true)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
