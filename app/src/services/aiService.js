// /app/src/services/aiService.js (Final Version)

const axios = require('axios');
const logger = require('../utils/logger');

// --- Configuration ---
const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

if (!OLLAMA_URL || !OLLAMA_MODEL) {
    logger.error('FATAL: OLLAMA_URL or OLLAMA_MODEL is not defined in environment variables.');
    process.exit(1);
}

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
        
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, payload, {
            timeout: 60000,
        });

        // Added detailed logging for the raw response for easier debugging
        logger.info(`OLLAMA RAW RESPONSE: ${JSON.stringify(response.data)}`);
        
        const content = response.data.response;

        if (!content) {
            throw new Error('Ollama response is missing the "response" property.');
        }

        if (expectJson) {
            return JSON.parse(content);
        }
        return content.trim();

    } catch (error) {
        // --- IMPROVED ERROR LOGGING ---
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        logger.error(`Error querying Ollama Model. URL: ${OLLAMA_URL}, Model: ${OLLAMA_MODEL}, Error: ${errorMessage}`, { stack: error.stack });
        
        if (expectJson) {
            return { summary: 'Could not generate feedback due to an AI service error.', score: 0, strengths: [], areasForImprovement: [] };
        }
        return "I apologize, but I am encountering a technical issue. Could you please repeat your answer?";
    }
};

// --- THIS FUNCTION IS NOW UPDATED ---
exports.getInitialQuestion = async ({ candidateName, jobRole, interviewType, interviewDuration }) => {
    const messages = [
        {
            role: 'system',
            content: "You are a friendly but professional AI interviewer named 'DataValley AI'. Your task is to start the interview by first delivering a welcome script and then immediately asking your first question. The entire response must be a single block of text. Follow these instructions exactly:\n\n1.  **Welcome Script:** Address the candidate by their first name. Inform them the interview is about to begin and state the total duration. Gently remind them to be prepared.\n\n2.  **First Question:** After the welcome script, ask your first open-ended question relevant to their job role and the interview type.\n\n3.  **Tone:** Maintain a welcoming and professional tone throughout.\n\n4.  **Constraint:** Do not ask the candidate if they are ready. Assume they are and proceed directly from the welcome script to the first question."
        },
        {
            role: 'user',
            content: `Start the interview now with the following details:\n\nINTERVIEW DETAILS:\n- Candidate Name: ${candidateName}\n- Job Role: ${jobRole}\n- Interview Type: ${interviewType}\n- Duration: ${interviewDuration}`
        }
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