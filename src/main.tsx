import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Check for required environment variables
if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error('Missing VITE_GEMINI_API_KEY environment variable');
}

// Register Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        type: 'module'
      });
      
      // Only log in development
      if (import.meta.env.DEV) {
        console.log('Service Worker registered successfully');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
