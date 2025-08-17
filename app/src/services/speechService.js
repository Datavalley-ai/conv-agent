const axios = require('axios');

class SpeechService {
  constructor() {
    this.sttProvider = process.env.STT_PROVIDER || 'assemblyai';
    this.ttsProvider = process.env.TTS_PROVIDER || 'openai';
  }

  // Main transcribe method (STT)
  async transcribe(audioBuffer, options = {}) {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is required for transcription');
    }

    switch (this.sttProvider.toLowerCase()) {
      case 'assemblyai':
        return this.transcribeAssemblyAI(audioBuffer, options);
      default:
        throw new Error(`Unsupported STT provider: ${this.sttProvider}`);
    }
  }

  // Main synthesize method (TTS)
  async synthesize(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for synthesis');
    }

    switch (this.ttsProvider.toLowerCase()) {
      case 'openai':
        return this.synthesizeOpenAI(text, options);
      default:
        throw new Error(`Unsupported TTS provider: ${this.ttsProvider}`);
    }
  }

  // OpenAI TTS implementation with axios
  async synthesizeOpenAI(text, options = {}) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }

      const voice = options.voice || 'alloy';
      
      const response = await axios.post('https://api.openai.com/v1/audio/speech', {
        model: 'tts-1-hd',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 0.9
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        audioBuffer: Buffer.from(response.data),
        provider: 'openai',
        voice: voice,
        cost: text.length * 0.000015,
        quality: 'hd',
        mimeType: 'audio/mpeg'
      };
    } catch (error) {
      console.error('OpenAI TTS synthesis error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'openai'
      };
    }
  }

  // AssemblyAI STT implementation with axios
  async transcribeAssemblyAI(audioBuffer, options = {}) {
    try {
      if (!process.env.ASSEMBLYAI_API_KEY) {
        throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
      }

      // Step 1: Upload audio
      const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', audioBuffer, {
        headers: {
          'authorization': process.env.ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream'
        }
      });

      const uploadData = uploadResponse.data;
      
      // Step 2: Request transcription
      const transcriptResponse = await axios.post('https://api.assemblyai.com/v2/transcript', {
        audio_url: uploadData.upload_url,
        filter_profanity: true,
        format_text: true,
        punctuate: true,
        speaker_labels: options.speaker_labels || false
      }, {
        headers: {
          'authorization': process.env.ASSEMBLYAI_API_KEY,
          'content-type': 'application/json'
        }
      });

      const transcriptData = transcriptResponse.data;
      
      // Step 3: Poll for completion
      let transcript = null;
      let attempts = 0;
      
      while (attempts < 30) {
        const statusResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
          headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY }
        });
        
        const statusData = statusResponse.data;
        
        if (statusData.status === 'completed') {
          transcript = statusData;
          break;
        } else if (statusData.status === 'error') {
          throw new Error(statusData.error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!transcript) {
        throw new Error('Transcription timeout after 30 seconds');
      }

      return {
        success: true,
        transcript: transcript.text || '',
        confidence: transcript.confidence || 0.95,
        provider: 'assemblyai',
        cost: (transcript.audio_duration / 60) * 0.00037,
        duration: transcript.audio_duration
      };
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      return {
        success: false,
        error: error.message,
        transcript: '',
        provider: 'assemblyai'
      };
    }
  }

  // Health check method
  async healthCheck() {
    const status = {
      stt: {
        provider: this.sttProvider,
        available: false
      },
      tts: {
        provider: this.ttsProvider,
        available: false
      }
    };

    if (this.sttProvider === 'assemblyai' && process.env.ASSEMBLYAI_API_KEY) {
      status.stt.available = true;
    }

    if (this.ttsProvider === 'openai' && process.env.OPENAI_API_KEY) {
      status.tts.available = true;
    }

    return status;
  }
}

module.exports = new SpeechService();
