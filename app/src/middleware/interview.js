// Assuming WebSocket connection is established in `ws` (WebSocket client)

document.getElementById("startBtn").addEventListener("click", function() {
  // Start the interview by initializing the WebSocket connection
  startInterview();

  // Start the 20-minute countdown timer
  startTimer();
});

function startInterview() {
  // Create WebSocket connection
  const socket = new WebSocket('ws://your-backend-ip:3000');

  socket.addEventListener('open', function () {
    console.log('WebSocket connected!');
    // You can send a message to the backend here to indicate that the interview has started
    socket.send(JSON.stringify({ type: 'message', content: 'Start Interview' }));
  });

  socket.addEventListener('message', function (event) {
    console.log('Received message from server:', event.data);
    // Here, you can handle the backend response and update the chat UI with the assistant's reply
  });
}

function startTimer() {
  let totalTime = 20 * 60;  // 20 minutes in seconds
  let timer = setInterval(function() {
    totalTime--;
    let minutes = Math.floor(totalTime / 60);
    let seconds = totalTime % 60;
    document.getElementById("timerPill").textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if (totalTime <= 0) {
      clearInterval(timer);
      alert('Time is up!');
      // You can send a message to stop the interview here if needed.
    }
  }, 1000);
}
