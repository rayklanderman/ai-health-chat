import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const HEALTH_CONTEXT = `You are an advanced AI health assistant powered by cutting-edge technology. Your role is to:
1. Provide evidence-based health information and wellness guidance
2. Explain medical terminology in clear, understandable language
3. Offer personalized lifestyle recommendations for better health
4. Share preventive health measures and wellness strategies
5. Discuss general nutrition and exercise guidelines
6. Support mental health awareness and stress management
7. Help users understand common health conditions

Important Guidelines:
- Always emphasize the importance of consulting healthcare professionals
- Never provide specific medical diagnoses or treatment recommendations
- Maintain a professional, empathetic, and supportive tone
- Focus on evidence-based information from reliable sources
- Keep responses clear, concise, and actionable
- Respect medical privacy and confidentiality
- Encourage healthy lifestyle choices and preventive care

Remember to be empathetic while maintaining professional boundaries.`;

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 0,
  lastReset: Date.now(),
  resetInterval: 3600000, // 1 hour in milliseconds
  maxRequests: 20, // Reduced from 30 to be more conservative
  cooldownPeriod: 3600000, // 1 hour cooldown when limit is hit
  lastRequestTime: Date.now(),
  minRequestInterval: 10000 // Increased to 10 seconds between requests
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 2, // Reduced from 3 to avoid hitting rate limits
  initialDelay: 5000, // Increased to 5 seconds
  maxDelay: 15000, // Increased to 15 seconds
};

// Exponential backoff for retries
async function wait(attempt: number) {
  const delay = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay
  );
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Reset rate limit counters
function resetRateLimit() {
  const now = Date.now();
  if (now - RATE_LIMIT.lastReset >= RATE_LIMIT.resetInterval) {
    RATE_LIMIT.requests = 0;
    RATE_LIMIT.lastReset = now;
  }
}

async function makeModelRequest(userMessage: string, attempt = 0): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 150,
      },
    });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: HEALTH_CONTEXT,
        },
        {
          role: 'model',
          parts: 'I understand my role as a health assistant. I will provide general health information while being clear about my limitations.',
        },
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    if (error.message?.includes('rate limit exceeded') && attempt < RETRY_CONFIG.maxRetries) {
      await wait(attempt);
      return makeModelRequest(userMessage, attempt + 1);
    }
    throw error;
  }
}

// Cache for storing recent responses
interface CacheEntry {
  response: string;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Fallback responses for when rate limit is hit
const FALLBACK_RESPONSES = [
  "I apologize, but I'm currently experiencing high traffic. To ensure service quality, please try again in about an hour. In the meantime, you can try rephrasing your question or checking our general health guidelines.",
  "Due to high demand, I need to take a short break. Please try again in about an hour. For immediate health concerns, please consult a healthcare professional.",
  "I'm temporarily at capacity. Please try again in about an hour. Remember, for urgent medical issues, always contact your healthcare provider directly.",
];

let lastFallbackIndex = -1;

function getNextFallbackResponse(): string {
  lastFallbackIndex = (lastFallbackIndex + 1) % FALLBACK_RESPONSES.length;
  return FALLBACK_RESPONSES[lastFallbackIndex];
}

function getCachedResponse(query: string): string | null {
  const normalizedQuery = query.toLowerCase().trim();
  const cached = responseCache.get(normalizedQuery);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }
  
  return null;
}

function cacheResponse(query: string, response: string) {
  const normalizedQuery = query.toLowerCase().trim();
  responseCache.set(normalizedQuery, {
    response,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      responseCache.delete(key);
    }
  }
}

export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    // Check cache first
    const cachedResponse = getCachedResponse(userMessage);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Check if we're in a cooldown period
    const now = Date.now();
    if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
      const timeUntilReset = RATE_LIMIT.lastReset + RATE_LIMIT.resetInterval - now;
      if (timeUntilReset > 0) {
        const minutesLeft = Math.ceil(timeUntilReset / 60000);
        return `I apologize, but I've reached my request limit. Please try again in about ${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'}. This helps ensure stable service for all users.`;
      }
      // If cooldown period is over, reset the rate limit
      resetRateLimit();
    }

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT.minRequestInterval) {
      const waitTime = RATE_LIMIT.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    RATE_LIMIT.lastRequestTime = now;
    
    RATE_LIMIT.requests++;

    // Make the request with retry logic
    const response = await makeModelRequest(userMessage);
    
    // Cache the successful response
    cacheResponse(userMessage, response);
    
    return response;
    
  } catch (error: any) {
    console.error('AI Response Error:', error);
    
    // Handle rate limit errors
    if (error.message?.toLowerCase().includes('rate limit')) {
      RATE_LIMIT.requests = RATE_LIMIT.maxRequests; // Force cooldown
      return "I'm currently experiencing high demand. Please wait a few minutes before trying again. Your patience helps maintain a stable service for everyone.";
    }
    
    if (error.message?.toLowerCase().includes('api key')) {
      return "There seems to be an issue with the service configuration. The team has been notified and is working on it.";
    }

    if (error.message?.toLowerCase().includes('blocked') || error.message?.toLowerCase().includes('safety')) {
      return "I apologize, but I cannot process that type of content. Please ensure your question is about general health information and doesn't contain sensitive or inappropriate content.";
    }

    // Network or timeout errors
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('timeout')) {
      return "I'm having trouble connecting to the service. Please check your internet connection and try again in a moment.";
    }

    // Generic error with guidance
    return "I encountered an unexpected error. Please try:\n1. Waiting a few moments\n2. Refreshing the page\n3. Asking your question in a different way";
  }
}

// Export the AI response function
export const sendMessage = getAIResponse;
