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
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
    const adjustHeight = () => {
      if (chatContainerRef.current) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        chatContainerRef.current.style.height = `calc(var(--vh, 1vh) * 100 - 180px)`;
      }
    };

    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, []);

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
    <div className="flex flex-col h-full max-h-[calc(100vh-180px)] bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">
          {translations[language as keyof typeof translations].title}
        </h2>
        <button
          onClick={clearChat}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          Clear Chat
        </button>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{
          height: 'calc(100vh - 280px)',
          minHeight: '300px',
          scrollBehavior: 'smooth'
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.text}</div>
              {message.categories && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.categories.map((category, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full ${category.color}`}
                    >
                      {category.text}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-white rounded-b-lg">
        <div className="flex items-end space-x-2">
          <div className="flex-1 min-h-[44px]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={translations[language as keyof typeof translations].placeholder}
              className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              style={{
                minHeight: '44px',
                maxHeight: '120px'
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className={`p-3 rounded-lg ${
              isLoading || !input.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      <div className="p-3 text-xs text-gray-500 text-center bg-gray-50 rounded-b-lg">
        {translations[language as keyof typeof translations].disclaimer}
      </div>
    </div>
  );
}
