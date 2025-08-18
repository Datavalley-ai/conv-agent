// /app/src/routes/api/v1/speech.js

const express = require('express');
const multer = require('multer');
const router = express.Router();

// Import the controller functions
const { transcribeSpeech, synthesizeSpeech } = require('../../../controllers/speechController');

// Import our JWT authentication middleware to protect the routes
const auth = require('../../../middleware/auth');

// Configure multer for in-memory audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB file size limit
});

/**
 * @route   POST /api/v1/speech/transcribe
 * @desc    Transcribes user audio to text (STT).
 * @access  Private (Requires authentication)
 */
router.post('/transcribe', auth, upload.single('audio'), transcribeSpeech);

/**
 * @route   POST /api/v1/speech/synthesize
 * @desc    Synthesizes text into audio (TTS).
 * @access  Private (Requires authentication)
 */
router.post('/synthesize', auth, synthesizeSpeech);

module.exports = router;