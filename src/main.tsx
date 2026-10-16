import React from 'react'
import ReactDOM from 'react-dom/client'
import { Scene } from './scene/Scene'
import { Overlay } from './ui/Overlay'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Scene />
    <Overlay />
  </React.StrictMode>,
)
