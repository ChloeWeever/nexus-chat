import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-react/dist/Assets.js'
import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme.js'

setTheme('sap_horizon_dark')
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
