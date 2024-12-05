import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('Missing VITE_GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 0,
  lastRequestTime: 0,
  maxRequestsPerMinute: 60
};

// Simple in-memory cache
const RESPONSE_CACHE = new Map<string, string>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function cacheResponse(message: string, response: string) {
  RESPONSE_CACHE.set(message, response);
  setTimeout(() => {
    RESPONSE_CACHE.delete(message);
  }, CACHE_TTL);
}

function getCachedResponse(message: string): string | undefined {
  return RESPONSE_CACHE.get(message);
}

function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  if (RATE_LIMIT.lastRequestTime < oneMinuteAgo) {
    RATE_LIMIT.requests = 0;
  }

  return RATE_LIMIT.requests < RATE_LIMIT.maxRequestsPerMinute;
}

const HEALTH_CONTEXT = `You are an AI health assistant. Your role is to:
1. Provide evidence-based health information and wellness guidance
2. Explain medical terminology in clear, understandable language
3. Offer lifestyle recommendations for better health
4. Share preventive health measures
5. Discuss general nutrition and exercise guidelines

Important:
- Always emphasize consulting healthcare professionals
- Never provide specific medical diagnoses
- Keep responses clear and factual
- Focus on general wellness information`;

export async function getAIResponse(
  message: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    // Check rate limit
    if (!checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    // Check cache
    const cachedResponse = getCachedResponse(message);
    if (cachedResponse) {
      return cachedResponse;
    }

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: HEALTH_CONTEXT,
        },
        {
          role: 'model',
          parts: 'I understand my role as an AI health assistant. I will provide evidence-based health information while emphasizing the importance of consulting healthcare professionals. I will not provide medical diagnoses.',
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;

    RATE_LIMIT.requests++;
    RATE_LIMIT.lastRequestTime = Date.now();
    cacheResponse(message, response.text());
    return response.text();
  } catch (error: any) {
    console.error('AI response error:', error);
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
}

// Export the AI response function
export const sendMessage = getAIResponse;
