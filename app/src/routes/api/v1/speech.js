const express = require('express');
const multer = require('multer');
const speechService = require('../../../services/speechService');
const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// POST /api/v1/speech/transcribe - Speech to Text
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    const audioBuffer = req.file.buffer;
    const options = {
      language: req.body.language || 'en'
    };

    const result = await speechService.transcribe(audioBuffer, options);
    
    res.json(result);
  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/speech/synthesize - Text to Speech
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for synthesis'
      });
    }

    const options = { voice: voice || 'alloy' };
    const result = await speechService.synthesize(text, options);

    if (result.success) {
      res.set({
        'Content-Type': result.mimeType || 'audio/mpeg',
        'Content-Length': result.audioBuffer.length,
        'Cache-Control': 'public, max-age=31536000'
      });
      res.send(result.audioBuffer);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Synthesis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/speech/health - Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      sttProvider: speechService.sttProvider,
      ttsProvider: speechService.ttsProvider,
      apiKeys: {
        openai: !!process.env.OPENAI_API_KEY,
        assemblyai: !!process.env.ASSEMBLYAI_API_KEY
      }
    };
    
    res.json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
