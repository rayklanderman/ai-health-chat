import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ChatInterface from './components/ChatInterface'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold text-primary">AI Health Assistant</h1>
          <p className="text-gray-600">Your personal health companion powered by AI</p>
        </div>
      </header>
      <main>
        <ChatInterface />
      </main>
    </div>
  )
}

export default App
