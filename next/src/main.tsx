import React from 'react'
import ReactDOM from 'react-dom/client'
import {Store} from './store'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Store><App/></Store></React.StrictMode>)
if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>undefined))
