class Dashboard {
    constructor() {
        this.user = this.getCurrentUser();
        this.selectedInterviewType = 'general';
        this.init();
    }

    init() {
        // Check authentication
        if (!this.getToken()) {
            window.location.href = 'index.html';
            return;
        }

        this.loadUserInfo();
        this.setupEventListeners();
        this.loadStats();
        this.loadRecentSessions();
    }

    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    getToken() {
        return localStorage.getItem('authToken');
    }

    loadUserInfo() {
        if (this.user) {
            document.getElementById('userName').textContent = `Welcome, ${this.user.firstName}!`;
            document.getElementById('userEmail').textContent = this.user.email;
            
            // Set user initials
            const initials = (this.user.firstName[0] + (this.user.lastName[0] || '')).toUpperCase();
            document.getElementById('userInitials').textContent = initials;
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Interview type selection
        document.querySelectorAll('.interview-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active state from all buttons
                document.querySelectorAll('.interview-type-btn').forEach(b => {
                    b.classList.remove('bg-white/30');
                    b.classList.add('bg-white/10');
                });
                
                // Add active state to clicked button
                e.currentTarget.classList.remove('bg-white/10');
                e.currentTarget.classList.add('bg-white/30');
                
                this.selectedInterviewType = e.currentTarget.dataset.type;
            });
        });

        // Start interview button
        document.getElementById('startInterviewBtn').addEventListener('click', () => {
            this.startInterview();
        });
    }

    async loadStats() {
        try {
            const token = this.getToken();
            const response = await fetch('/api/v1/interview/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                if (stats.success) {
                    document.getElementById('completedInterviews').textContent = stats.data.completed || 0;
                    document.getElementById('averageScore').textContent = (stats.data.averageScore || 0) + '%';
                    document.getElementById('totalTime').textContent = this.formatTime(stats.data.totalTime || 0);
                }
            }
        } catch (error) {
            console.log('Stats not available:', error.message);
        }
    }

    async loadRecentSessions() {
        try {
            const token = this.getToken();
            const response = await fetch('/api/v1/interview/recent', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const sessions = await response.json();
                if (sessions.success && sessions.data.length > 0) {
                    this.displayRecentSessions(sessions.data);
                }
            }
        } catch (error) {
            console.log('Recent sessions not available:', error.message);
        }
    }

    displayRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');
        
        container.innerHTML = sessions.map(session => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 rounded-full ${this.getStatusColor(session.status)}"></div>
                    <div>
                        <p class="font-medium text-gray-900">${session.type || 'General'} Interview</p>
                        <p class="text-sm text-gray-500">${this.formatDate(session.createdAt)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">${session.score || 'N/A'}%</p>
                    <p class="text-xs text-gray-500">${this.formatDuration(session.duration)}</p>
                </div>
            </div>
        `).join('');
    }

    async startInterview() {
        try {
            const token = this.getToken();
            const response = await fetch('/api/v1/interview/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: this.selectedInterviewType
                })
            });

            if (response.ok) {
                const session = await response.json();
                if (session.success) {
                    // Store session info and redirect to interview page
                    localStorage.setItem('currentSession', JSON.stringify(session.data));
                    window.location.href = `interview.html?session=${session.data.id}`;
                } else {
                    alert(session.error || 'Failed to start interview');
                }
            } else {
                alert('Failed to start interview. Please try again.');
            }
        } catch (error) {
            console.error('Error starting interview:', error);
            alert('Network error. Please check your connection.');
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'completed': return 'bg-green-500';
            case 'in-progress': return 'bg-yellow-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    formatDuration(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    formatTime(totalMinutes) {
        if (totalMinutes < 60) return `${totalMinutes}m`;
        const hours = Math.floor(totalMinutes / 60);
        return `${hours}h ${totalMinutes % 60}m`;
    }
}

// Initialize dashboard when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
