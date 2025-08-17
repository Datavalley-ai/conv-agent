const axios = require('axios');

class AIService {
  constructor() {
    // Point to internal wrapper instead of external service
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:8081/v1';
    this.model = 'llama3.1:8b-instruct';
    this.internalKey = process.env.INTERNAL_KEY || '';
  }
  
  async generateInterviewResponse(userMessage, sessionContext = {}) {
    const { jobRole = 'General Role', messages = [] } = sessionContext;
    
    // Build OpenAI-style messages array
    const chatMessages = [
      ...messages,
      { role: 'user', content: userMessage }
    ];

    console.log('🤖 Sending to internal wrapper:', this.ollamaUrl);
    
    const response = await axios.post(`${this.ollamaUrl}/chat/completions`, {
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 150,
      top_p: 0.9
    }, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.internalKey}`
      }
    });
    
    // Extract content from OpenAI-compatible response
    return response.data.choices[0].message.content.trim();
  }
  
  buildInterviewPrompt(userMessage, context) {
    // This method is no longer needed since the wrapper handles prompt building
    // Keep it for backward compatibility but it won't be used
    const { jobRole = 'General Role', messages = [] } = context;
    
    const recentMessages = messages.slice(-6);
    const conversationHistory = recentMessages
      .map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`)
      .join('\n');
    
    return `You are an AI Interviewer conducting a professional interview for a ${jobRole} position. 

Conversation so far:
${conversationHistory}

Candidate just said: "${userMessage}"

Instructions:
- Ask insightful follow-up questions about their experience
- Focus on technical skills, problem-solving, and behavioral aspects
- Keep responses concise (1-2 sentences)
- Be professional but conversational
- Probe deeper into their examples and experiences
- If they mention specific technologies, ask about challenges they faced

Respond as the Interviewer:`;
  }
  
  async healthCheck() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/healthz`, { 
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${this.internalKey}`
        }
      });
      return { status: 'healthy', service: 'internal-wrapper' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new AIService();
