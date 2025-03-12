import axios from 'axios';

const API_BASE_URL = 'https://api.xai.com'; // Replace with your actual AI API URL

class AIClient {
  async generateCode(description: string): Promise<string> {
    const response = await axios.post(`${API_BASE_URL}/generate_code`, { description });
    return response.data.code;
  }

  async explainCode(code: string): Promise<string> {
    const response = await axios.post(`${API_BASE_URL}/explain_code`, { code });
    return response.data.explanation;
  }
}

export default new AIClient();