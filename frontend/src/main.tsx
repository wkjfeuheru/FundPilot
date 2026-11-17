import React from 'react'
import ReactDOM from 'react-dom/client'
import InvestorApp from './app/apps/InvestorApp'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InvestorApp />
  </React.StrictMode>,
)
