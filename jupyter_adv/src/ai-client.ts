import axios from 'axios';

// Base URL for Gemini API
const API_BASE_URL = 'https://generativelanguage.googleapis.com';

// Hardcoded API key from the curl command (use environment variables in production)
const API_KEY = 'AIzaSyDKc0WJ4DuBYxReqAxB2SUNsJ8yMnrt5hU';

// Axios instance with default params and headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  params: {
    key: API_KEY,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

class AIClient {
  // Generate code from a description
  async generateCode(description: string): Promise<string> {
    try {
      const response = await apiClient.post('/v1beta/models/gemini-2.0-flash:generateContent', {
        contents: [{
          parts: [{ text: `Generate code for: ${description}` }],
        }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });
      // Extract the generated text from the Gemini API response
      const generatedText = response.data.candidates[0].content.parts[0].text;
      return generatedText || 'No code generated';
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  // Explain provided code
  async explainCode(code: string): Promise<string> {
    try {
      const response = await apiClient.post('/v1beta/models/gemini-2.0-flash:generateContent', {
        contents: [{
          parts: [{ text: `Explain this code:\n${code}` }],
        }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.5,
        },
      });
      // Extract the explanation from the Gemini API response
      const explanation = response.data.candidates[0].content.parts[0].text;
      return explanation || 'No explanation generated';
    } catch (error) {
      console.error('Error explaining code:', error);
      throw error;
    }
  }
}

export default new AIClient();