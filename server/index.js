import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Configure OpenAI
process.env.OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
console.log('Server API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');

const openai = new OpenAI();

const HEALTH_CONTEXT = `You are a helpful AI health assistant. Your role is to:
1. Provide general health information and guidance
2. Help users understand basic medical terms
3. Suggest healthy lifestyle choices
4. Always remind users to consult healthcare professionals for specific medical advice
5. Never provide specific medical diagnoses or treatment recommendations
6. Be empathetic and professional in your responses
Keep responses concise and focused.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('API key not configured');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: HEALTH_CONTEXT
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('AI Response Error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
