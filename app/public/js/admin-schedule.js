// /app/public/js/admin-schedule.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selections ---
    const scheduleForm = document.getElementById('scheduleForm');
    const logoutButton = document.getElementById('logoutButton');
    const messageDiv = document.getElementById('form-message');

    // --- Event Handlers ---

    /**
     * Handles the submission of the "Schedule Interview" form.
     * @param {Event} e - The form submission event.
     */
    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('authToken');

        if (!token) {
            showMessage('Authentication error. Please log in again.', 'error');
            return;
        }

        const button = scheduleForm.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('#button-text');
        const spinner = button.querySelector('#spinner');

        // Set loading state
        button.disabled = true;
        buttonText.textContent = 'Scheduling...';
        spinner.classList.remove('hidden');
        hideMessage();

        const formData = new FormData(scheduleForm);
        const data = Object.fromEntries(formData.entries());

        // Important: Remove the deadline field if it's empty,
        // so we don't send an empty string to the backend.
        if (!data.sessionDeadline) {
            delete data.sessionDeadline;
        }

        try {
            const response = await fetch('/api/v1/admin/interviews/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'An unknown error occurred.');
            }

            // --- Success ---
            showMessage(`Success! Interview scheduled. Session ID: ${result.session._id}`, 'success');
            scheduleForm.reset(); // Clear the form for the next entry

        } catch (error) {
            // --- Failure ---
            showMessage(error.message, 'error');
        } finally {
            // Reset button state
            button.disabled = false;
            buttonText.textContent = 'Schedule Interview';
            spinner.classList.add('hidden');
        }
    };

    /**
     * Handles user logout.
     */
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.href = '/signin.html';
    };

    // --- UI Helper Functions ---

    /**
     * Displays a success or error message below the form.
     * @param {string} text - The message to display.
     * @param {string} type - 'success' or 'error'.
     */
    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `form-message ${type}`; // Applies .success or .error class
    };

    /**
     * Hides the message div.
     */
    const hideMessage = () => {
        messageDiv.className = 'form-message hidden';
    };

    // --- Initialization ---
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', handleScheduleSubmit);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
});