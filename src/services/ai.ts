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

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 0,
  lastReset: Date.now(),
  resetInterval: 3600000, // 1 hour in milliseconds
  maxRequests: 60 // requests per hour
};

// Reset rate limit counter
function resetRateLimit() {
  const now = Date.now();
  if (now - RATE_LIMIT.lastReset >= RATE_LIMIT.resetInterval) {
    RATE_LIMIT.requests = 0;
    RATE_LIMIT.lastReset = now;
  }
}

export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    // Check rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    resetRateLimit();
    
    // Check rate limit
    if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
      const waitTime = Math.ceil((RATE_LIMIT.resetInterval - (Date.now() - RATE_LIMIT.lastReset)) / 60000);
      return `Rate limit exceeded. Please try again in about ${waitTime} minutes.`;
    }
    
    RATE_LIMIT.requests++;

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('AI Response Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('rate limit exceeded')) {
      return "I'm currently experiencing high demand. Please try again in a minute. This helps ensure everyone can access the service fairly.";
    }
    
    if (error.message?.includes('invalid api key')) {
      return "There seems to be an issue with the API configuration. Please contact support.";
    }

    if (error.message?.includes('blocked')) {
      return "Your request contains content that cannot be processed. Please ensure your question is about general health information.";
    }

    return "I apologize, but I'm having trouble processing your request. Please try again in a moment.";
  }
}
