import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './DiaryApp.jsx' // 作成したメインアプリ
import './index.css' // Tailwind CSSを読み込む

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)