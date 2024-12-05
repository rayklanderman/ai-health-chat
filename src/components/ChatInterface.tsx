import { useState, useRef, useEffect } from 'react'
import { MicrophoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { translations } from '../translations'

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  copied?: boolean;
  categories?: {
    text: string;
    color: string;
  }[];
}

interface Props {
  language: string;
}

export default function ChatInterface({ language }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessages');
      if (saved) {
        return JSON.parse(saved).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    }
    return [{
      text: translations[language as keyof typeof translations].welcome + '\n\n' + 
           translations[language as keyof typeof translations].askAbout,
      isUser: false,
      timestamp: new Date(),
      categories: [
        { text: translations[language as keyof typeof translations].categories.general, color: 'bg-blue-100 text-blue-800' },
        { text: translations[language as keyof typeof translations].categories.wellness, color: 'bg-green-100 text-green-800' },
        { text: translations[language as keyof typeof translations].categories.maternal, color: 'bg-purple-100 text-purple-800' },
        { text: translations[language as keyof typeof translations].categories.nutrition, color: 'bg-orange-100 text-orange-800' }
      ]
    }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    // Update welcome message when language changes
    setMessages(messages => {
      const welcomeMsg = messages[0];
      if (!welcomeMsg.isUser) {
        return [{
          text: translations[language as keyof typeof translations].welcome + '\n\n' + 
               translations[language as keyof typeof translations].askAbout,
          isUser: false,
          timestamp: new Date(),
          categories: [
            { text: translations[language as keyof typeof translations].categories.general, color: 'bg-blue-100 text-blue-800' },
            { text: translations[language as keyof typeof translations].categories.wellness, color: 'bg-green-100 text-green-800' },
            { text: translations[language as keyof typeof translations].categories.maternal, color: 'bg-purple-100 text-purple-800' },
            { text: translations[language as keyof typeof translations].categories.nutrition, color: 'bg-orange-100 text-orange-800' }
          ]
        }, ...messages.slice(1)];
      }
      return messages;
    });
  }, [language]);

  const clearChat = () => {
    setMessages([{
      text: translations[language as keyof typeof translations].welcome + '\n\n' + 
           translations[language as keyof typeof translations].askAbout,
      isUser: false,
      timestamp: new Date(),
      categories: [
        { text: translations[language as keyof typeof translations].categories.general, color: 'bg-blue-100 text-blue-800' },
        { text: translations[language as keyof typeof translations].categories.wellness, color: 'bg-green-100 text-green-800' },
        { text: translations[language as keyof typeof translations].categories.maternal, color: 'bg-purple-100 text-purple-800' },
        { text: translations[language as keyof typeof translations].categories.nutrition, color: 'bg-orange-100 text-orange-800' }
      ]
    }]);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessages(messages.map((msg, i) => 
        i === index ? { ...msg, copied: true } : msg
      ));
      setTimeout(() => {
        setMessages(messages.map((msg, i) =>
          i === index ? { ...msg, copied: false } : msg
        ));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      text: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getAIResponse(userMessage.text);
      setMessages(prev => [...prev, {
        text: response,
        isUser: false,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const initSpeechRecognition = () => {
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
  };

  const startListening = () => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!message.isUser && (
              <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              </div>
            )}
            <div
              className={`max-w-[85%] sm:max-w-[75%] ${
                message.isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              } p-4 rounded-2xl ${message.isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}
            >
              {!message.isUser && (
                <div className="font-medium mb-1">
                  {translations[language as keyof typeof translations].assistant}
                </div>
              )}
              <div>{message.text}</div>
              {message.categories && (
                <div className="grid grid-cols-2 gap-4 mt-4 mx-auto max-w-lg">
                  {message.categories.map((category, idx) => (
                    <div
                      key={idx}
                      className={`${category.color} p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer backdrop-blur-sm`}
                    >
                      <div className="text-center font-medium">
                        {category.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 mr-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            <div className="max-w-[85%] sm:max-w-[75%] bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none">
              <div className="font-medium mb-1">
                {translations[language as keyof typeof translations].assistant}
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={translations[language as keyof typeof translations].placeholder}
            className="flex-1 bg-gray-100 text-gray-800 placeholder-gray-500 rounded-full py-3 pl-4 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
            rows={1}
          />
          <button
            type="button"
            className="absolute right-12 text-gray-500 hover:text-gray-700 transition-colors"
            onClick={toggleListening}
            title={isListening ? 'Stop Recording' : 'Start Recording'}
          >
            <MicrophoneIcon className={`h-5 w-5 ${isListening ? 'text-red-500' : ''}`} />
          </button>
          <button
            type="submit"
            className="absolute right-3 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-500 transition-colors disabled:opacity-50"
            disabled={!input.trim() || isLoading}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
      <div className="text-xs sm:text-sm text-gray-600 p-4 bg-gray-50 text-center font-medium">
        {translations[language as keyof typeof translations].disclaimer}
      </div>
    </div>
  );
}
