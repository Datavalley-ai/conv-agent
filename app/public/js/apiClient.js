// /app/public/js/apiClient.js

/**
 * A centralized and robust client for making authenticated API calls.
 * It automatically adds the JWT, handles JSON, and gracefully manages
 * session expiration (401 errors) by redirecting to the sign-in page.
 * @param {string} endpoint - The API endpoint to call (e.g., '/interview/start').
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {object} [body] - The JSON body for POST/PUT requests.
 * @returns {Promise<any>} The JSON response from the API.
 * @throws {Error} Throws an error for non-401 failures.
 */
const apiClient = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('authToken');
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`/api/v1${endpoint}`, config);

    // --- GRACEFUL LOGOUT ON EXPIRED TOKEN ---
    // This is the key piece of robust error handling.
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        alert('Your session has expired. Please log in again.');
        window.location.href = '/signin.html';
        // Throw an error to stop further execution in the calling function.
        throw new Error('Session expired.');
    }

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || 'An API error occurred.');
    }

    return result;
};