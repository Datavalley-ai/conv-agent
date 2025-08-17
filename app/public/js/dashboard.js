console.log('[Dashboard] file loaded');

class Dashboard {
    constructor() {
        // ADD DEBUG LOGGING FIRST
        const token = this.getToken();
        console.log('[Dashboard] JWT Token exists:', !!token);
        console.log('[Dashboard] JWT Token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'NULL');
        
        // Decode and inspect the token payload
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('[Dashboard] Token payload:', payload);
                console.log('[Dashboard] Token user ID fields:', {
                    id: payload.id,
                    sub: payload.sub,
                    _id: payload._id,
                    userId: payload.userId
                });
            } catch (e) {
                console.error('[Dashboard] Failed to decode token:', e);
            }
        }
        
        this.user = this.getCurrentUser();
        console.log('[Dashboard] User from localStorage:', this.user);
        
        this.selectedInterviewType = 'general';
        this.isLoading = false;
        this.init();
    }

    init() {
        // Check authentication
        if (!this.getToken()) {
            console.log('[Dashboard] No token found, redirecting to signin');
            window.location.href = '/signin';
            return;
        }

        this.loadUserInfo();
        this.setupEventListeners();
        this.loadStats();
        this.loadRecentSessions();
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            const parsed = userData ? JSON.parse(userData) : null;
            console.log('[Dashboard] Parsed user data:', parsed);
            return parsed;
        } catch (error) {
            console.error('[Dashboard] Error parsing user data:', error);
            return null;
        }
    }

    getToken() {
        const token = localStorage.getItem('jwt');
        console.log('[Dashboard] Retrieved token from localStorage:', token ? 'EXISTS' : 'NULL');
        return token;
    }

    loadUserInfo() {
        console.log('[Dashboard] Loading user info:', this.user);
        
        try {
            if (this.user && this.user.firstName) {
                const fi = this.user.firstName.charAt(0).toUpperCase() || '';
                const li = (this.user.lastName && this.user.lastName.charAt(0).toUpperCase()) || '';
                const initials = (fi + li) || 'U';

                const userNameEl = document.getElementById('userName');
                const userEmailEl = document.getElementById('userEmail');
                const userInitialsEl = document.getElementById('userInitials');

                if (userNameEl) userNameEl.textContent = `Welcome, ${this.user.firstName}!`;
                if (userEmailEl) userEmailEl.textContent = this.user.email || '';
                if (userInitialsEl) userInitialsEl.textContent = initials;
            } else {
                // Fallback for missing user data
                const userNameEl = document.getElementById('userName');
                const userEmailEl = document.getElementById('userEmail');
                const userInitialsEl = document.getElementById('userInitials');

                if (userNameEl) userNameEl.textContent = 'Welcome!';
                if (userEmailEl) userEmailEl.textContent = '';
                if (userInitialsEl) userInitialsEl.textContent = 'U';
            }
        } catch (error) {
            console.error('[Dashboard] Error loading user info:', error);
        }
    }

    setupEventListeners() {
        console.log('[Dashboard] Setting up event listeners');

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                console.log('[Dashboard] Logout clicked');
                localStorage.removeItem('jwt');
                localStorage.removeItem('user');
                localStorage.removeItem('currentSession');
                localStorage.removeItem('conversationHistory');
                window.location.href = '/index.html';
            });
        }

        // Interview type selection
        document.querySelectorAll('.interview-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('[Dashboard] Interview type selected:', e.currentTarget.dataset.type);
                
                // Remove active state from all buttons
                document.querySelectorAll('.interview-type-btn').forEach(b => {
                    b.classList.remove('bg-white/30', 'ring-2', 'ring-white/50');
                    b.classList.add('bg-white/10');
                });
                
                // Add active state to clicked button
                e.currentTarget.classList.remove('bg-white/10');
                e.currentTarget.classList.add('bg-white/30', 'ring-2', 'ring-white/50');
                
                this.selectedInterviewType = e.currentTarget.dataset.type;
            });
        });

        // Start interview button
        const startBtn = document.getElementById('startInterviewBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                console.log('[Dashboard] Start interview button clicked');
                this.startInterview();
            });
        } else {
            console.error('[Dashboard] Start interview button not found');
        }
    }

    async loadStats() {
        console.log('[Dashboard] Loading stats');
        
        try {
            const token = this.getToken();
            if (!token) {
                console.error('[Dashboard] No token available for stats');
                return;
            }

            console.log('[Dashboard] Making stats request with token:', token.substring(0, 20) + '...');

            const response = await fetch('/api/v1/interview/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[Dashboard] Stats response status:', response.status);
            console.log('[Dashboard] Stats response headers:', Object.fromEntries(response.headers));

            if (response.ok) {
                const result = await response.json();
                console.log('[Dashboard] Stats response:', result);
                
                if (result.success) {
                    this.updateStatsDisplay(result.data);
                } else {
                    console.error('[Dashboard] Stats API error:', result.error);
                }
            } else {
                const errorText = await response.text();
                console.error('[Dashboard] Stats request failed:', response.status, response.statusText);
                console.error('[Dashboard] Stats error response:', errorText);
            }
        } catch (error) {
            console.error('[Dashboard] Error loading stats:', error);
            this.updateStatsDisplay({ completed: 0, averageScore: 0, totalTime: 0 });
        }
    }

    updateStatsDisplay(stats) {
        try {
            const completedEl = document.getElementById('completedInterviews');
            const avgScoreEl = document.getElementById('averageScore');
            const totalTimeEl = document.getElementById('totalTime');

            if (completedEl) completedEl.textContent = stats.completed || 0;
            if (avgScoreEl) avgScoreEl.textContent = Math.round(stats.averageScore || 0) + '%';
            if (totalTimeEl) totalTimeEl.textContent = this.formatTime(stats.totalTime || 0);
        } catch (error) {
            console.error('[Dashboard] Error updating stats display:', error);
        }
    }

    async loadRecentSessions() {
        console.log('[Dashboard] Loading recent sessions');
        
        try {
            const token = this.getToken();
            if (!token) {
                console.error('[Dashboard] No token available for recent sessions');
                return;
            }

            console.log('[Dashboard] Making recent sessions request');

            const response = await fetch('/api/v1/interview/recent', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[Dashboard] Recent sessions response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('[Dashboard] Recent sessions response:', result);
                
                if (result.success && result.data && result.data.length > 0) {
                    this.displayRecentSessions(result.data);
                } else {
                    this.displayEmptyRecentSessions();
                }
            } else {
                const errorText = await response.text();
                console.error('[Dashboard] Recent sessions request failed:', response.status);
                console.error('[Dashboard] Recent sessions error response:', errorText);
                this.displayEmptyRecentSessions();
            }
        } catch (error) {
            console.error('[Dashboard] Error loading recent sessions:', error);
            this.displayEmptyRecentSessions();
        }
    }

    displayRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');
        if (!container) return;
        
        container.innerHTML = sessions.map(session => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full ${this.getStatusColor(session.status)}"></div>
                    <div>
                        <p class="font-medium text-gray-900">${session.type || 'General'} Interview</p>
                        <p class="text-sm text-gray-500">${this.formatDate(session.createdAt)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">${session.score || 'Pending'}</p>
                    <p class="text-xs text-gray-500">${this.formatDuration(session.duration)}</p>
                </div>
            </div>
        `).join('');
    }

    displayEmptyRecentSessions() {
        const container = document.getElementById('recentSessions');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p class="text-sm">No recent interviews found</p>
                <p class="text-xs mt-1">Start your first interview to see it here</p>
            </div>
        `;
    }

    async startInterview() {
        if (this.isLoading) {
            console.log('[Dashboard] Interview start already in progress');
            return;
        }

        console.log('[Dashboard] Starting interview with type:', this.selectedInterviewType);
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('[Dashboard] Making request to /api/v1/interview/start');
            console.log('[Dashboard] Request headers will include token:', token.substring(0, 20) + '...');
            
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

            console.log('[Dashboard] Response status:', response.status);
            console.log('[Dashboard] Response headers:', Object.fromEntries(response.headers));
            
            if (response.ok) {
                const result = await response.json();
                console.log('[Dashboard] Start interview response:', result);
                
                if (result.success && result.data) {
                    // Store session info and redirect
                    localStorage.setItem('currentSession', JSON.stringify(result.data));
                    
                    console.log('[Dashboard] Redirecting to interview page');
                    window.location.href = `/interview?session=${result.data.id}`;
                } else {
                    throw new Error(result.error || 'Failed to start interview session');
                }
            } else {
                // Handle specific error responses
                const errorText = await response.text();
                console.error('[Dashboard] Start interview failed with status:', response.status);
                console.error('[Dashboard] Error response body:', errorText);
                
                let errorResult = {};
                try {
                    errorResult = JSON.parse(errorText);
                } catch (e) {
                    console.error('[Dashboard] Could not parse error response as JSON');
                }
                
                if (response.status === 409) {
                    // Existing session conflict
                    if (errorResult.data && errorResult.data.existingSessionId) {
                        const continueExisting = confirm('You have an active interview session. Would you like to continue it?');
                        if (continueExisting) {
                            window.location.href = `/interview?session=${errorResult.data.existingSessionId}`;
                            return;
                        }
                    }
                }
                
                throw new Error(errorResult.error || `Server error: ${response.status}`);
            }
        } catch (error) {
            console.error('[Dashboard] Error starting interview:', error);
            
            // Show user-friendly error message
            let errorMessage = 'Unable to start interview. ';
            
            if (error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection.';
            } else if (error.message.includes('token')) {
                errorMessage += 'Please sign in again.';
                setTimeout(() => {
                    window.location.href = '/signin';
                }, 2000);
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const startBtn = document.getElementById('startInterviewBtn');
        
        if (startBtn) {
            if (loading) {
                startBtn.disabled = true;
                startBtn.innerHTML = `
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting Interview...
                `;
                startBtn.classList.add('opacity-75');
            } else {
                startBtn.disabled = false;
                startBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1a3 3 0 000-6h-1m0 6v6m0-6h1a3 3 0 010 6H9m-1-6V4m-6 6v6m0-6V4m0 6h1a3 3 0 010 6H3"></path>
                    </svg>
                    Start Interview
                `;
                startBtn.classList.remove('opacity-75');
            }
        }
    }

    getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-green-500';
            case 'active': 
            case 'in-progress': return 'bg-yellow-500';
            case 'failed':
            case 'terminated':
            case 'cancelled': return 'bg-red-500';
            case 'expired': return 'bg-orange-500';
            default: return 'bg-gray-400';
        }
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Unknown date';
            
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    formatDuration(minutes) {
        if (!minutes || minutes < 1) return '< 1m';
        if (minutes < 60) return `${Math.round(minutes)}m`;
        
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    formatTime(totalMinutes) {
        if (!totalMinutes || totalMinutes < 1) return '0m';
        if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`;
        
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
}

// Initialize dashboard when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Dashboard] DOM loaded, initializing dashboard');
    try {
        new Dashboard();
    } catch (error) {
        console.error('[Dashboard] Failed to initialize:', error);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh data when user comes back to the page
        const dashboard = window.dashboardInstance;
        if (dashboard && !dashboard.isLoading) {
            dashboard.loadStats();
            dashboard.loadRecentSessions();
        }
    }
});
