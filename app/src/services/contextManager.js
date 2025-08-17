const Conversation = require('../models/Conversation');

class ContextManager {
  // Save message to conversation history
  async saveMessage(sessionId, role, content, metadata = {}) {
    try {
      let conversation = await Conversation.findOne({ sessionId });
      
      if (!conversation) {
        conversation = new Conversation({ 
          sessionId, 
          messages: [],
          metadata: { totalMessages: 0, speechUsageCount: 0 }
        });
      }
      
      // Add message to conversation
      conversation.messages.push({
        role,
        content,
        timestamp: new Date(),
        metadata
      });
      
      // Update conversation metadata
      conversation.metadata.totalMessages += 1;
      if (metadata.speechUsed) {
        conversation.metadata.speechUsageCount += 1;
      }
      
      await conversation.save();
      return conversation;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  // Get conversation history for context
  async getConversationHistory(sessionId) {
    try {
      const conversation = await Conversation.findOne({ sessionId });
      return conversation ? conversation.messages : [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Get full conversation with context for AI
  async getContextForAI(sessionId, includeSystemPrompt = true) {
    try {
      const messages = await this.getConversationHistory(sessionId);
      
      let contextMessages = [];
      
      if (includeSystemPrompt) {
        contextMessages.push({
          role: 'system',
          content: process.env.SYSTEM_PROMPT || "You are Datavalley's AI Interviewer. Be concise and probing; follow STAR for behavioral questions."
        });
      }
      
      // Add conversation history
      contextMessages.push(...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
      
      return contextMessages;
    } catch (error) {
      console.error('Error getting AI context:', error);
      return [];
    }
  }

  // End conversation and save assessment
  async endConversation(sessionId, assessment = {}) {
    try {
      const conversation = await Conversation.findOneAndUpdate(
        { sessionId },
        { 
          endedAt: new Date(),
          status: 'completed',
          assessment: {
            ...assessment,
            evaluatedAt: new Date()
          }
        },
        { new: true }
      );
      
      return conversation;
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  // Get conversation for assessment
  async getConversationForAssessment(sessionId) {
    try {
      return await Conversation.findOne({ sessionId });
    } catch (error) {
      console.error('Error getting conversation for assessment:', error);
      return null;
    }
  }
}

module.exports = new ContextManager();
