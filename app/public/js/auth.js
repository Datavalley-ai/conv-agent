// /app/public/js/auth.js (Updated with Role-Based Redirect)

document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');

    const handleFormSubmit = async (e, endpoint) => {
        e.preventDefault();

        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('#button-text');
        const spinner = button.querySelector('#spinner');

        button.disabled = true;
        buttonText.textContent = 'Processing...';
        spinner.classList.remove('hidden');

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
                throw new Error(result.message || 'An unknown error occurred.');
            }

            if (result.token && result.user) {
                localStorage.setItem('authToken', result.token);

                // --- THIS IS THE FIX ---
                // Check the user's role and redirect accordingly.
                const userRole = result.user.role;
                if (userRole === 'admin' || userRole === 'interviewer') {
                    window.location.href = '/admin/dashboard.html'; // Redirect admins to admin dashboard
                } else {
                    window.location.href = '/dashboard.html'; // Redirect candidates to user dashboard
                }
                // --- END OF FIX ---

            } else {
                throw new Error('Invalid response from server.');
            }

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            button.disabled = false;
            buttonText.textContent = form.id === 'signInForm' ? 'Sign In' : 'Create Account';
            spinner.classList.add('hidden');
        }
    };

    if (signInForm) {
        signInForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/v1/auth/login'));
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/v1/auth/register'));
    }
});