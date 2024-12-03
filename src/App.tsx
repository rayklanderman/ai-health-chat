import { useState, useRef, useEffect } from 'react';
import { getAIResponse } from './services/ai';
import LanguageSelector from './components/LanguageSelector';
import { translations } from './translations';

function App() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('preferredLanguage') || navigator.language.split('-')[0] || 'en';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get translations for current language
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show a toast or notification that we're back online
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Back Online', {
          body: 'You are now connected to the internet.',
          icon: '/android-chrome-192x192.png'
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check service worker for online status
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        setIsOnline(event.data.online);
      };
      navigator.serviceWorker.controller.postMessage('CHECK_ONLINE_STATUS', [messageChannel.port2]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      // Include language in the context for the AI
      const aiResponse = await getAIResponse(userMessage);
      setMessages([...newMessages, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: currentLanguage === 'en' 
            ? 'I apologize, but I encountered an error. Please try again.'
            : 'An error occurred. Switching to English: I apologize, but I encountered an error. Please try again.' 
        }
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      {!isOnline && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {t.offlineMessage}
                <button
                  onClick={() => window.location.reload()}
                  className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600"
                >
                  {t.tryReconnect}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <header className="relative text-center mb-8 p-6 bg-white rounded-lg shadow-sm">
          <div className="absolute top-4 right-4 z-50">
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={(code) => {
                setCurrentLanguage(code);
                localStorage.setItem('preferredLanguage', code);
              }}
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-3">
              <span className="text-3xl">AI</span>{' '}
              <span className="text-3xl">Health</span>{' '}
              <span className="text-3xl">Assistant</span>
            </h1>
            <p className="text-gray-600 max-w-2xl">{t.appSubtitle}</p>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Chat Messages Container */}
          <div className="h-[60vh] overflow-y-auto p-6 bg-gray-50">
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                  <div className="text-5xl mb-4">👋</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {t.welcomeMessage}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {t.welcomeDescription}
                  </p>
                  <div className="mt-4 space-y-2">
                    <p className="text-blue-600">• {t.suggestions.general}</p>
                    <p className="text-blue-600">• {t.suggestions.lifestyle}</p>
                    <p className="text-blue-600">• {t.suggestions.terms}</p>
                    <p className="text-blue-600">• {t.suggestions.wellness}</p>
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-opacity-20 bg-white">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          message.role === 'user' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {message.role === 'user' ? 'You' : 'AI Assistant'}
                        </p>
                        <p className={`mt-1 text-[15px] leading-relaxed ${
                          message.role === 'user' ? 'text-white' : 'text-gray-700'
                        }`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-4 shadow-md">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                        🤖
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
                disabled={isLoading || !isOnline}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !isOnline}
                className="px-6 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? t.sendingButton : t.sendButton}
              </button>
            </form>
          </div>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500 bg-white p-4 rounded-lg shadow-sm">
          <p className="max-w-2xl mx-auto">
            <strong>Disclaimer:</strong> This AI assistant provides general health information only.
            Always consult qualified healthcare professionals for medical advice, diagnosis, or treatment.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
