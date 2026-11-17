import React from 'react'
import ReactDOM from 'react-dom/client'
import AdvisorApp from './app/apps/AdvisorApp'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdvisorApp />
  </React.StrictMode>,
)
