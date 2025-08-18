// /app/src/controllers/speechController.js

// We will assume a speechService exists that abstracts the actual API calls
// to external providers like OpenAI or AssemblyAI.
const speechService = require('../services/speechService');
const logger = require('../utils/logger');

/**
 * @desc    Transcribe an audio file to text (Speech-to-Text)
 * @route   POST /api/v1/speech/transcribe
 * @access  Private
 */
exports.transcribeSpeech = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file was provided.' });
        }

        const audioBuffer = req.file.buffer;
        
        // Call the service to perform transcription
        const result = await speechService.transcribe(audioBuffer);

        if (result.success) {
            res.status(200).json({ transcript: result.transcript });
        } else {
            // If the service handled the error but it wasn't successful
            res.status(500).json({ message: result.error || 'Transcription failed.' });
        }

    } catch (error) {
        logger.error('Error in transcribeSpeech controller:', error);
        next(error); // Pass error to the global error handler
    }
};

/**
 * @desc    Synthesize text into an audio file (Text-to-Speech)
 * @route   POST /api/v1/speech/synthesize
 * @access  Private
 */
exports.synthesizeSpeech = async (req, res, next) => {
    try {
        const { text, voice } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: 'Text is required for synthesis.' });
        }

        const options = { voice: voice || 'alloy' };
        
        // Call the service to perform synthesis
        const result = await speechService.synthesize(text, options);

        if (result.success) {
            res.set({
                'Content-Type': result.mimeType || 'audio/mpeg',
                'Content-Length': result.audioBuffer.length,
            });
            res.send(result.audioBuffer);
        } else {
            res.status(500).json({ message: result.error || 'Speech synthesis failed.' });
        }

    } catch (error) {
        logger.error('Error in synthesizeSpeech controller:', error);
        next(error); // Pass error to the global error handler
    }
};