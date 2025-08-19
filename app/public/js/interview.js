// /public/js/interview.js (Complete, Final Version with Polling Logic)

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const AppState = {
        sessionId: null,
        authToken: null,
        isRecording: false,
        isAISpeaking: false,
        mediaRecorder: null,
        audioChunks: [],
        currentAudio: null,
    };

    // --- DOM Element Selections ---
    const elements = {
        loadingOverlay: document.getElementById('loadingOverlay'),
        loadingText: document.querySelector('#loadingOverlay p'),
        interviewContainer: document.querySelector('.interview-container'),
        messagesContainer: document.getElementById('messagesContainer'),
        responseInput: document.getElementById('responseInput'),
        sendButton: document.getElementById('sendButton'),
        voiceButton: document.getElementById('voiceButton'),
        endInterviewButton: document.getElementById('endInterviewButton'),
        voiceActivityOverlay: document.getElementById('voiceActivityOverlay'),
        voiceStatusText: document.getElementById('voiceStatusText'),
        interviewTitle: document.getElementById('interviewTitle'),
    };

    // --- NEW: Core Initialization Flow ---
    const init = async () => {
        const params = new URLSearchParams(window.location.search);
        AppState.sessionId = params.get('sessionId');
        AppState.authToken = localStorage.getItem('authToken');

        if (!AppState.sessionId || !AppState.authToken) {
            showFatalError('Session or authentication details are missing.');
            return;
        }

        try {
            // Step 1: Kick off the initialization process on the backend
            const startResponse = await fetch(`/api/v1/interview/${AppState.sessionId}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${AppState.authToken}` }
            });

            if (startResponse.status !== 202) {
                const errorData = await startResponse.json();
                throw new Error(errorData.message || 'Could not start the interview session.');
            }

            // Step 2: Start polling for the status
            pollForSessionStatus();

        } catch (error) {
            showFatalError(error.message);
        }
    };

    const pollForSessionStatus = () => {
        let pollCount = 0;
        const maxPolls = 40; // 40 polls * 3 seconds = 2 minutes max wait

        const pollInterval = setInterval(async () => {
            if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                showFatalError('The session timed out. The AI interviewer took too long to respond.');
                return;
            }

            try {
                const statusResponse = await fetch(`/api/v1/interview/${AppState.sessionId}/status`, {
                    headers: { 'Authorization': `Bearer ${AppState.authToken}` }
                });

                if (!statusResponse.ok) {
                    const errorData = await statusResponse.json();
                    throw new Error(errorData.message || 'Error checking session status.');
                }

                const result = await statusResponse.json();
                if (elements.loadingText) {
                    elements.loadingText.textContent = result.message || 'Your interviewer is getting ready...';
                }

                if (result.status === 'ready') {
                    clearInterval(pollInterval);
                    startInterview(result.session);
                } else if (result.status === 'failed') {
                    clearInterval(pollInterval);
                    showFatalError(result.message);
                }

            } catch (error) {
                clearInterval(pollInterval);
                showFatalError(error.message);
            }
            pollCount++;
        }, 3000); // Poll every 3 seconds
    };
    
    const startInterview = (session) => {
        // Hide loading screen and show the main interview UI
        elements.loadingOverlay.classList.add('hidden');
        elements.interviewContainer.classList.remove('hidden');

        elements.interviewTitle.textContent = session.jobRole;
        renderMessages(session.messages);
        
        const firstMessage = session.messages[0];
        if (firstMessage) {
            playAIAudio(firstMessage.content);
        }

        // Setup all other event listeners and functionalities now that the UI is visible
        setupEventListeners();
        initVoice();
    };

    const showFatalError = (message) => {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.innerHTML = `<p style="color: #ff8a8a; padding: 20px; text-align: center;">Error: ${message}<br><br><a href="/dashboard.html" style="color: #fff;">Return to Dashboard</a></p>`;
        }
    };

    // --- ALL EXISTING FUNCTIONS BELOW THIS LINE REMAIN THE SAME ---

    const setupEventListeners = () => {
        elements.sendButton.addEventListener('click', handleSendMessage);
        elements.responseInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        elements.endInterviewButton.addEventListener('click', handleEndInterview);
        elements.voiceButton.addEventListener('click', toggleRecording);
    };

    const renderMessages = (messages) => {
        if (!messages) return;
        elements.messagesContainer.innerHTML = '';
        messages.forEach(msg => addMessageToDOM(msg.role, msg.content));
    };

    const addMessageToDOM = (role, content) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'assistant' ? 'ai-message' : 'user-message'}`;
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`;
        messageDiv.appendChild(bubble);
        elements.messagesContainer.appendChild(messageDiv);
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    };

    const handleSendMessage = async () => {
        const answer = elements.responseInput.value.trim();
        if (!answer || elements.sendButton.disabled) return;

        addMessageToDOM('user', answer);
        elements.responseInput.value = '';
        elements.sendButton.disabled = true;

        try {
            const response = await fetch(`/api/v1/interview/${AppState.sessionId}/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AppState.authToken}`
                },
                body: JSON.stringify({ answer })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            playAIAudio(result.nextQuestion);

        } catch (error) {
            addMessageToDOM('assistant', `Sorry, an error occurred: ${error.message}`);
        } finally {
            elements.sendButton.disabled = false;
        }
    };

    const handleEndInterview = async () => {
        if (AppState.currentAudio) AppState.currentAudio.pause();
        if (confirm('Are you sure you want to end this interview?')) {
            try {
                const response = await fetch(`/api/v1/interview/${AppState.sessionId}/end`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${AppState.authToken}` }
                });
                if (!response.ok) throw new Error('Failed to end the session.');
                
                alert('Interview ended successfully! You will now be taken to the dashboard.');
                window.location.href = `/dashboard.html`;
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    
    const initVoice = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Microphone access is not supported by this browser.');
            elements.voiceButton.disabled = true;
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            AppState.mediaRecorder = new MediaRecorder(stream);
            AppState.mediaRecorder.ondataavailable = e => AppState.audioChunks.push(e.data);
            AppState.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(AppState.audioChunks, { type: 'audio/webm' });
                transcribeAudio(audioBlob);
            };
        } catch (err) {
            console.error('Microphone access denied:', err);
            elements.voiceButton.disabled = true;
            alert('Microphone access is required for audio features. Please enable it in your browser settings.');
        }
    };

    const toggleRecording = () => {
        if (AppState.isRecording) {
            AppState.mediaRecorder.stop();
        } else {
            if (AppState.currentAudio) AppState.currentAudio.pause();
            AppState.audioChunks = [];
            AppState.mediaRecorder.start();
        }
        AppState.isRecording = !AppState.isRecording;
        updateUIAfterRecordingToggle();
    };
    
    const updateUIAfterRecordingToggle = () => {
        elements.voiceButton.classList.toggle('recording', AppState.isRecording);
        
        if (AppState.isRecording) {
            elements.voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
            elements.voiceButton.title = 'Stop Recording';
            showVoiceActivity('Listening... (Click to stop)');
        } else {
            elements.voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            elements.voiceButton.title = 'Start Recording';
            showVoiceActivity('Processing...');
        }
    };

    const transcribeAudio = async (audioBlob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
            const response = await fetch('/api/v1/speech/transcribe', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${AppState.authToken}` },
                body: formData
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Transcription failed.');
            
            elements.responseInput.value = result.transcript;
            await handleSendMessage();
        } catch (error) {
            console.error('Transcription error:', error);
            elements.responseInput.value = `[Error: Could not transcribe audio.]`;
        } finally {
            AppState.isRecording = false;
            elements.voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            elements.voiceButton.title = 'Start Recording';
            elements.voiceButton.classList.remove('recording');
            hideVoiceActivity();
        }
    };

    const playAIAudio = async (text) => {
        if (!text) return;
        showVoiceActivity('AI is speaking...', true);
        try {
            const response = await fetch('/api/v1/speech/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AppState.authToken}` },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('Failed to synthesize audio.');
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            AppState.currentAudio = new Audio(audioUrl);
            AppState.currentAudio.onplaying = () => {
                addMessageToDOM('assistant', text);
                hideVoiceActivity();
            };
            AppState.currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                AppState.currentAudio = null;
            };
            await AppState.currentAudio.play();
        } catch (error) {
            console.error("Audio playback/synthesis error:", error);
            hideVoiceActivity();
            addMessageToDOM('assistant', 'Sorry, an audio error occurred.');
        }
    };

    const showVoiceActivity = (text, isAI = false) => {
        elements.voiceStatusText.textContent = text;
        elements.voiceActivityOverlay.classList.add('visible');
        const indicator = elements.voiceActivityOverlay.querySelector('.voice-activity-indicator');
        if (isAI) {
            indicator.classList.add('ai-speaking');
            indicator.classList.remove('user-recording');
        } else if (AppState.isRecording) {
            indicator.classList.add('user-recording');
            indicator.classList.remove('ai-speaking');
        } else {
            indicator.classList.remove('ai-speaking', 'user-recording');
        }
    };

    const hideVoiceActivity = () => {
        elements.voiceActivityOverlay.classList.remove('visible');
        elements.voiceActivityOverlay.querySelector('.voice-activity-indicator').classList.remove('ai-speaking');
    };

    // --- Start the Application ---
    init();
});