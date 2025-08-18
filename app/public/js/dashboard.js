// /app/public/js/dashboard.js (Final Version)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const logoutButton = document.getElementById('logoutButton');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const interviewsListContainer = document.getElementById('scheduledInterviewsList');

    /**
     * Main initialization function for the dashboard.
     */
    const init = () => {
        setupEventListeners();
        updateWelcomeMessage();
        fetchAndDisplayScheduledInterviews();
    };
    

    /**
     * Sets up event listeners for interactive elements.
     */
    const setupEventListeners = () => {
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                window.location.href = '/signin.html';
            });
        }

    if (interviewsListContainer) {
            interviewsListContainer.addEventListener('click', handleStartInterviewClick);
        }
    };

    // --- CHANGE #3: New handler function to activate the interview ---
    /**
     * Handles the click event on a "Start Now" button.
     * @param {Event} e The click event object.
     */
    const handleStartInterviewClick = async (e) => {
        // Check if the clicked element is a start button
        if (!e.target.matches('.start-interview-btn, .start-interview-btn *')) {
            return;
        }
        
        // Find the actual button element in case the icon was clicked
        const startButton = e.target.closest('.start-interview-btn');
        if (!startButton) return;

        const sessionId = startButton.dataset.sessionId;
        const token = localStorage.getItem('authToken');

        if (!sessionId || !token) {
            alert('Error: Could not find session ID or authentication token.');
            return;
        }

        try {
            // Disable the button to prevent multiple clicks
            startButton.disabled = true;
            startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            
            // Call the new activation endpoint
            const response = await fetch(`/api/v1/interview/${sessionId}/start-scheduled`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to start the interview session.');
            }
            
            // On success, redirect to the interview page
            window.location.href = `/interview.html?session=${sessionId}`;

        } catch (error) {
            console.error('Error starting interview:', error);
            alert(`An error occurred: ${error.message}`);
            startButton.disabled = false; // Re-enable the button on error
            startButton.innerHTML = '<i class="fas fa-play"></i> Start Now';
        }
    };

    
    /**
     * Fetches scheduled interviews from the API and renders them.
     */
    const fetchAndDisplayScheduledInterviews = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch('/api/v1/interview/my-sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Could not fetch scheduled interviews.');
            }

            const sessions = await response.json();
            renderInterviews(sessions);

        } catch (error) {
            renderError(error.message);
        }
    };

    /**
     * Renders the list of interview sessions into the DOM.
     * @param {Array<object>} sessions - An array of interview session objects.
     */
    const renderInterviews = (sessions) => {
        interviewsListContainer.innerHTML = ''; // Clear skeleton loaders

        if (sessions.length === 0) {
            interviewsListContainer.innerHTML = `<p class="empty-list-message">You have no interviews scheduled at this time.</p>`;
            return;
        }

        sessions.forEach(session => {
            const interviewCard = document.createElement('div');
            interviewCard.className = 'interview-card';
            
            const deadline = session.sessionDeadline 
                ? new Date(session.sessionDeadline).toLocaleString() 
                : 'No deadline';

            // --- CHANGE #1: The <a> tag is now a <button> with a data attribute ---
            interviewCard.innerHTML = `
                <div class="interview-info">
                    <h3 class="interview-title">${session.interviewType}</h3>
                    <p class="interview-details">For role: ${session.jobRole}</p>
                    <p class="interview-deadline">Complete by: ${deadline}</p>
                </div>
                <button data-session-id="${session._id}" class="cta-button primary-button start-interview-btn">
                    <i class="fas fa-play"></i> Start Now
                </button>
            `;
            interviewsListContainer.appendChild(interviewCard);
        });
    };

     /**
     * Renders an error message in the list container.
     * @param {string} message - The error message to display.
     */
    const renderError = (message) => {
        interviewsListContainer.innerHTML = `<p class="error-message">Error: ${message}</p>`;
    };
    
    /**
     * Updates the welcome message using the user's name from the token.
     */
    const updateWelcomeMessage = () => {
        const token = localStorage.getItem('authToken');
        try {
            if (token && welcomeMessage) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.name) {
                    welcomeMessage.textContent = `Welcome, ${payload.name}!`;
                }
            }
        } catch (e) {
            console.error('Could not decode token for welcome message.', e);
        }
    };

    // --- Start the Application ---
    init();
});