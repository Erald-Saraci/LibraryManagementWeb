const SecurityUtils = {
    validatePassword: function(pw) {
        if (pw.length < 8) throw new Error("Password must be at least 8 characters long.");
        if (!/[A-Z]/.test(pw)) throw new Error("Password must contain at least one uppercase letter.");
        if (!/[a-z]/.test(pw)) throw new Error("Password must contain at least one lowercase letter.");
        if (!/\d/.test(pw)) throw new Error("Password must contain at least one number.");
        if (!/[\W_]/.test(pw)) throw new Error("Password must contain at least one special character.");

        for (let i = 0; i < pw.length - 2; i++) {
            let c1 = pw.charCodeAt(i);
            let c2 = pw.charCodeAt(i + 1);
            let c3 = pw.charCodeAt(i + 2);

            if (c2 === c1 + 1 && c3 === c2 + 1) {
                if (/[a-zA-Z0-9]/.test(pw[i]) && /[a-zA-Z0-9]/.test(pw[i+1]) && /[a-zA-Z0-9]/.test(pw[i+2])) {
                    throw new Error("Password cannot contain alphabetical or numerical sequences (e.g., abc, 123).");
                }
            }
            if (c2 === c1 - 1 && c3 === c2 - 1) {
                if (/[a-zA-Z0-9]/.test(pw[i]) && /[a-zA-Z0-9]/.test(pw[i+1]) && /[a-zA-Z0-9]/.test(pw[i+2])) {
                    throw new Error("Password cannot contain reverse sequences (e.g., cba, 321).");
                }
            }
        }
    }
};

const AuthService = {
    init: function() {
        if (!localStorage.getItem('library_users')) {
            localStorage.setItem('library_users', JSON.stringify([]));
        }
    },
    register: function(username, password, isAdmin, secretKey) {
        SecurityUtils.validatePassword(password);
        
        const users = JSON.parse(localStorage.getItem('library_users'));
        if (users.find(u => u.username === username)) {
            throw new Error("User already exists");
        }
        if (isAdmin && secretKey !== "PROFESSOR100") {
            throw new Error("Invalid Admin Secret Key");
        }
        
        const role = isAdmin ? 'admin' : 'user';
        users.push({ username, password, role, fines: [] });
        localStorage.setItem('library_users', JSON.stringify(users));
    },
    login: function(username, password) {
        const users = JSON.parse(localStorage.getItem('library_users'));
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) throw new Error("Invalid credentials");
        
        localStorage.setItem('library_current_user', JSON.stringify({ username: user.username, role: user.role }));
    },
    logout: function() {
        localStorage.removeItem('library_current_user');
    },
    getCurrentUser: function() {
        const userStr = localStorage.getItem('library_current_user');
        return userStr ? JSON.parse(userStr) : null;
    },
    getUserFines: function(username) {
        const users = JSON.parse(localStorage.getItem('library_users'));
        const user = users.find(u => u.username === username);
        return user ? user.fines : [];
    },
    getAdminIssuedFines: function(adminName) {
        const users = JSON.parse(localStorage.getItem('library_users'));
        let issuedFines = [];
        users.forEach(u => {
            if (u.fines) {
                u.fines.forEach(f => {
                    if (f.issuedBy === adminName) {
                        issuedFines.push({ ...f, targetUser: u.username });
                    }
                });
            }
        });
        return issuedFines;
    },
    getAllUsers: function() {
        return JSON.parse(localStorage.getItem('library_users')).filter(u => u.role === 'user');
    },
    addFine: function(targetUsername, amount, reason, adminName) {
        const users = JSON.parse(localStorage.getItem('library_users'));
        const userIndex = users.findIndex(u => u.username === targetUsername);
        if (userIndex !== -1) {
            const newFine = {
                id: 'F' + Date.now(),
                amount: parseFloat(amount),
                reason: reason,
                date: new Date().toLocaleDateString(),
                issuedBy: adminName
            };
            if (!users[userIndex].fines) users[userIndex].fines = [];
            users[userIndex].fines.push(newFine);
            localStorage.setItem('library_users', JSON.stringify(users));
        }
    }
};

AuthService.init();

const LibraryService = {
    init: async function() {
        if (!localStorage.getItem('library_books')) {
            try {
                const response = await fetch('https://openlibrary.org/subjects/programming.json?limit=8');
                const data = await response.json();
                
                const apiBooks = data.works.map((work, index) => ({
                    id: `api_${index}`,
                    title: work.title,
                    author: work.authors[0]?.name || "Unknown Author",
                    total: 3, 
                    available: 3
                }));

                localStorage.setItem('library_books', JSON.stringify(apiBooks));
                localStorage.setItem('library_loans', JSON.stringify([]));
            } catch (error) {
                localStorage.setItem('library_books', JSON.stringify([]));
            }
        }
        
        this.checkOverdueFines();
    },
    
    checkOverdueFines: function() {
        const loans = JSON.parse(localStorage.getItem('library_loans')) || [];
        let dataChanged = false;
        const now = Date.now();

        loans.forEach(loan => {
            if (loan.dueDateTimestamp && now > loan.dueDateTimestamp && !loan.fineIssued) {
                AuthService.addFine(
                    loan.user, 
                    15, 
                    `Automatic Late Fee: "${loan.title}" was not returned on time.`, 
                    'System'
                );
                
                loan.fineIssued = true;
                dataChanged = true;
            }
        });

        if (dataChanged) {
            localStorage.setItem('library_loans', JSON.stringify(loans));
        }
    },

    getBooks: () => JSON.parse(localStorage.getItem('library_books')),
    
    getLoans: () => {
        const allLoans = JSON.parse(localStorage.getItem('library_loans'));
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return [];
        return allLoans.filter(l => l.user === currentUser.username);
    },
    
    borrowBook: function(bookId) {
        const books = this.getBooks();
        const bookIndex = books.findIndex(b => b.id === bookId);
        
        if (bookIndex === -1) throw new Error("Book not found");
        if (books[bookIndex].available <= 0) throw new Error("Book out of stock");

        books[bookIndex].available--;
        const loans = JSON.parse(localStorage.getItem('library_loans')) || [];
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        const newLoan = {
            loanId: 'L' + Date.now(),
            bookId: bookId,
            user: AuthService.getCurrentUser().username,
            title: books[bookIndex].title,
            borrowDate: new Date().toLocaleDateString(),
            dueDate: dueDate.toLocaleDateString(),
            dueDateTimestamp: dueDate.getTime(),
            fineIssued: false
        };
        
        loans.push(newLoan);
        localStorage.setItem('library_books', JSON.stringify(books));
        localStorage.setItem('library_loans', JSON.stringify(loans));
        return newLoan;
    },
    
    returnBook: function(loanId) {
        const allLoans = JSON.parse(localStorage.getItem('library_loans'));
        const loanIndex = allLoans.findIndex(l => l.loanId === loanId);
        
        if (loanIndex === -1) return;

        const bookId = allLoans[loanIndex].bookId;
        allLoans.splice(loanIndex, 1);

        const books = this.getBooks();
        const book = books.find(b => b.id === bookId);
        if (book) book.available++;

        localStorage.setItem('library_books', JSON.stringify(books));
        localStorage.setItem('library_loans', JSON.stringify(allLoans));
    }
};
