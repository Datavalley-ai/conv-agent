let websocket;

function connectWebSocket() {
  websocket = new WebSocket("ws://localhost:8080"); // Replace with your backend WebSocket URL

  websocket.onopen = () => {
    console.log("WebSocket is connected.");
  };

  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "message") {
      displayMessage(data.message, "assistant");
    }
  };

  websocket.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };

  websocket.onclose = () => {
    console.log("WebSocket connection closed.");
  };
}

function sendMessage() {
  const userInput = document.getElementById("textInput").value;
  if (userInput.trim()) {
    displayMessage(userInput, "user");
    const message = { type: "message", content: userInput };
    websocket.send(JSON.stringify(message));
    document.getElementById("textInput").value = "";
  }
}

function displayMessage(message, sender) {
  const chatBox = document.getElementById("list");
  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble");
  if (sender === "assistant") {
    bubble.classList.add("speaking");
  }
  bubble.textContent = message;
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
}

window.onload = () => {
  connectWebSocket(); // Establish WebSocket connection when the page loads
};
