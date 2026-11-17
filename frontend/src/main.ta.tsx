import React from 'react'
import ReactDOM from 'react-dom/client'
import TaApp from './app/apps/TaApp'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TaApp />
  </React.StrictMode>,
)
