/**
 * A centralized and robust client for making authenticated API calls.
 * It automatically adds the JWT, handles JSON, and gracefully manages
 * session expiration (401 errors) by redirecting to the sign-in page.
 * @param {string} endpoint - The API endpoint to call (e.g., '/interview/start' or 'interview/start').
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

    // --- FIX: Use URL constructor for robust path joining ---
    // This correctly handles cases where 'endpoint' may or may not have a leading slash.
    const url = new URL(endpoint, 'http://localhost/api/v1/').pathname;

    // We use a dummy base URL; we only care about the resulting path.
    // e.g. new URL('/admin/users', 'http://base/api/v1/').pathname gives '/api/v1/admin/users'
    // e.g. new URL('admin/users', 'http://base/api/v1/').pathname gives '/api/v1/admin/users'

    const response = await fetch(url, config);

    // --- GRACEFUL LOGOUT ON EXPIRED TOKEN ---
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        alert('Your session has expired. Please log in again.');
        window.location.href = '/signin.html';
        throw new Error('Session expired.');
    }

    // Try to parse JSON, but handle cases where the body might be empty
    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        result = await response.json();
    } else {
        // Handle non-JSON responses if necessary, e.g., for a 204 No Content
        result = { message: `Request successful with status ${response.status}` };
    }

    if (!response.ok) {
        throw new Error(result.message || 'An API error occurred.');
    }

    return result;
};
