document.addEventListener('DOMContentLoaded', async () => {
    
    await LibraryService.init();

    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const signupUsername = document.getElementById('signup-username');
    const signupPassword = document.getElementById('signup-password');
    const signupIsAdmin = document.getElementById('signup-is-admin');
    const signupAdminSecret = document.getElementById('signup-admin-secret');

    document.getElementById('go-to-signup').addEventListener('click', () => {
        loginView.style.display = 'none';
        signupView.style.display = 'flex';
    });

    document.getElementById('go-to-login').addEventListener('click', () => {
        signupView.style.display = 'none';
        loginView.style.display = 'flex';
    });

    signupIsAdmin.addEventListener('change', (e) => {
        signupAdminSecret.style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('login-btn').addEventListener('click', () => {
        try {
            AuthService.login(loginUsername.value, loginPassword.value);
            checkAuth();
        } catch (e) {
            alert(e.message);
        }
    });

    document.getElementById('signup-btn').addEventListener('click', () => {
        try {
            if (!signupUsername.value || !signupPassword.value) throw new Error("Fields cannot be empty");
            AuthService.register(
                signupUsername.value, 
                signupPassword.value, 
                signupIsAdmin.checked, 
                signupAdminSecret.value
            );
            alert("Registration successful. Please login.");
            signupView.style.display = 'none';
            loginView.style.display = 'flex';
        } catch (e) {
            alert(e.message);
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        AuthService.logout();
        checkAuth();
    });

    const views = {
        catalog: document.getElementById('catalog-view'),
        dashboard: document.getElementById('dashboard-view'),
        profile: document.getElementById('profile-view'),
        fines: document.getElementById('fines-view'),
        admin: document.getElementById('admin-view')
    };

    function switchView(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active-view'));
        views[viewName].classList.add('active-view');
        
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        if(viewName === 'catalog') document.getElementById('view-catalog-btn').classList.add('active');
        if(viewName === 'admin') document.getElementById('view-admin-btn').classList.add('active');
    }

    document.getElementById('view-catalog-btn').addEventListener('click', () => {
        switchView('catalog');
        renderCatalog();
    });

    document.getElementById('view-dashboard-btn').addEventListener('click', () => {
        switchView('dashboard');
        renderDashboard();
    });

    document.getElementById('view-profile-btn').addEventListener('click', () => {
        switchView('profile');
        renderProfile();
    });

    document.getElementById('view-fines-btn').addEventListener('click', () => {
        switchView('fines');
        renderFines();
    });

    document.getElementById('view-admin-btn').addEventListener('click', () => {
        switchView('admin');
        renderAdmin();
    });

    document.getElementById('submit-fine-btn').addEventListener('click', () => {
        const userSelect = document.getElementById('fine-user-select');
        const amountInput = document.getElementById('fine-amount');
        const reasonInput = document.getElementById('fine-reason');
        
        if (!userSelect.value || !amountInput.value || !reasonInput.value) {
            alert("Please fill out all fields in the fine form.");
            return;
        }

        const adminUser = AuthService.getCurrentUser().username;
        AuthService.addFine(userSelect.value, amountInput.value, reasonInput.value, adminUser);
        
        alert(`Fine issued to ${userSelect.value} successfully.`);
        amountInput.value = '';
        reasonInput.value = '';
        renderAdmin();
    });

    function renderCatalog() {
        const bookGrid = document.getElementById('book-grid');
        bookGrid.innerHTML = '';
        const books = LibraryService.getBooks();

        books.forEach(book => {
            const isAvailable = book.available > 0;
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${book.title}</h3>
                <p class="meta">By ${book.author}</p>
                <p class="stock ${!isAvailable ? 'out-of-stock' : ''}">
                    ${isAvailable ? `${book.available} copies available` : 'Out of Stock'}
                </p>
                <button class="primary" ${!isAvailable ? 'disabled' : ''} onclick="handleBorrow('${book.id}')">
                    ${isAvailable ? 'Borrow Book' : 'Unavailable'}
                </button>
            `;
            bookGrid.appendChild(card);
        });
    }

    function renderDashboard() {
        const loansList = document.getElementById('loans-list');
        loansList.innerHTML = '';
        const loans = LibraryService.getLoans();

        if (loans.length === 0) {
            loansList.innerHTML = '<p>You have no active loans.</p>';
            return;
        }

        loans.forEach(loan => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div>
                    <h4 style="margin: 0 0 0.5rem 0;">${loan.title}</h4>
                    <p class="meta" style="margin: 0; color: #2c3e50;">
                        Date Borrowed: <strong>${loan.borrowDate}</strong><br>
                        Return Deadline: <strong style="color: #e74c3c;">${loan.dueDate}</strong>
                    </p>
                </div>
                <button class="danger" onclick="handleReturn('${loan.loanId}')">Return Book</button>
            `;
            loansList.appendChild(item);
        });
    }

    function renderProfile() {
        const user = AuthService.getCurrentUser();
        document.getElementById('profile-name').textContent = `Username: ${user.username}`;
        document.getElementById('profile-role').textContent = `Account Type: ${user.role.toUpperCase()}`;
    }

    function renderFines() {
        const user = AuthService.getCurrentUser();
        const finesList = document.getElementById('fines-list');
        finesList.innerHTML = '';

        if (user.role === 'admin') {
            document.getElementById('fines-title').textContent = 'Fines Issued By Me';
            const issuedFines = AuthService.getAdminIssuedFines(user.username);
            
            document.getElementById('fines-summary').textContent = `Total Fines Issued: ${issuedFines.length}`;

            if (issuedFines.length === 0) {
                finesList.innerHTML = '<p>You have not issued any fines.</p>';
                return;
            }

            issuedFines.forEach(f => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #e74c3c;">$${f.amount.toFixed(2)} to User: ${f.targetUser}</h4>
                        <p class="meta" style="margin: 0;">Reason: ${f.reason} | Date: ${f.date}</p>
                    </div>
                `;
                finesList.appendChild(item);
            });

        } else {
            document.getElementById('fines-title').textContent = 'My Outstanding Fines';
            const myFines = AuthService.getUserFines(user.username);
            const total = myFines.reduce((sum, f) => sum + f.amount, 0);
            
            document.getElementById('fines-summary').innerHTML = `Total Outstanding: <span style="color: #e74c3c;">$${total.toFixed(2)}</span>`;

            if (myFines.length === 0) {
                finesList.innerHTML = '<p>You have no fines. Great job!</p>';
                return;
            }

            myFines.forEach(f => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #e74c3c;">Fine: $${f.amount.toFixed(2)}</h4>
                        <p class="meta" style="margin: 0;">Reason: ${f.reason} | Date: ${f.date} | Issued By: Admin ${f.issuedBy}</p>
                    </div>
                `;
                finesList.appendChild(item);
            });
        }
    }

    function renderAdmin() {
        const usersList = document.getElementById('users-list');
        const userSelect = document.getElementById('fine-user-select');
        
        usersList.innerHTML = '';
        userSelect.innerHTML = '<option value="">Select a User...</option>';
        
        const normalUsers = AuthService.getAllUsers();

        if (normalUsers.length === 0) {
            usersList.innerHTML = '<p>No normal users registered yet.</p>';
            return;
        }

        normalUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = u.username;
            userSelect.appendChild(opt);

            const totalUserFines = u.fines ? u.fines.reduce((sum, f) => sum + f.amount, 0) : 0;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${u.username}</h3>
                <p class="meta">Role: User</p>
                <p style="color: #e74c3c; font-weight: bold; margin-bottom: 0;">Total Fines: $${totalUserFines.toFixed(2)}</p>
            `;
            usersList.appendChild(card);
        });
    }

    window.handleBorrow = function(bookId) {
        try {
            LibraryService.borrowBook(bookId);
            alert('Book borrowed successfully!');
            renderCatalog();
        } catch (error) {
            alert(error.message);
        }
    };

    window.handleReturn = function(loanId) {
        LibraryService.returnBook(loanId);
        renderDashboard();
    };

    function checkAuth() {
        const user = AuthService.getCurrentUser();
        if (user) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            
            if (user.role === 'admin') {
                document.getElementById('view-admin-btn').style.display = 'block';
                document.getElementById('view-dashboard-btn').style.display = 'none'; 
                switchView('admin');
                renderAdmin();
            } else {
                document.getElementById('view-admin-btn').style.display = 'none';
                document.getElementById('view-dashboard-btn').style.display = 'block'; 
                switchView('catalog');
                renderCatalog();
            }
        } else {
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            loginUsername.value = '';
            loginPassword.value = '';
            signupUsername.value = '';
            signupPassword.value = '';
            signupAdminSecret.value = '';
            signupIsAdmin.checked = false;
            signupAdminSecret.style.display = 'none';
        }
    }

    checkAuth();
});