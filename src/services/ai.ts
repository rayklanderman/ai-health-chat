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
  maxRequests: 30, // Further reduced from 50 to be more conservative
  cooldownPeriod: 3600000, // 1 hour cooldown when limit is hit
  lastRequestTime: Date.now(),
  minRequestInterval: 5000 // Increased to 5 seconds between requests
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 2000, // 2 seconds
  maxDelay: 10000, // 10 seconds
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

    // If we're already in a rate-limited state, return a fallback response
    if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
      const now = Date.now();
      const timeUntilReset = RATE_LIMIT.lastReset + RATE_LIMIT.resetInterval - now;
      if (timeUntilReset > 0) {
        return getNextFallbackResponse();
      }
    }

    // Enforce minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.minRequestInterval - timeSinceLastRequest));
    }
    RATE_LIMIT.lastRequestTime = now;

    // Check and reset rate limit if needed
    resetRateLimit();
    
    // Check if we're in a cooldown period
    if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
      return getNextFallbackResponse();
    }
    
    RATE_LIMIT.requests++;

    // Make the request with retry logic
    const response = await makeModelRequest(userMessage);
    
    // Cache the successful response
    cacheResponse(userMessage, response);
    
    return response;
    
  } catch (error: any) {
    console.error('AI Response Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('rate limit exceeded')) {
      RATE_LIMIT.requests = RATE_LIMIT.maxRequests; // Force cooldown
      return getNextFallbackResponse();
    }
    
    if (error.message?.includes('invalid api key')) {
      return "There seems to be an issue with the API configuration. Please check if your API key is properly set up.";
    }

    if (error.message?.includes('blocked')) {
      return "Your request contains content that cannot be processed. Please ensure your question is about general health information.";
    }

    // Network or timeout errors
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return "I'm having trouble connecting to the server. Please check your internet connection and try again.";
    }

    return "I apologize, but I'm having trouble processing your request. Please try again in a moment. If the problem persists, try refreshing the page.";
  }
}

// Export the AI response function
export const sendMessage = getAIResponse;
