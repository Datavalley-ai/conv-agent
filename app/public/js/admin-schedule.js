// /app/public/js/admin-schedule.js (Final Version with Autocomplete)

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let userCache = []; // Cache for the user list to power autocomplete

    // --- DOM Selections ---
    const scheduleForm = document.getElementById('scheduleForm');
    const logoutButton = document.getElementById('logoutButton');
    const messageDiv = document.getElementById('form-message');
    const candidateEmailInput = document.getElementById('candidateEmail');
    const userSuggestionsDiv = document.getElementById('userSuggestions');

    // --- Main Initializer ---
    const init = () => {
        setupEventListeners();
        fetchAllUsers(); // Fetch users on page load for autocomplete
    };

    // --- Event Handlers ---
    const setupEventListeners = () => {
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', handleScheduleSubmit);
        }
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }
        if (candidateEmailInput) {
            candidateEmailInput.addEventListener('input', handleEmailInput);
        }
        if (userSuggestionsDiv) {
            userSuggestionsDiv.addEventListener('click', handleSuggestionClick);
        }
    };

    // --- API & Data ---
    const fetchAllUsers = async () => {
        try {
            const response = await apiClient('/admin/users', 'GET');
            // Pluck the array from the response object. Adjust the property 
            // name ('users' or 'data') to match your API.
            userCache = response.users || response.data || [];
        } catch (error) {
            console.error('Failed to fetch user list for autocomplete:', error);
            userCache = []; // Ensure userCache is an array even on error
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        // This function's logic remains the same and will correctly
        // pick up the new durationMinutes field automatically.
        const token = localStorage.getItem('authToken');
        if (!token) {
            showMessage('Authentication error. Please log in again.', 'error');
            return;
        }
        const button = scheduleForm.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('#button-text');
        const spinner = button.querySelector('#spinner');
        
        button.disabled = true;
        buttonText.textContent = 'Scheduling...';
        spinner.classList.remove('hidden');
        hideMessage();

        const formData = new FormData(scheduleForm);
        const data = Object.fromEntries(formData.entries());

        if (!data.sessionDeadline) {
            delete data.sessionDeadline;
        }

        try {
            const result = await apiClient('/api/v1/admin/interviews/schedule', 'POST', data);
            showMessage(`Success! Interview scheduled. Session ID: ${result.session._id}`, 'success');
            scheduleForm.reset();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            button.disabled = false;
            buttonText.textContent = 'Schedule Interview';
            spinner.classList.add('hidden');
        }
    };

    // --- Autocomplete Logic ---
    const handleEmailInput = (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            userSuggestionsDiv.classList.add('hidden');
            return;
        }
        const filteredUsers = userCache.filter(user => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            return user.email.toLowerCase().includes(query) || fullName.includes(query);
        });
        renderSuggestions(filteredUsers);
    };

    const renderSuggestions = (users) => {
        userSuggestionsDiv.innerHTML = '';
        if (users.length === 0) {
            userSuggestionsDiv.classList.add('hidden');
            return;
        }
        users.slice(0, 5).forEach(user => { // Show max 5 suggestions
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${user.firstName} ${user.lastName} (${user.email})`;
            item.dataset.email = user.email;
            userSuggestionsDiv.appendChild(item);
        });
        userSuggestionsDiv.classList.remove('hidden');
    };
    
    const handleSuggestionClick = (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            candidateEmailInput.value = e.target.dataset.email;
            userSuggestionsDiv.classList.add('hidden');
        }
    };

    // --- Helper Functions ---
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.href = '/signin.html';
    };
    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `form-message ${type}`;
    };
    const hideMessage = () => {
        messageDiv.className = 'form-message hidden';
    };

    // --- Start ---
    init();
});