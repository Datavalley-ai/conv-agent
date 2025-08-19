// /app/src/services/aiService.js (Final and Complete Version)

const axios = require('axios');
const logger = require('../utils/logger');

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
        logger.info(`Sending initial payload to Ollama...`);
        
        // The first request might take a long time if the model is loading
        let response = await axios.post(`${OLLAMA_URL}/api/generate`, payload, {
            timeout: 180000, // 90 second timeout to allow for model loading
        });

        logger.info(`OLLAMA RAW RESPONSE 1: ${JSON.stringify(response.data)}`);

        // If the first response was just to load the model, make the request again.
        if (response.data && response.data.done_reason === 'load') {
            logger.info('Model finished loading, sending request again for the actual response...');
            response = await axios.post(`${OLLAMA_URL}/api/generate`, payload, {
                timeout: 60000, // Shorter timeout for the now-loaded model
            });
            logger.info(`OLLAMA RAW RESPONSE 2: ${JSON.stringify(response.data)}`);
        }

        const content = response.data.response;

        // Final check to ensure we have valid, non-empty content
        if (typeof content !== 'string' || content.trim() === '') {
            throw new Error('Ollama returned an empty or invalid response after loading.');
        }

        if (expectJson) {
            return JSON.parse(content);
        }
        return content.trim();

    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        logger.error(`Error querying Ollama Model. URL: ${OLLAMA_URL}, Error: ${errorMessage}`);
        throw new Error(`The AI service failed to respond. ${errorMessage}`);
    }
};

exports.getInitialQuestion = async (promptData) => {
    const { candidateName, jobRole, interviewType } = promptData;
    const systemPrompt = `You are a friendly and professional AI interviewer from DataValley AI named Alex. Your task is to begin a ${interviewType} interview for a ${jobRole} position with a candidate named ${candidateName}. Your response must be the start of the conversation. First, introduce yourself briefly. Second, greet the candidate by their name. Third, ask your first relevant technical question. Do not ask if they are ready. Begin the interview now.`;
    const messages = [{ role: 'system', content: systemPrompt }];
    return queryLanguageModel(messages);
};

exports.getNextQuestion = async (promptData) => {
    const { jobRole, interviewType, messageHistory } = promptData;
    const systemPrompt = `You are an expert AI interviewer conducting a ${interviewType} interview for a ${jobRole} role. The candidate's last answer is at the end of the provided history. Based on the entire conversation, ask the next single, relevant follow-up question. Do not repeat questions. Keep the conversation flowing naturally.`;
    const messages = [{ role: 'system', content: systemPrompt }, ...messageHistory];
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