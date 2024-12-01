import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const HEALTH_CONTEXT = `You are a helpful AI health assistant. Your role is to:
1. Provide general health information and guidance
2. Help users understand basic medical terms
3. Suggest healthy lifestyle choices
4. Always remind users to consult healthcare professionals for specific medical advice
5. Never provide specific medical diagnoses or treatment recommendations
6. Be empathetic and professional in your responses`;

export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: "You are a health assistant. Please keep responses concise and helpful.",
        },
        {
          role: "model",
          parts: "I understand. I'll provide helpful health information while being concise and reminding users to consult healthcare professionals when needed.",
        },
      ],
      generationConfig: {
        maxOutputTokens: 200,
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
