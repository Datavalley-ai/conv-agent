class InterviewSession {
    constructor() {
        this.sessionId = this.getSessionId();
        this.messages = [];
        this.isActive = true;
        this.startTime = new Date();
        this.init();
    }
    
    init() {
        if (!this.sessionId) {
            this.showError('No interview session found. Please start from the dashboard.');
            return;
        }
        
        this.setupEventListeners();
        this.startSession();
        this.startTimer();
    }
    
    setupEventListeners() {
        document.getElementById('sendResponse').addEventListener('click', () => {
            this.sendUserMessage();
        });
        
        document.getElementById('responseInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendUserMessage();
            }
        });
    }
    
    async startSession() {
        try {
            document.getElementById('interviewType').textContent = 'Starting...';
            
            const response = await fetch(`/api/v1/interview/${this.sessionId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    message: 'START_INTERVIEW',
                    type: 'system'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                document.getElementById('interviewType').textContent = 'Interview Active';
                this.clearMessages();
                this.addMessage('ai', data.response);
            } else {
                this.showError('Failed to start interview: ' + data.error);
            }
        } catch (error) {
            console.error('Error starting session:', error);
            this.showError('Failed to connect to interview service.');
        }
    }
    
    async sendUserMessage() {
        const input = document.getElementById('responseInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input and add user message
        input.value = '';
        this.addMessage('user', message);
        
        // Show typing indicator
        this.showTyping();
        
        try {
            const response = await fetch(`/api/v1/interview/${this.sessionId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    message: message,
                    type: 'user'
                })
            });
            
            const data = await response.json();
            this.hideTyping();
            
            if (data.success) {
                this.addMessage('ai', data.response);
            } else {
                this.showError('Failed to send message: ' + data.error);
            }
        } catch (error) {
            this.hideTyping();
            console.error('Error sending message:', error);
            this.showError('Failed to send message. Please try again.');
        }
    }
    
    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        
        const container = document.getElementById('messagesContainer');
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'message ai-message';
        typingDiv.innerHTML = '<div class="message-content">AI is typing...</div>';
        document.getElementById('messagesContainer').appendChild(typingDiv);
    }
    
    hideTyping() {
        const typing = document.getElementById('typingIndicator');
        if (typing) {
            typing.remove();
        }
    }
    
    clearMessages() {
        document.getElementById('messagesContainer').innerHTML = '';
    }
    
    showError(message) {
        this.addMessage('ai', `Error: ${message}`);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    startTimer() {
        setInterval(() => {
            const elapsed = Math.floor((new Date() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    getSessionId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('session') || localStorage.getItem('currentSessionId');
    }
    
    getToken() {
        return localStorage.getItem('authToken');
    }
}

// Global function for end interview button
function endInterview() {
    if (confirm('Are you sure you want to end this interview?')) {
        window.location.href = 'dashboard.html';
    }
}

// Initialize interview session when page loads
document.addEventListener('DOMContentLoaded', () => {
    new InterviewSession();
});
