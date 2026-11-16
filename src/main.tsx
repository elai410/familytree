import React from 'react'
import ReactDOM from 'react-dom/client'
import { Scene } from './scene/Scene'
import { Overlay } from './ui/Overlay'
import { Dashboard } from './ui/Dashboard'
import { useTree } from './state'
import './styles.css'

function App() {
  const familyId = useTree((s) => s.familyId)
  return familyId ? (
    <>
      <Scene />
      <Overlay />
    </>
  ) : (
    <Dashboard />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
