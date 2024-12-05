import { useState, useEffect } from 'react'
import ChatInterface from './components/ChatInterface'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { translations } from './translations'
import './App.css'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState('en')

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'sw', name: 'Kiswahili' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
  ]

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/logo.svg" alt="AI Health" className="h-8 w-8" />
            <span className="text-xl font-semibold text-sky-600">AI Health</span>
          </div>
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-gray-600" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <main className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <ChatInterface language={language} />
        </main>
      </div>
    </div>
  )
}

export default App
