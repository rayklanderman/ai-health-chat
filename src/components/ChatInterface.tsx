import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { translations } from '../translations';
import { sendMessage } from '../services/ai';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface Props {
  language: string;
}

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  categories?: Array<{
    text: string;
    color: string;
  }>;
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
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
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
        chatContainerRef.current.style.height = `calc(var(--vh, 1vh) * 100 - 160px)`;
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
      const response = await sendMessage(userMessage.text);
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

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      setIsVoiceSupported(false);
      return null;
    }
    const recognition = new SpeechRecognition();
    
    // Set language based on current selection
    recognition.lang = language === 'en' ? 'en-US' : 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + ' ' + transcript.trim());
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsRecording(false);
    };

    return recognition;
  };

  // Initialize speech recognition when language changes
  useEffect(() => {
    const recognition = initializeSpeechRecognition();
    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [language]);

  const toggleVoiceInput = () => {
    if (isListening) {
      const recognition = initializeSpeechRecognition();
      if (recognition) {
        recognition.abort();
      }
    } else {
      const recognition = initializeSpeechRecognition();
      if (recognition) {
        recognition.start();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {translations[language as keyof typeof translations].title}
          </h2>
          <button
            onClick={clearChat}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
      >
        {/* Chat Messages */}
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
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {message.categories.map((category, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg flex items-center justify-center ${category.color} shadow-sm`}
                    >
                      <span className="text-sm font-medium">{category.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
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
              placeholder={translations[language].placeholder}
              className="w-full pl-3 pr-12 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-gray-800 placeholder-gray-500"
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={toggleVoiceInput}
              disabled={isLoading || !isVoiceSupported}
              className={`absolute right-2 bottom-2 mic-button ${isRecording ? 'recording' : ''}`}
              title={isVoiceSupported ? translations[language].voiceInput : translations[language].voiceNotSupported}
            >
              {isRecording ? (
                <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16C14.2091 16 16 14.2091 16 12V6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6V12C8 14.2091 9.79086 16 12 16Z" fill="currentColor"/>
                  <path d="M19 12C19 15.866 15.866 19 12 19M12 19C8.13401 19 5 15.866 5 12M12 19V22M12 22H15M12 22H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 11C19 14.866 15.866 18 12 18M12 18C8.13401 18 5 14.866 5 11M12 18V21M12 21H15M12 21H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className={`p-3 rounded-lg flex-shrink-0 ${
              isLoading || !input.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
            style={{ minWidth: '44px', height: '44px' }}
            title={translations[language].send}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50 border-t">
        {translations[language].disclaimer}
      </div>
    </div>
  );
}
