import axios from 'axios';

const API_URL = 'http://localhost:3001/api/chat';

export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    const response = await axios.post(API_URL, {
      message: userMessage
    });

    return response.data.response;
  } catch (error) {
    console.error('AI Response Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', error.response?.data);
    }
    return "I apologize, but I'm having trouble processing your request. Please try again later.";
  }
}
