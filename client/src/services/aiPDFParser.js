import axios from 'axios';

class AIPDFParserService {
  /**
   * Use OpenAI or similar service to parse PDF text
   */
  async parseWithAI(text, apiKey) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Extract lead/client information from the following text and return as JSON with fields: name, company, email, phone, address, city, state, zipCode, projectValue, status (lead/active/closed/lost). Only include fields you find.`
            },
            {
              role: 'user',
              content: text.substring(0, 3000) // Limit text length
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('AI parsing failed:', error);
      return null;
    }
  }
}

export default new AIPDFParserService();