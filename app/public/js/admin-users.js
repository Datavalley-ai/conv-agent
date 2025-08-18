// /app/public/js/admin-users.js (Final Version with Search and full CRUD)

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let allUsers = []; // Cache for user data to support searching

    // --- DOM Selections ---
    const userTableBody = document.getElementById('userTableBody');
    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalTitle = document.getElementById('modalTitle');
    const logoutButton = document.getElementById('logoutButton');
    const userSearchInput = document.getElementById('userSearchInput'); // <-- For search bar
    
    if (typeof apiClient === 'undefined') {
        console.error('apiClient.js is not loaded. This page will not function.');
        return;
    }

    // --- Main Initializer ---
    const init = () => {
        setupEventListeners();
        fetchAndRenderUsers();
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        addUserBtn.addEventListener('click', () => openModal('create'));
        cancelBtn.addEventListener('click', closeModal);
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) closeModal();
        });
        userForm.addEventListener('submit', handleFormSubmit);
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/signin.html';
        });
        userSearchInput.addEventListener('input', handleSearch); // <-- Search event listener

        userTableBody.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-btn');

            if (editButton) {
                handleEditClick(editButton.dataset.userId);
            }
            if (deleteButton) {
                handleDeleteClick(deleteButton.dataset.userId);
            }
        });
    };

    // --- NEW: Search Handler ---
    const handleSearch = (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const filteredUsers = allUsers.filter(user => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            const email = user.email.toLowerCase();
            return fullName.includes(searchTerm) || email.includes(searchTerm);
        });
        renderTable(filteredUsers);
    };

    // --- Data & Rendering ---
    const fetchAndRenderUsers = async () => {
        try {
            userTableBody.innerHTML = '<tr><td colspan="5" class="loading-text">Loading users...</td></tr>';
            allUsers = await apiClient('/admin/users', 'GET');
            renderTable(allUsers);
        } catch (error) {
            userTableBody.innerHTML = `<tr><td colspan="5" class="loading-text">Error: ${error.message}</td></tr>`;
        }
    };

    const renderTable = (users) => {
        userTableBody.innerHTML = '';
        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="5" class="loading-text">No users found.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            const createdAt = new Date(user.createdAt).toLocaleDateString();
            row.innerHTML = `
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="action-btn edit-btn" data-user-id="${user.id}" title="Edit User"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-user-id="${user.id}" title="Delete User"><i class="fas fa-trash"></i></button>
                </td>
            `;
            userTableBody.appendChild(row);
        });
    };

    // --- Modal Handling & CRUD Operations ---
    const openModal = (mode, user = null) => {
        userForm.reset();
        hideMessage();
        if (mode === 'create') {
            modalTitle.textContent = 'Add New User';
            document.getElementById('userId').value = '';
            document.getElementById('password').setAttribute('required', 'true');
        } else if (mode === 'edit' && user) {
            modalTitle.textContent = 'Edit User';
            document.getElementById('userId').value = user.id;
            document.getElementById('firstName').value = user.firstName;
            document.getElementById('lastName').value = user.lastName;
            document.getElementById('email').value = user.email;
            document.getElementById('role').value = user.role;
            document.getElementById('password').removeAttribute('required');
        }
        userModal.classList.remove('hidden');
    };
    const closeModal = () => { userModal.classList.add('hidden'); };
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(userForm);
        const data = Object.fromEntries(formData.entries());
        const userId = data.userId;
        if (userId && !data.password) { delete data.password; }
        try {
            if (userId) {
                await apiClient(`/admin/users/${userId}`, 'PUT', data);
                showMessage('User updated successfully!', 'success');
            } else {
                await apiClient('/admin/users', 'POST', data);
                showMessage('User created successfully!', 'success');
            }
            setTimeout(() => {
                closeModal();
                fetchAndRenderUsers();
            }, 1500);
        } catch (error) { showMessage(error.message, 'error'); }
    };
    const handleEditClick = (userId) => {
        const userToEdit = allUsers.find(user => user.id === userId);
        if (userToEdit) { openModal('edit', userToEdit); }
    };
    const handleDeleteClick = async (userId) => {
        const userToDelete = allUsers.find(user => user.id === userId);
        if (!userToDelete) return;
        if (confirm(`Are you sure you want to deactivate the user: ${userToDelete.firstName} ${userToDelete.lastName}?`)) {
            try {
                await apiClient(`/admin/users/${userId}`, 'DELETE');
                alert('User deactivated successfully.');
                fetchAndRenderUsers();
            } catch (error) { alert(`Error: ${error.message}`); }
        }
    };
    const showMessage = (text, type) => {
        const msgDiv = document.getElementById('modal-message');
        msgDiv.textContent = text;
        msgDiv.className = `form-message ${type}`;
    };
    const hideMessage = () => { document.getElementById('modal-message').className = 'form-message hidden'; };

    init();
});