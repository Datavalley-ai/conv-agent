// /public/js/dashboard.js (Bulletproof Version)

document.addEventListener('DOMContentLoaded', () => {
    const state = { user: null, token: localStorage.getItem('authToken') };

    const elements = {
        profileName: document.getElementById('profileName'),
        profileEmail: document.getElementById('profileEmail'),
        headerProfileName: document.getElementById('headerProfileName'),
        interviewsCompleted: document.getElementById('interviewsCompleted'),
        averageScore: document.getElementById('averageScore'),
        tabsContainer: document.querySelector('.tabs'),
        tabContents: document.querySelectorAll('.tab-content'),
        scheduledList: document.getElementById('scheduledInterviewsList'),
        historyList: document.getElementById('interviewHistoryList'),
        modal: document.getElementById('profileModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        profileForm: document.getElementById('profileForm'),
        modalProfileFirstName: document.getElementById('modalProfileFirstName'),
        modalProfileLastName: document.getElementById('modalProfileLastName'),
        modalProfileTitle: document.getElementById('modalProfileTitle'),
        modalProfilePortfolio: document.getElementById('modalProfilePortfolio'),
        modalProfileBio: document.getElementById('modalProfileBio'),
        modalProfilePicture: document.getElementById('modalProfilePicture'),
        modalProfileEmail: document.getElementById('modalProfileEmail'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        profileMenuBtn: document.getElementById('profileMenuBtn'),
        profileSidebar: document.getElementById('profileSidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        closeSidebarBtn: document.getElementById('closeSidebarBtn'),
        sidebarEditProfileBtn: document.getElementById('sidebarEditProfileBtn'),
        sidebarAccountBtn: document.getElementById('sidebarAccountBtn'),
        sidebarLogoutBtn: document.getElementById('sidebarLogoutBtn'),
    };

    // --- API CLIENT ---
    const api = {
        get: async (endpoint) => {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    window.location.href = '/signin.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        },
        put: async (endpoint, data) => {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${state.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    window.location.href = '/signin.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        }
    };
    // --- BULLETPROOF USER RENDERING ---
    const renderUserProfile = (userResponse) => {
        console.log('API Response:', userResponse); // DEBUG: Let's see what we actually get
        
        // Handle multiple possible response formats
        let user = userResponse;
        if (userResponse && userResponse.user) {
            user = userResponse.user; // If wrapped in a 'user' property
        }
        
        if (!user) {
            console.error('No user data found in response');
            elements.profileName.textContent = 'User Profile';
            elements.profileEmail.textContent = 'Could not load details.';
            if (elements.headerProfileName) elements.headerProfileName.textContent = 'Guest';
            return;
        }
        
        state.user = user;
        
        // Handle different name formats
        let displayName = 'User';
        if (user.name) {
            displayName = user.name;
        } else if (user.firstName && user.lastName) {
            displayName = `${user.firstName} ${user.lastName}`;
        } else if (user.firstName) {
            displayName = user.firstName;
        }
        
        elements.profileName.textContent = displayName;
        elements.profileEmail.textContent = user.email || 'No email available';
        if (elements.headerProfileName) {
            elements.headerProfileName.textContent = user.firstName || displayName.split(' ')[0] || 'User';
        }
        
        if (elements.modalProfileFirstName) elements.modalProfileFirstName.value = user.firstName || '';
        if (elements.modalProfileLastName) elements.modalProfileLastName.value = user.lastName || '';
        if (elements.modalProfileTitle) elements.modalProfileTitle.value = user.professionalTitle || '';
        if (elements.modalProfilePortfolio) elements.modalProfilePortfolio.value = user.portfolioUrl || '';
        if (elements.modalProfileBio) elements.modalProfileBio.value = user.bio || '';
        if (elements.modalProfileEmail) elements.modalProfileEmail.value = user.email || '';
    };
    
    const renderInterviewList = (listElement, interviews) => {
        listElement.innerHTML = '';
        if (!interviews || interviews.length === 0) {
            const message = listElement.id.includes('History') 
                ? 'You have no completed interviews.' 
                : 'You have no interviews scheduled.';
            listElement.innerHTML = `<p class="empty-list-message">${message}</p>`;
            return;
        }

        interviews.forEach(session => {
            const card = document.createElement('div');
            card.className = 'interview-card';
            
            if (listElement.id.includes('History')) {
                const score = session.feedback?.score ?? 'N/A';
                const completedDate = session.endedAt ? new Date(session.endedAt).toLocaleDateString() : 'Unknown';
                card.innerHTML = `
                    <div class="interview-info">
                        <h3>${session.interviewType || 'Interview'}</h3>
                        <p>Completed: ${completedDate}</p>
                    </div>
                    <div class="interview-score">
                        <span>${score}</span>
                        <p>Score</p>
                    </div>`;
            } else {
                const deadline = session.sessionDeadline ? new Date(session.sessionDeadline).toLocaleString() : 'No deadline';
                card.innerHTML = `
                    <div class="interview-info">
                        <h3>${session.interviewType || 'Interview'}</h3>
                        <p>For role: ${session.jobRole || 'Not specified'}</p>
                        <p class="deadline">Complete by: ${deadline}</p>
                    </div>
                    <button data-session-id="${session._id}" class="cta-button primary-button start-interview-btn">
                        <i class="fas fa-play"></i> Start Now
                    </button>`;
            }
            listElement.appendChild(card);
        });
    };
    
    const renderMetrics = (history) => {
        if (!history || !Array.isArray(history)) return;
        elements.interviewsCompleted.textContent = history.length;
        const validScores = history.map(s => s.feedback?.score).filter(s => typeof s === 'number');
        if (validScores.length > 0) {
            const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
            elements.averageScore.textContent = Math.round(avg);
        }
    };
    
    // --- EVENT HANDLERS ---
    const setupEventListeners = () => {
        // Tab switching
        if (elements.tabsContainer) {
            elements.tabsContainer.addEventListener('click', (e) => {
                const tabButton = e.target.closest('.tab-link');
                if (!tabButton) return;
                document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
                elements.tabContents.forEach(content => content.classList.remove('active'));
                tabButton.classList.add('active');
                document.getElementById(tabButton.dataset.tab).classList.add('active');
            });
        }

        // Interview start buttons
        document.body.addEventListener('click', (e) => {
            const startButton = e.target.closest('.start-interview-btn');
            if (!startButton) return;
            e.preventDefault();
            if (elements.loadingOverlay) elements.loadingOverlay.style.display = 'flex';
            window.location.href = `/interview.html?sessionId=${startButton.dataset.sessionId}`;
        });

        // Profile sidebar
        const toggleProfileSidebar = () => {
            if (elements.profileSidebar) elements.profileSidebar.classList.toggle('open');
            if (elements.sidebarOverlay) elements.sidebarOverlay.classList.toggle('active');
        };

        if (elements.profileMenuBtn) elements.profileMenuBtn.addEventListener('click', toggleProfileSidebar);
        if (elements.closeSidebarBtn) elements.closeSidebarBtn.addEventListener('click', toggleProfileSidebar);
        if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', toggleProfileSidebar);
        
        if (elements.sidebarEditProfileBtn) {
            elements.sidebarEditProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleProfileSidebar();
                if (elements.modal) elements.modal.style.display = 'flex';
            });
        }

        // Modal handling
        if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', () => elements.modal.style.display = 'none');
        // Cancel button
        const cancelBtn = document.getElementById('cancelProfileBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                elements.modal.style.display = 'none';
            });
        }

        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) elements.modal.style.display = 'none';
            });
        }

        // Profile form
        if (elements.profileForm) {
            elements.profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const updatedData = {
                    firstName: elements.modalProfileFirstName.value.trim(),
                    lastName: elements.modalProfileLastName.value.trim(),
                    professionalTitle: elements.modalProfileTitle.value.trim(),
                    portfolioUrl: elements.modalProfilePortfolio.value.trim(),
                    bio: elements.modalProfileBio.value.trim()
                };
                try {
                    const updatedUser = await api.put('/api/v1/users/me', updatedData);
                    renderUserProfile(updatedUser?.user ?? updatedUser);
                    elements.modal.style.display = 'none';
                } catch (error) {
                    alert(`Could not update profile: ${error.message}`);
                }
            });
        }
        
        // Logout
        if (elements.sidebarLogoutBtn) {
            elements.sidebarLogoutBtn.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                window.location.href = '/signin.html';
            });
        }

        // Account settings placeholder
        if (elements.sidebarAccountBtn) {
            elements.sidebarAccountBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Account settings page is not yet implemented.');
            });
        }
    };

    // --- INITIALIZATION ---
    const init = async () => {
        setupEventListeners();
        
        try {
            console.log('Initializing dashboard...'); // DEBUG
            
            // Load user data first
            try {
                const userResponse = await api.get('/api/v1/users/me');
                renderUserProfile(userResponse);
            } catch (error) {
                console.error('Failed to load user data:', error);
                elements.profileName.textContent = 'Error loading profile';
                elements.profileEmail.textContent = 'Please refresh the page';
            }
            
            // Load interview data
            try {
                const scheduled = await api.get('/api/v1/interview/my-sessions');
                renderInterviewList(elements.scheduledList, scheduled);
            } catch (error) {
                console.error('Failed to load scheduled interviews:', error);
                elements.scheduledList.innerHTML = '<p class="empty-list-message">Error loading interviews</p>';
            }
            
            try {
                const history = await api.get('/api/v1/interview/history');
                renderInterviewList(elements.historyList, history);
                renderMetrics(history);
            } catch (error) {
                console.error('Failed to load interview history:', error);
                elements.historyList.innerHTML = '<p class="empty-list-message">Error loading history</p>';
            }

        } catch (error) {
            console.error('Dashboard initialization failed:', error);
        }
    };

    init();
});
