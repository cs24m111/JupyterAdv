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

  async predictInsight(prompt: string): Promise<string> {
    try {
      const response = await apiClient.post('/v1beta/models/gemini-2.0-flash:generateContent', {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.6 },
      });
      return response.data.candidates[0].content.parts[0].text || 'No prediction generated';
    } catch (error) {
      console.error('Error predicting insight:', error);
      throw error;
    }
  }

  async detectBugs(code: string): Promise<string> {
    try {
      const response = await apiClient.post('/v1beta/models/gemini-2.0-flash:generateContent', {
        contents: [{
          parts: [{
            text: `Analyze the following code and identify any potential bugs or errors. For each issue, specify the line number and a brief description. Format the response as a markdown list, with each item starting with "- Line X: " followed by the issue description.\n\n${code}`
          }],
        }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.5,
        },
      });
      const issues = response.data.candidates[0].content.parts[0].text;
      return issues || 'No issues detected';
    } catch (error) {
      console.error('Error detecting bugs:', error);
      throw error;
    }
  }

  async detectErrors(code: string): Promise<string> {
    const response = await apiClient.post('/v1beta/models/gemini-2.0-flash:generateContent', {
      contents: [{
        parts: [{
          text: `Analyze this code and list potential runtime errors with line numbers in the format "Line X: Issue":\n${code}`
        }],
      }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.5 },
    });
    const issuesText = response.data.candidates[0].content.parts[0].text;
    const issuesArray = issuesText.split('\n').map((line: string): { line: number, issue: string } | null => {
      const match = line.match(/Line (\d+): (.*)/);
      return match ? { line: parseInt(match[1], 10), issue: match[2] } : null;
    }).filter(Boolean) as { line: number, issue: string }[];
    return issuesArray.map(issue => `Line ${issue.line}: ${issue.issue}`).join('\n');
  }

  // Suggest a patch for a specific issue
  async suggestPatch(code: string, issue: string): Promise<string> {
    const response = await apiClient.post('/v1beta/models/gemini-2.0-flash:generateContent', {
      contents: [{
        parts: [{
          text: `Suggest a patch for the following code to fix this issue: ${issue}\nCode:\n${code}`
        }],
      }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.5 },
    });
    return response.data.candidates[0].content.parts[0].text || 'No patch suggested';
  }
}

export default new AIClient();
