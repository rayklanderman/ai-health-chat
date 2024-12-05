import { useState, useEffect } from 'react'
import ChatInterface from './components/ChatInterface'
import LanguageSelector from './components/LanguageSelector'
import './App.css'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xl">
              H
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              AI Health Chat
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="relative min-h-[600px] animate-fade-in">
          <ChatInterface />
        </main>

        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p> {new Date().getFullYear()} AI Health Chat. For informational purposes only.</p>
          <p className="mt-1">
            Always consult with healthcare professionals for medical advice.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
