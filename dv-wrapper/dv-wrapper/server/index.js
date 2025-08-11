import express from 'express'
// import fetch from 'node-fetch'  // Node 18+ has global fetch; keep commented
import cors from 'cors'
import pino from 'pino'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/healthz', (_, res) => res.send('ok'))   


const app = express()
const log = pino()

// --- core middleware ---
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.use('/v1', (req, res, next) => {
  const key = process.env.INTERNAL_KEY || '';
  if (!key) return next();
  const auth = req.header('authorization') || '';
  if (auth === `Bearer ${key}`) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// --- config ---
const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://ollama:11434'
const MODEL = process.env.MODEL || 'llama3.1:8b-instruct-q4_K_M'
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "You are Datavalley's AI Interviewer."
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '512', 10)
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '180000', 10)
const TEMPERATURE = parseFloat(process.env.TEMPERATURE || '0.2')
const TOP_P = parseFloat(process.env.TOP_P || '0.9')

// startup log
log.info({
  OLLAMA_BASE,
  MODEL,
  TIMEOUT_MS,
  MAX_TOKENS,
  TEMPERATURE,
  TOP_P,
  hasInternalKey: !!process.env.INTERNAL_KEY
}, '=== DEBUG WRAPPER v4 CONFIGURATION LOADED ===')

// build prompt for Ollama /api/generate
function buildPrompt(messages) {
  const parts = []
  parts.push(`System: ${SYSTEM_PROMPT}`)
  for (const m of messages || []) {
    if (!m || !m.role || !m.content) continue
    if (m.role === 'system') continue // we control system
    parts.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
  }
  parts.push('Assistant:')
  return parts.join('\n')
}

// OpenAI-compatible endpoint
app.post('/v1/chat/completions', async (req, res) => {
  const startTime = Date.now()
  try {
    const {
      messages = [],
      temperature = TEMPERATURE,
      top_p = TOP_P,
      max_tokens = MAX_TOKENS
    } = req.body || {}

    const prompt = buildPrompt(messages)
    log.info({ messageCount: messages.length, promptLength: prompt.length, temperature, max_tokens }, 'Processing chat completion request')

    const ollamaPayload = {
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature, top_p, num_predict: max_tokens }
    }
    log.info({ ollamaPayload }, 'Sending request to Ollama')

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      signal: ctrl.signal
    }).catch(err => {
      throw new Error(`Failed to reach Ollama at ${OLLAMA_BASE}: ${String(err)}`)
    })
    clearTimeout(timer)

    if (!r || !r.ok) {
      const status = r?.status ?? 502
      const errorText = r ? await r.text() : 'No response from upstream'
      log.error({ status, errorText }, 'Ollama request failed')
      return res.status(502).json({ error: 'Upstream error', detail: errorText })
    }

    const responseText = await r.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      log.error({ parseError: String(parseError), responseText }, 'Failed to parse Ollama JSON response')
      return res.status(502).json({ error: 'Invalid JSON from upstream', detail: responseText })
    }

    const content = data?.response || data?.message?.content || ''
    const now = Math.floor(Date.now() / 1000)
    const response = {
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
    }

    log.info({ duration: Date.now() - startTime, responseContentLength: content.length }, 'Request completed successfully')
    return res.status(200).json(response)
  } catch (e) {
    log.error({ error: String(e), stack: e.stack, duration: Date.now() - startTime }, 'Request failed with exception')
    return res.status(500).json({ error: 'Wrapper failure', detail: String(e) })
  }
})

const port = process.env.PORT || 3000
const host = process.env.HOST || '0.0.0.0'
app.listen(port, host, () => log.info({ port, host }, 'Wrapper up'))
