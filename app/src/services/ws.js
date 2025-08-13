import WebSocket from 'ws';
import { Interview } from './models/Interview.js';  // Assuming Interview model is created
import { log } from './app.js';  // Import the logger
import { generateOllamaResponse } from './services/ollama-service.js';  // Import Ollama service

// Create WebSocket server for real-time communication
export function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const sessionId = req.url?.split('/')[2]; // Assume session ID is part of URL
    
    // Log new connection
    log.info(`New WebSocket connection established for session: ${sessionId}`);

    ws.on('message', async (message) => {
      try {
        // Parse incoming message (e.g., user input)
        const data = JSON.parse(message);
        const { type, content } = data;

        // Handle message type
        if (type === 'message') {
          // Save the message (from user) to the database
          const interview = await Interview.findById(sessionId);
          if (!interview) {
            return ws.send(JSON.stringify({ error: 'Session not found' }));
          }

          // Append the user message to the session
          interview.messages.push({ role: 'user', content });
          await interview.save();

          // Generate a response from Ollama
          const response = await generateOllamaResponse(content);

          // Send the assistant's response back to the client (via WebSocket)
          ws.send(JSON.stringify({ type: 'message', content: response }));

          // Optionally log the response
          log.info(`Sent response for session: ${sessionId}`, { response });
        }
      } catch (err) {
        log.error(`Error processing WebSocket message: ${err}`);
        ws.send(JSON.stringify({ error: 'Error processing message' }));
      }
    });

    // Handle WebSocket close event
    ws.on('close', () => {
      log.info(`WebSocket connection closed for session: ${sessionId}`);
    });
  });
}
