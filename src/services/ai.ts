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

export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: 'You are a health assistant. Please keep responses focused on health information.',
        },
        {
          role: 'model',
          parts: 'I understand my role as a health assistant. I will provide general health information while being clear about my limitations and always encouraging professional medical consultation when needed.',
        },
      ],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI Response Error:', error);
    return "I apologize, but I'm having trouble processing your request. Please try again later.";
  }
}
