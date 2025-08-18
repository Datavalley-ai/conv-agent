// /app/public/js/admin-groups.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Selections ---
    const createGroupBtn = document.getElementById('createGroupBtn');
    const groupModal = document.getElementById('groupModal');
    const groupForm = document.getElementById('groupForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const groupsContainer = document.getElementById('groupsContainer');
    const logoutButton = document.getElementById('logoutButton');

    if (typeof apiClient === 'undefined') {
        console.error('apiClient.js is not loaded. This page will not function.');
        return;
    }

    // --- Main Initializer ---
    const init = () => {
        setupEventListeners();
        fetchAndRenderGroups();
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        createGroupBtn.addEventListener('click', openModal);
        cancelBtn.addEventListener('click', closeModal);
        groupModal.addEventListener('click', (e) => {
            if (e.target === groupModal) closeModal();
        });
        groupForm.addEventListener('submit', handleFormSubmit);
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/signin.html';
        });
    };

    // --- Data & Rendering ---
    const fetchAndRenderGroups = async () => {
        try {
            groupsContainer.innerHTML = '<div class="loading-text">Loading groups...</div>';
            const groups = await apiClient('/admin/groups', 'GET');
            renderGroups(groups);
        } catch (error) {
            groupsContainer.innerHTML = `<div class="loading-text">Error: ${error.message}</div>`;
        }
    };

    const renderGroups = (groups) => {
        groupsContainer.innerHTML = '';
        if (groups.length === 0) {
            groupsContainer.innerHTML = '<div class="loading-text">No groups found. Create one to get started!</div>';
            return;
        }

        groups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card';
            card.innerHTML = `
                <div class="group-card-header">
                    <h3>${group.name}</h3>
                    <span class="member-count">${group.members.length} Members</span>
                </div>
                <div class="group-card-body">
                    <p>${group.description || 'No description provided.'}</p>
                </div>
                <div class="group-card-footer">
                    <button class="action-btn" title="Edit Group"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" title="Add Members"><i class="fas fa-user-plus"></i></button>
                </div>
            `;
            groupsContainer.appendChild(card);
        });
    };

    // --- Modal & Form Handling ---
    const openModal = () => {
        groupForm.reset();
        hideMessage();
        groupModal.classList.remove('hidden');
    };

    const closeModal = () => {
        groupModal.classList.add('hidden');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(groupForm);
        const data = Object.fromEntries(formData.entries());

        try {
            await apiClient('/admin/groups', 'POST', data);
            showMessage('Group created successfully!', 'success');
            setTimeout(() => {
                closeModal();
                fetchAndRenderGroups(); // Refresh the list
            }, 1500);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    // --- UI Helpers ---
    const showMessage = (text, type) => {
        const msgDiv = document.getElementById('modal-message');
        msgDiv.textContent = text;
        msgDiv.className = `form-message ${type}`;
    };
    const hideMessage = () => {
        document.getElementById('modal-message').className = 'form-message hidden';
    };

    init();
});