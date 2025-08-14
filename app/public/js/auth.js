class AuthManager {
    constructor() {
        this.apiBaseUrl = '/api/v1/auth';
        this.init();
    }

    init() {
        // Check if already authenticated
        if (this.getToken()) {
            window.location.href = 'dashboard.html';
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form switching
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // OAuth buttons
        document.getElementById('googleSignIn').addEventListener('click', () => this.handleGoogleAuth('login'));
        document.getElementById('googleSignUp').addEventListener('click', () => this.handleGoogleAuth('register'));
        document.getElementById('datavalleySignIn').addEventListener('click', () => this.handleDatavalleyAuth('login'));
        document.getElementById('datavalleySignUp').addEventListener('click', () => this.handleDatavalleyAuth('register'));

        // Form submissions
        document.querySelector('#loginForm form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.querySelector('#registerForm form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    showRegisterForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        this.clearMessages();
    }

    showLoginForm() {
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        this.clearMessages();
    }

    async handleGoogleAuth(type) {
        this.showLoading(true);
        this.clearMessages();

        try {
            // Redirect to Google OAuth
            window.location.href = `${this.apiBaseUrl}/google?type=${type}`;
        } catch (error) {
            this.showError('Google authentication failed. Please try again.');
            this.showLoading(false);
        }
    }

    async handleDatavalleyAuth(type) {
        this.showLoading(true);
        this.clearMessages();

        try {
            // Redirect to Datavalley OAuth
            window.location.href = `${this.apiBaseUrl}/datavalley?type=${type}`;
        } catch (error) {
            this.showError('Datavalley authentication failed. Please try again.');
            this.showLoading(false);
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        this.showLoading(true);
        this.clearMessages();

        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.storeToken(data.data.token);
                this.storeUser(data.data.user);
                window.location.href = 'dashboard.html';
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            this.showError('Network error. Please check your connection.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister() {
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        this.showLoading(true);
        this.clearMessages();

        try {
            const response = await fetch(`${this.apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.storeToken(data.data.token);
                this.storeUser(data.data.user);
                window.location.href = 'dashboard.html';
            } else {
                this.showError(data.error || 'Registration failed');
            }
        } catch (error) {
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    storeToken(token) {
        localStorage.setItem('authToken', token);
    }

    storeUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    getToken() {
        return localStorage.getItem('authToken');
    }

    getUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const forms = document.querySelectorAll('.auth-form');
        
        loading.classList.toggle('hidden', !show);
        forms.forEach(form => {
            form.classList.toggle('hidden', show);
        });
    }

    clearMessages() {
        document.getElementById('errorMessage').classList.add('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
