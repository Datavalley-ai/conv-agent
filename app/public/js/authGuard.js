// /public/js/authGuard.js (Modified)

(function() {
    // Attempt to retrieve the authentication token from browser's local storage.
    const token = localStorage.getItem('authToken');
    
    // Get the name of the current HTML file from the URL.
    const currentPage = window.location.pathname.split('/').pop();

    // Define which pages require a user to be logged in.
    const protectedPages = ['dashboard.html', 'interview.html', 'results.html'];
    
    // Define pages that a logged-in user should be redirected away from.
    const publicOnlyPages = ['signin.html', 'signup.html', 'index.html', ''];

    // SCENARIO 1: User is NOT logged in and is trying to access a protected page.
    if (!token && protectedPages.includes(currentPage)) {
        console.log('AuthGuard: Access denied. No token found. Redirecting to sign-in page.');
        // Forcefully redirect the user to the sign-in page.
        window.location.replace('/signin.html');
        return; // Stop further script execution.
    }

    // SCENARIO 2: User IS logged in and is visiting a public-only page (like login or home).
    if (token && publicOnlyPages.includes(currentPage)) {
        console.log('AuthGuard: User is already logged in. Redirecting to dashboard.');
        // Forcefully redirect the user to their main dashboard.
        window.location.replace('/dashboard.html');
        return; // Stop further script execution.
    }

    // --- NEW MODIFICATION ---
    // SCENARIO 3: User IS logged in and on the interview page, but NO Session ID is present.
    if (token && currentPage === 'interview.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');

        if (!sessionId) {
            console.error('AuthGuard: Access to interview page denied. Missing sessionId. Redirecting to dashboard.');
            // Show the specific error and redirect them back to the dashboard where they can choose a valid interview.
            alert('Error: Session ID is missing. Redirecting to dashboard.');
            window.location.replace('/dashboard.html');
            return; // Stop further script execution.
        }
    }
})();