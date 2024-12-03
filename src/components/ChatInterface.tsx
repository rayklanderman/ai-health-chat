import { useState, useEffect, useCallback } from 'react';
import { PaperAirplaneIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { getAIResponse } from '../services/ai';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  copied?: boolean;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Try to load messages from localStorage
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      // Convert ISO date strings back to Date objects
      return parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    // Initial welcome message if no history
    return [{
      text: "Hello! I'm your AI Health Assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    setMessages([{
      text: "Hello! I'm your AI Health Assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }]);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      // Update the message to show copied state
      setMessages(messages.map((msg, i) => 
        i === index ? { ...msg, copied: true } : msg
      ));
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setMessages(messages.map((msg, i) => 
          i === index ? { ...msg, copied: false } : msg
        ));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      text: input,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getAIResponse(input);
      const aiMessage: Message = {
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        text: "I'm sorry, but I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    return recognition;
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return;

    const recognition = initSpeechRecognition();
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start error:', err);
    }
  }, [isListening]);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Chat History</h2>
        <button
          onClick={clearChat}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear chat history"
        >
          <TrashIcon className="h-5 w-5" />
          Clear Chat
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-4 flex-grow overflow-y-auto mb-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-opacity-20 bg-white">
                    {message.isUser ? '👤' : '🤖'}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <p className={`font-medium ${
                        message.isUser ? 'text-white' : 'text-gray-800'
                      }`}>
                        {message.isUser ? 'You' : 'AI Assistant'}
                      </p>
                      {!message.isUser && (
                        <button
                          onClick={() => copyToClipboard(message.text, index)}
                          className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          {message.copied ? (
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ClipboardDocumentIcon className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className={`mt-1 text-[15px] leading-relaxed ${
                      message.isUser ? 'text-white' : 'text-gray-700'
                    }`}>
                      {message.text}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your health-related question..."
          className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
        />
        <button
          onClick={startListening}
          disabled={isLoading || isListening}
          className={`p-2 rounded-lg transition-colors ${
            isListening 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title={isListening ? 'Listening...' : 'Click to speak'}
        >
          <MicrophoneIcon className={`h-6 w-6 ${isListening ? 'animate-pulse' : ''}`} />
        </button>
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="bg-primary hover:bg-secondary text-white p-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
