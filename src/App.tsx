import { useState, useRef, useEffect } from 'react';
import { getAIResponse } from './services/ai';

function App() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Get AI response
      const response = await getAIResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 p-6 bg-white rounded-lg shadow-sm">
          <h1 className="text-4xl font-bold text-blue-600 mb-3">AI Health Assistant</h1>
          <p className="text-gray-600 text-lg">Your personal health information companion</p>
        </header>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Chat Messages Container */}
          <div className="h-[60vh] overflow-y-auto p-6 bg-gray-50">
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                  <div className="text-5xl mb-4">👋</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Hello! I'm your AI Health Assistant
                  </h2>
                  <p className="text-gray-600">
                    Feel free to ask me about:
                  </p>
                  <div className="mt-4 space-y-2">
                    <p className="text-blue-600">• General health information</p>
                    <p className="text-blue-600">• Healthy lifestyle tips</p>
                    <p className="text-blue-600">• Understanding medical terms</p>
                    <p className="text-blue-600">• Wellness recommendations</p>
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
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your health question..."
                className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? 'Sending...' : 'Send'}
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
