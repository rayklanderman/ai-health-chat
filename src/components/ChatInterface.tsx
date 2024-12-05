import { useState, useEffect, useCallback, useRef } from 'react';
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
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      return parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    return [{
      text: "Hello! I'm your AI Health Assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
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
    <div className="chat-container">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">AI Health Assistant</h1>
        <button
          onClick={clearChat}
          className="button"
          title="Clear chat"
        >
          <TrashIcon className="icon" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.isUser ? 'user' : 'assistant'}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">{message.text}</div>
              <div className="actions">
                <button
                  onClick={() => copyToClipboard(message.text, index)}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Copy to clipboard"
                >
                  {message.copied ? (
                    <CheckIcon className="icon text-green-500" />
                  ) : (
                    <ClipboardDocumentIcon className="icon text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type your message..."
          className="input-field"
          rows={1}
        />
        <button
          type="submit"
          className="button"
          disabled={isLoading || !input.trim()}
          title="Send message"
        >
          <PaperAirplaneIcon className="icon" />
        </button>
        <button
          onClick={startListening}
          disabled={isLoading || isListening}
          className={`button ${isListening ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          title={isListening ? 'Listening...' : 'Click to speak'}
        >
          <MicrophoneIcon className={`icon ${isListening ? 'animate-pulse' : ''}`} />
        </button>
      </form>
    </div>
  );
}
