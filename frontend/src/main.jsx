import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';          // 拡張子を明示
// import './index.css';              // 必要なら CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
