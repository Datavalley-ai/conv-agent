// /app/src/services/aiService.js (Final Version)

const axios = require('axios');
const logger = require('../utils/logger');

// --- Configuration ---
// This service now only needs to know the URL of the Ollama model itself.
const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY; // Kept for potential future use

if (!OLLAMA_URL || !OLLAMA_MODEL) {
    logger.error('FATAL: OLLAMA_URL or OLLAMA_MODEL is not defined in environment variables.');
    process.exit(1);
}

// This is an OpenAI-compatible payload for Ollama
const createPayload = (messages, model, expectJson = false) => {
    const payload = { model, messages, stream: false };
    if (expectJson) {
        payload.format = 'json';
    }
    return payload;
};

const queryLanguageModel = async (messages, expectJson = false) => {
    try {
        const payload = createPayload(messages, OLLAMA_MODEL, expectJson);
        
        // The URL now correctly points to the Ollama service's generate endpoint
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, payload, {
            timeout: 60000,
        });

        const content = response.data.response;

        if (expectJson) {
            return JSON.parse(content);
        }
        return content.trim();

    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        logger.error(`Error querying Ollama Model: ${errorMessage}`);
        if (expectJson) {
            return { summary: 'Could not generate feedback due to an AI service error.', score: 0, strengths: [], areasForImprovement: [] };
        }
        return "I apologize, but I am encountering a technical issue. Could you please repeat your answer?";
    }
};

exports.getInitialQuestion = async ({ jobRole, interviewType }) => {
    const messages = [
        { role: 'system', content: `You are an expert AI interviewer conducting a professional ${interviewType} interview for a ${jobRole} position. Start with a welcoming sentence, then ask your first open-ended question.` },
        { role: 'user', content: `Start the interview now.` }
    ];
    return queryLanguageModel(messages);
};

exports.getNextQuestion = async (messageHistory) => {
    const messages = [
        { role: 'system', content: `You are an expert AI interviewer. Based on the candidate's last answer, ask one relevant follow-up question.` },
        ...messageHistory
    ];
    return queryLanguageModel(messages);
};

exports.generateFeedback = async (messageHistory) => {
    const transcript = messageHistory.map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`).join('\n');
    const messages = [
        { role: 'system', content: `You are a hiring manager. Provide feedback for the interview transcript ONLY in this JSON format: {"summary": "string", "score": number, "strengths": ["string"], "areasForImprovement": ["string"]}` },
        { role: 'user', content: `Analyze this transcript and provide your evaluation in the required JSON format. The score must be an integer from 0 to 100.\n\nTRANSCRIPT:\n${transcript}` }
    ];
    return queryLanguageModel(messages, true);
};