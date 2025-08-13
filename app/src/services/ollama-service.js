// src/services/ollama-service.js
import fetch from 'node-fetch'; // Ensure node-fetch is installed and available

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://ollama:11434'; // Ollama service URL

// Function to generate a response from Ollama
export async function generateOllamaResponse(userMessage) {
  const prompt = `User: ${userMessage}\nAssistant:`;

  const requestBody = {
    model: 'llama3.1:8b-instruct-q5_K_M', // You can change this to the model you want
    prompt: prompt,
    stream: false,
    options: { temperature: 0.7, max_tokens: 150 }
  };

  try {
    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    return data?.response || 'Sorry, I couldn\'t generate a response.';
  } catch (error) {
    console.error('Error while calling Ollama API:', error);
    return 'Sorry, there was an error processing your message.';
  }
}
