// /app/public/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');

    /**
     * Handles the form submission event.
     * @param {Event} e - The form submission event.
     * @param {string} endpoint - The API endpoint to send the data to.
     */
    const handleFormSubmit = async (e, endpoint) => {
        e.preventDefault(); // Prevent the default page reload

        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('#button-text');
        const spinner = button.querySelector('#spinner');

        // Show loading state
        button.disabled = true;
        buttonText.textContent = 'Processing...';
        spinner.classList.remove('hidden');

        // Collect form data into a plain object
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                // If the server returns an error (e.g., 400, 401, 409), throw an error
                throw new Error(result.message || 'An unknown error occurred.');
            }

            // --- SUCCESS ---
            // The backend sends back a token upon successful login/registration.
            if (result.token) {
                // Store the token in the browser's local storage. This is how we "remember" the user.
                localStorage.setItem('authToken', result.token);
                // Redirect the user to the main dashboard.
                window.location.href = '/dashboard.html';
            } else {
                throw new Error('No token received from server.');
            }

        } catch (error) {
            // --- FAILURE ---
            // Display the error message from the server (or the generic one).
            alert(`Error: ${error.message}`);
        } finally {
            // Always reset the button to its original state, whether success or failure.
            button.disabled = false;
            buttonText.textContent = form.id === 'signInForm' ? 'Sign In' : 'Create Account';
            spinner.classList.add('hidden');
        }
    };

    // Attach the event listener to the correct form based on which page we're on.
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/v1/auth/login'));
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/v1/auth/register'));
    }
});