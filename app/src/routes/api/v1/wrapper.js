const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const logger = require('../../../utils/logger');

// Environment configuration
const INTERNAL_KEY = process.env.INTERNAL_KEY || '';
const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://ollama:11434';
const MODEL = process.env.MODEL || 'llama3.1:8b-instruct';
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'You are Datavalley\'s AI Interviewer.';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '60000', 10);
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '512', 10);
const TEMPERATURE = parseFloat(process.env.TEMPERATURE || '0.2');
const TOP_P = parseFloat(process.env.TOP_P || '0.9');

// Bearer token authentication middleware
router.use((req, res, next) => {
  if (!INTERNAL_KEY) return next();
  const auth = req.header('authorization') || '';
  if (auth === `Bearer ${INTERNAL_KEY}`) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// Health check endpoint
router.get('/healthz', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'wrapper',
    timestamp: new Date().toISOString() 
  });
});

// Convert OpenAI chat messages to Ollama prompt
function buildPrompt(messages = []) {
  const parts = [`System: ${SYSTEM_PROMPT}`];
  for (const m of messages) {
    if (!m || !m.role || !m.content) continue;
    if (m.role === 'system') continue; // we control system prompt
    parts.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
  }
  parts.push('Assistant:');
  return parts.join('\n');
}

// OpenAI-compatible chat completions endpoint
router.post('/chat/completions', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      messages = [],
      temperature = TEMPERATURE,
      top_p = TOP_P,
      max_tokens = MAX_TOKENS
    } = req.body || {};

    const prompt = buildPrompt(messages);
    
    logger.info({
      messageCount: messages.length,
      promptLength: prompt.length,
      temperature,
      max_tokens
    }, 'Processing chat completion request');

    // Ollama API payload
    const ollamaPayload = {
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature, top_p, num_predict: max_tokens }
    };

    logger.info({ ollamaPayload }, 'Sending request to Ollama');

    // Timeout control with AbortController
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      signal: ctrl.signal
    });

    clearTimeout(timer);

    logger.info({
      status: response.status,
      statusText: response.statusText
    }, 'Ollama response received');

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, 'Ollama request failed');
      return res.status(502).json({ error: 'Upstream error', detail: errorText });
    }

    const responseText = await response.text();
    logger.info({ responseText }, 'Raw Ollama response');

    let data;
    try {
      data = JSON.parse(responseText);
      logger.info({ data }, 'Parsed Ollama response');
    } catch (parseError) {
      logger.error({ parseError: String(parseError), responseText }, 'Failed to parse Ollama JSON response');
      return res.status(502).json({ error: 'Invalid JSON from upstream', detail: responseText });
    }

    const content = data?.response || data?.message?.content || '';
    logger.info({
      contentLength: content.length,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      dataKeys: Object.keys(data || {})
    }, 'Extracted content from Ollama response');

    // OpenAI-compatible response format
    const now = Math.floor(Date.now() / 1000);
    const openaiResponse = {
      id: `chatcmpl-${Math.floor(Math.random() * 1e6)}`,
      object: 'chat.completion',
      created: now,
      model: MODEL,
      system_fingerprint: 'fp_ollama',
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

    logger.info({
      duration: Date.now() - startTime,
      responseContentLength: content.length
    }, 'Request completed successfully');

    return res.status(200).json(openaiResponse);

  } catch (error) {
    logger.error({
      error: String(error),
      stack: error.stack,
      duration: Date.now() - startTime
    }, 'Request failed with exception');
    return res.status(500).json({ error: 'Wrapper failure', detail: String(error) });
  }
});

module.exports = router;
