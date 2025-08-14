const axios = require('axios');

class AIService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'https://ollama-234807240886.asia-south1.run.app';
    this.model = 'llama3.1:8b-instruct';
  }
  
  async generateInterviewResponse(userMessage, sessionContext = {}) {
    try {
      const prompt = this.buildInterviewPrompt(userMessage, sessionContext);
      
      console.log('🤖 Sending to Ollama:', this.ollamaUrl);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 150,
          top_p: 0.9
        }
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.response.trim();
    } catch (error) {
      console.error('❌ Ollama AI Service Error:', error.message);
      
      // Fallback responses if Ollama fails
      const fallbackResponses = [
        "I apologize, but I'm experiencing a technical issue. Could you please repeat that?",
        "Thank you for sharing. Let me ask you this - what specific challenges did you face in that situation?",
        "That's interesting. Can you walk me through your thought process on that?",
        "I see. How would you approach that differently if you encountered it again?"
      ];
      
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
  }
  
  buildInterviewPrompt(userMessage, context) {
    const { jobRole = 'General Role', messages = [] } = context;
    
    // Get recent conversation context
    const recentMessages = messages.slice(-6); // Last 3 exchanges
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
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      return { status: 'healthy', models: response.data.models };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new AIService();
