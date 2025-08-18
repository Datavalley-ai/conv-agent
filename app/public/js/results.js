// /app/public/js/results.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const elements = {
        loadingState: document.getElementById('loadingState'),
        resultsContent: document.getElementById('resultsContent'),
        finalScore: document.getElementById('finalScore'),
        feedbackSummary: document.getElementById('feedbackSummary'),
        feedbackStrengths: document.getElementById('feedbackStrengths'),
        feedbackImprovements: document.getElementById('feedbackImprovements'),
    };

    /**
     * Main initialization function.
     */
    const init = () => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session');
        const authToken = localStorage.getItem('authToken');

        if (!sessionId || !authToken) {
            displayError('Session ID or authentication token is missing. Please go back to the dashboard.');
            return;
        }

        fetchAndDisplayResults(sessionId, authToken);
    };

    /**
     * Fetches the interview session data and populates the page.
     * @param {string} sessionId - The ID of the interview session.
     * @param {string} authToken - The user's JWT.
     */
    const fetchAndDisplayResults = async (sessionId, authToken) => {
        try {
            const response = await fetch(`/api/v1/interview/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch interview results.');
            }

            const session = await response.json();

            if (session.feedback && session.feedback.score != null) {
                populateResults(session.feedback);
            } else {
                displayError('Feedback for this session is still being generated. Please check back in a moment.');
            }

        } catch (error) {
            displayError(error.message);
        }
    };

    /**
     * Populates the DOM with the feedback data.
     * @param {object} feedback - The feedback object from the API.
     */
    const populateResults = (feedback) => {
        elements.finalScore.textContent = feedback.score || 0;
        elements.feedbackSummary.textContent = feedback.summary || 'No summary available.';

        // Populate strengths list
        elements.feedbackStrengths.innerHTML = ''; // Clear placeholder
        if (feedback.strengths && feedback.strengths.length > 0) {
            feedback.strengths.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                elements.feedbackStrengths.appendChild(li);
            });
        } else {
            elements.feedbackStrengths.innerHTML = '<li>No specific strengths noted.</li>';
        }

        // Populate improvements list
        elements.feedbackImprovements.innerHTML = ''; // Clear placeholder
        if (feedback.areasForImprovement && feedback.areasForImprovement.length > 0) {
            feedback.areasForImprovement.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                elements.feedbackImprovements.appendChild(li);
            });
        } else {
            elements.feedbackImprovements.innerHTML = '<li>No specific areas for improvement noted.</li>';
        }

        // Show the content
        elements.loadingState.classList.add('hidden');
        elements.resultsContent.classList.remove('hidden');
    };

    /**
     * Displays an error message on the card.
     * @param {string} message - The error message.
     */
    const displayError = (message) => {
        const resultsCard = document.getElementById('resultsCard');
        resultsCard.innerHTML = `<div class="results-header"><h1>Error</h1></div><p style="text-align: center;">${message}</p>`;
    };

    // --- Start the script ---
    init();
});