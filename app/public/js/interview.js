// /app/public/js/interview.js

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
        messagesContainer: document.getElementById('messagesContainer'),
        responseInput: document.getElementById('responseInput'),
        sendButton: document.getElementById('sendButton'),
        voiceButton: document.getElementById('voiceButton'),
        endInterviewButton: document.getElementById('endInterviewButton'),
        voiceActivityOverlay: document.getElementById('voiceActivityOverlay'),
        voiceStatusText: document.getElementById('voiceStatusText'),
        interviewTitle: document.getElementById('interviewTitle'),
    };

    // --- Core Functions ---

    const init = async () => {
        AppState.authToken = localStorage.getItem('authToken');
        const params = new URLSearchParams(window.location.search);
        AppState.sessionId = params.get('session');

        if (!AppState.sessionId || !AppState.authToken) {
            alert('Error: Session ID or authentication token is missing. Redirecting to dashboard.');
            window.location.href = '/dashboard.html';
            return;
        }

        setupEventListeners();
        initVoice(); // This will now be fully implemented
        fetchInitialInterviewState();
    };

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

    // --- DOM Manipulation ---

    const renderMessages = (messages) => {
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

    // --- API Communication ---

    const fetchInitialInterviewState = async () => {
        try {
            const response = await fetch(`/api/v1/interview/${AppState.sessionId}`, {
                headers: { 'Authorization': `Bearer ${AppState.authToken}` }
            });
            if (!response.ok) throw new Error('Could not fetch interview session.');
            
            const session = await response.json();
            elements.interviewTitle.textContent = session.jobRole;
            renderMessages(session.messages);
            playAIAudio(session.messages[session.messages.length - 1].content);

        } catch (error) {
            console.error(error);
            addMessageToDOM('assistant', `Error: ${error.message}. Please try refreshing.`);
        }
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

            addMessageToDOM('assistant', result.nextQuestion);
            await playAIAudio(result.nextQuestion);

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
                
                alert('Interview ended successfully! You will now be taken to the results page.');
                window.location.href = `/results.html?session=${AppState.sessionId}`;
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    
    // --- Voice Handling ---

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
            // Show user they're recording and can click to stop
            elements.voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
            elements.voiceButton.title = 'Stop Recording';
            showVoiceActivity('Listening... (Click to stop)');
        } else {
            // Reset to mic icon
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
            await handleSendMessage(); // Auto-send the transcribed message
        } catch (error) {
            console.error('Transcription error:', error);
            elements.responseInput.value = `[Error: Could not transcribe audio. Please type your answer.]`;
        } finally {
            // IMPORTANT: Reset recording state
            AppState.isRecording = false;
            elements.voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            elements.voiceButton.title = 'Start Recording';
            elements.voiceButton.classList.remove('recording');
            hideVoiceActivity();
        }
    };

    const playAIAudio = async (text) => {
        if (AppState.isRecording) return; // Don't speak while user is recording
        
        try {
            showVoiceActivity('AI is speaking...', true);
            const response = await fetch('/api/v1/speech/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AppState.authToken}`
                },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('Could not synthesize audio.');
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            AppState.currentAudio = new Audio(audioUrl);
            AppState.currentAudio.play();
            
            AppState.currentAudio.onended = () => {
                hideVoiceActivity();
                URL.revokeObjectURL(audioUrl);
                AppState.currentAudio = null;
            };
        } catch (error) {
            console.error('Synthesis error:', error);
            hideVoiceActivity();
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