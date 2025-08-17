require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  mongodb: {
    uri: 'mongodb+srv://ai_interviewer:Hyderabad123**@ai-interviewer-cluster.ctvdlak.mongodb.net/ai-interviewer?retryWrites=true&w=majority'
  },
  redis: {
    uri: process.env.REDIS_URI || 'redis://localhost:6379'
  },
  ollama: {
    // Update to handle both local and Cloud Run environments
    url: process.env.OLLAMA_URL || 
         process.env.OLLAMA_INTERNAL_IP ? 
         `http://${process.env.OLLAMA_INTERNAL_IP}:11434` : 
         'http://localhost:11434'
  },
  wrapper: {
    // Same pattern for wrapper
    url: process.env.WRAPPER_URL || 
         process.env.WRAPPER_INTERNAL_IP ? 
         `http://${process.env.WRAPPER_INTERNAL_IP}:3000` : 
         'http://localhost:3001',
    internalKey: process.env.WRAPPER_INTERNAL_KEY || '9d7h32Ghpq_!Bxm92JKj3kLvaL@8qYpf'
  }
};
