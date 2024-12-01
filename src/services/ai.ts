import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const HEALTH_CONTEXT = `You are a helpful AI health assistant. Your role is to:
1. Provide general health information and guidance
2. Help users understand basic medical terms
3. Suggest healthy lifestyle choices
4. Always remind users to consult healthcare professionals for specific medical advice
5. Never provide specific medical diagnoses or treatment recommendations
6. Be empathetic and professional in your responses
Keep responses concise and focused.`;

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    // Check rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

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
