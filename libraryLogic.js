(function hideEdgePasswordReveal() {
  const style = document.createElement('style');
  style.textContent = `
    input[type="password"]::-ms-reveal,
    input[type="password"]::-ms-clear {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
  `;
  document.head.appendChild(style);
})();

const STORAGE_KEYS = {
  currentUser: 'bookrent_user',
  users: 'bookrent_users',
  books: 'bookrent_books',
  activity: 'bookrent_activity',
};

const defaultBooks = [
  { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Classic', available: true, rating: 4.5, description: 'A timeless classic about the American Dream.', coverClass: 'c1' },
  { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Classic', available: true, rating: 4.8, description: 'A powerful story of justice and empathy.', coverClass: 'c2' },
  { id: '3', title: '1984', author: 'George Orwell', category: 'Dystopian', available: false, rating: 4.6, description: 'A dystopian novel about surveillance and control.', coverClass: 'c3' },
  { id: '4', title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Romance', available: true, rating: 4.7, description: 'A classic romance filled with wit and tension.', coverClass: 'c4' },
  { id: '5', title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasy', available: true, rating: 4.9, description: 'A fantasy adventure through Middle-earth.', coverClass: 'c5' },
  { id: '6', title: 'Harry Potter', author: 'J.K. Rowling', category: 'Fantasy', available: true, rating: 4.8, description: 'A magical school adventure loved by readers worldwide.', coverClass: 'c1' },
];

const state = {
  currentUser: read(STORAGE_KEYS.currentUser, null),
  authView: 'login',
  userView: 'dashboard',
  adminView: 'dashboard',
  showModal: false,
  editingBookId: null,
  finesSearch: '',
};

bootstrap();
render();

function bootstrap() {
  const storedBooks = read(STORAGE_KEYS.books, null);
  if (!Array.isArray(storedBooks)) {
    write(STORAGE_KEYS.books, defaultBooks);
  }

  const existingUsers = read(STORAGE_KEYS.users, []);
  const normalizedUsers = (Array.isArray(existingUsers) ? existingUsers : []).map(user => ({
    ...user,
    id: String(user.id || Date.now() + Math.random()),
    name: String(user.name || '').trim(),
    phone: String(user.phone || '').trim(),
    password: String(user.password || ''),
    role: user.role || 'user',
  })).filter(user => user.name && user.password);
  write(STORAGE_KEYS.users, normalizedUsers);

  const existingActivity = read(STORAGE_KEYS.activity, null);
  if (!Array.isArray(existingActivity) || existingActivity.length === 0) {
    write(STORAGE_KEYS.activity, [
      { id: 'a1', action: 'Book rented', user: 'John Doe', book: '1984', timestamp: new Date(Date.now() - 3600000).toLocaleString() },
      { id: 'a2', action: 'Book returned', user: 'Jane Smith', book: 'The Great Gatsby', timestamp: new Date(Date.now() - 7200000).toLocaleString() },
      { id: 'a3', action: 'New user registered', user: 'Mike Johnson', timestamp: new Date(Date.now() - 10800000).toLocaleString() },
      { id: 'a4', action: 'Book added', user: 'Admin', book: 'Brave New World', timestamp: new Date(Date.now() - 14400000).toLocaleString() },
    ]);
  }

  normalizedUsers.forEach(user => {
    const rentalsKey = `rentals_${user.id}`;
    const wishlistKey = `wishlist_${user.id}`;
    const rentals = read(rentalsKey, []);
    const wishlist = read(wishlistKey, []);
    if (!Array.isArray(rentals)) write(rentalsKey, []);
    if (!Array.isArray(wishlist)) write(wishlistKey, []);
  });

  if (state.currentUser && state.currentUser.id) {
    state.currentUser = {
      id: String(state.currentUser.id),
      name: String(state.currentUser.name || '').trim(),
      phone: String(state.currentUser.phone || '').trim(),
      role: state.currentUser.role || 'user',
    };
    write(STORAGE_KEYS.currentUser, state.currentUser);
    const currentUserRentalsKey = `rentals_${state.currentUser.id}`;
    const currentUserWishlistKey = `wishlist_${state.currentUser.id}`;
    if (!Array.isArray(read(currentUserRentalsKey, []))) write(currentUserRentalsKey, []);
    if (!Array.isArray(read(currentUserWishlistKey, []))) write(currentUserWishlistKey, []);
  }
}

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  const users = read(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users : [];
}
function getBooks() {
  const books = read(STORAGE_KEYS.books, defaultBooks);
  return Array.isArray(books) ? books : [...defaultBooks];
}
function saveUsers(users) { write(STORAGE_KEYS.users, Array.isArray(users) ? users : []); }
function saveBooks(books) { write(STORAGE_KEYS.books, Array.isArray(books) ? books : [...defaultBooks]); }
function getRentals(userId) {
  const rentals = read(`rentals_${userId}`, []);
  return Array.isArray(rentals) ? rentals : [];
}
function saveRentals(userId, rentals) { write(`rentals_${userId}`, Array.isArray(rentals) ? rentals : []); }
function getWishlist(userId) {
  const wishlist = read(`wishlist_${userId}`, []);
  return Array.isArray(wishlist) ? wishlist : [];
}
function saveWishlist(userId, wishlist) { write(`wishlist_${userId}`, Array.isArray(wishlist) ? wishlist : []); }

function getActivity() {
  const items = read(STORAGE_KEYS.activity, []);
  return Array.isArray(items) ? items : [];
}
function saveActivity(items) { write(STORAGE_KEYS.activity, Array.isArray(items) ? items : []); }
function addActivity(action, user, book = '') {
  const items = getActivity();
  items.unshift({
    id: String(Date.now() + Math.random()),
    action,
    user,
    book,
    timestamp: new Date().toLocaleString(),
  });
  saveActivity(items.slice(0, 50));
}
function getAllRentalsWithUsers() {
  return getUsers().flatMap(user => getRentals(user.id).map(r => ({ ...r, userId: user.id, userName: user.name })));
}
function getOverdueRentals() {
  return getAllRentalsWithUsers().map(rental => {
    const due = new Date(rental.returnDate);
    const diffMs = Date.now() - due.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const extraPeriods = Math.floor(daysOverdue / 60);
    const fine = daysOverdue > 0 ? 5 + extraPeriods * 5 : 0;
    return { ...rental, daysOverdue, fine };
  }).filter(r => r.daysOverdue > 0);
}

function render() {
  const app = document.getElementById('app');

  try {
    app.innerHTML = state.currentUser
      ? state.currentUser.role === 'admin' ? renderAdminApp() : renderUserApp()
      : renderAuth();
    bindEvents();
  } catch (error) {
    console.error(error);
    app.innerHTML = `
      <div class="auth-shell">
        <div class="card auth-card">
          <h2>Something went wrong</h2>
          <p class="muted">The page hit an error, but it did not crash completely.</p>
          <div class="error">${escapeHtml(error.message || 'Unknown error')}</div>
          <button class="btn btn-primary btn-block" id="reloadAppButton" type="button">Reload app</button>
        </div>
      </div>
    `;

    const reloadButton = document.getElementById('reloadAppButton');
    if (reloadButton) {
      reloadButton.addEventListener('click', () => window.location.reload());
    }
  }
}

function renderAuth() {
  return `
    <div class="auth-shell">
      <div class="card auth-card">
        <div class="brand">
          <div class="brand-badge">B</div>
          <div>
            <h1 style="font-size:22px;">Book Management System</h1>
          </div>
        </div>
        <h2 class="center">${state.authView === 'login' ? 'Welcome back' : 'Create account'}</h2>
        ${state.authView === 'login' ? renderLoginForm() : renderSignupForm()}
        <div class="demo-box">
          <strong>Demo admin:</strong> Admin / admin123
        </div>
      </div>
    </div>
  `;
}

function renderLoginForm() {
  return `
    <form id="loginForm">
      <div class="form-group">
        <label for="loginName">Name</label>
        <input id="loginName" name="name" required />
      </div>
      <div class="form-group">
        <label for="loginPassword">Password</label>
        <div class="password-wrap">
          <input id="loginPassword" name="password" type="password" required autocomplete="current-password" />
          <button type="button" class="password-toggle" data-toggle-password="loginPassword">Show</button>
        </div>
      </div>
      <div id="loginError"></div>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      <p class="center muted auth-switch-text">No account?
        <button type="button" class="link-button" data-switch-auth="signup">Sign up</button>
      </p>
    </form>
  `;
}

function renderSignupForm() {
  return `
    <form id="signupForm">
      <div class="form-group">
        <label for="signupName">Name</label>
        <input id="signupName" name="name" required />
      </div>
      <div class="form-group">
        <label for="signupPhone">Phone number</label>
        <input id="signupPhone" name="phone" required />
      </div>
      <div class="form-group">
        <label for="signupPassword">Password</label>
        <div class="password-wrap">
          <input id="signupPassword" name="password" type="password" minlength="4" required autocomplete="new-password" />
          <button type="button" class="password-toggle" data-toggle-password="signupPassword">Show</button>
        </div>
      </div>
      <div id="signupError"></div>
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
      <p class="center muted auth-switch-text">Already registered?
        <button type="button" class="link-button" data-switch-auth="login">Sign in</button>
      </p>
    </form>
  `;
}

function appShell(user, navButtons, title, content) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-badge">B</div>
          <div>
            <h2 style="margin-bottom:4px; font-size:18px;">Book Management System</h2>
            <p class="muted" style="margin:0;">${user.role === 'admin' ? 'Admin panel' : 'Reader dashboard'}</p>
          </div>
        </div>
        ${navButtons}
        <div class="sidebar-footer">
          <div class="user-chip">
            <strong>${escapeHtml(user.name)}</strong><br />
            <span class="muted">${user.role}</span>
          </div>
          <button class="btn btn-secondary btn-block" data-action="logout">Logout</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div>
            <h2 style="margin-bottom:4px;">${title}</h2>
          
          </div>
        </div>
        ${content}
      </main>
    </div>
  `;
}

function renderUserApp() {
  const user = state.currentUser;
  const books = getBooks();
  const rentals = getRentals(user.id);
  const wishlist = getWishlist(user.id);
  const nav = ['dashboard', 'browse', 'rentals', 'wishlist']
    .map(id => `<button class="nav-btn ${state.userView === id ? 'active' : ''}" data-user-view="${id}">${labelize(id)}</button>`)
    .join('');

  const stats = `
    <div class="stats-grid">
      ${statCard('Active rentals', rentals.length)}
      ${statCard('Wishlist', wishlist.length)}
      ${statCard('Available books', books.filter(b => b.available).length)}
      ${statCard('Total books', books.length)}
    </div>
  `;

  let content = stats;
  if (state.userView === 'browse') content += renderBrowseBooks(user, books, rentals, wishlist);
  if (state.userView === 'rentals') content += renderRentals(user, rentals);
  if (state.userView === 'wishlist') content += renderWishlist(books, wishlist);
  if (state.userView === 'dashboard') content += renderUserDashboardPanels(books, rentals, wishlist);

  return appShell(user, nav, labelize(state.userView), content);
}

function renderUserDashboardPanels(books, rentals, wishlist) {
  const picks = books.slice(0, 3).map(book => bookCard(book)).join('');
  return `
    <div class="panel card">
      <h3>Quick overview</h3>
      <p class="muted">Use Browse Books to rent books, or Wishlist to save books for later.</p>
    </div>
    <div class="panel card">
      <h3>Current rentals</h3>
      ${rentals.length ? `<div class="list">${rentals.map(rentalItem).join('')}</div>` : '<p class="empty">You have not rented any books yet.</p>'}
    </div>
    <div class="panel card">
      <h3>Recommended books</h3>
      <div class="books-grid">${picks}</div>
    </div>
  `;
}

function renderBrowseBooks(user, books, rentals, wishlist) {
  const categories = ['All', ...new Set(books.map(book => book.category))];
  const currentCategory = read(`filters_${user.id}`, { search: '', category: 'All' });
  const filtered = books.filter(book => {
    const search = (currentCategory.search || '').toLowerCase();
    const matchesSearch = !search || book.title.toLowerCase().includes(search) || book.author.toLowerCase().includes(search);
    const matchesCategory = currentCategory.category === 'All' || book.category === currentCategory.category;
    return matchesSearch && matchesCategory;
  });

  return `
    <div class="panel card">
      <h3>Browse books</h3>
      <div class="filter-row">
        <input id="bookSearch" placeholder="Search by title or author" value="${escapeAttr(currentCategory.search || '')}" />
        <select id="bookCategory">
          ${categories.map(cat => `<option value="${escapeAttr(cat)}" ${cat === currentCategory.category ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="apply-filters">Apply filters</button>
      </div>
      <div class="books-grid">
        ${filtered.length ? filtered.map(book => bookCard(book, rentals, wishlist)).join('') : '<p class="empty">No books match your filters.</p>'}
      </div>
    </div>
  `;
}

function renderRentals(user, rentals) {
  return `
    <div class="panel card">
      <h3>My rentals</h3>
      ${rentals.length ? `<div class="list">${rentals.map(rentalItem).join('')}</div>` : '<p class="empty">No active rentals yet.</p>'}
    </div>
  `;
}

function renderWishlist(books, wishlist) {
  const wishlistBooks = books.filter(book => wishlist.includes(book.id));
  return `
    <div class="panel card">
      <h3>Wishlist</h3>
      <div class="books-grid">
        ${wishlistBooks.length ? wishlistBooks.map(book => bookCard(book, [], wishlist)).join('') : '<p class="empty">Your wishlist is empty.</p>'}
      </div>
    </div>
  `;
}


function renderAdminApp() {
  const admin = state.currentUser;
  const books = getBooks();
  const users = getUsers();
  const activity = getActivity();
  const overdueRentals = getOverdueRentals();
  const rentalsTotal = users.reduce((sum, user) => sum + getRentals(user.id).length, 0);
  const nav = ['dashboard', 'books', 'users', 'analytics', 'activity', 'fines']
    .map(id => `<button class="nav-btn ${state.adminView === id ? 'active' : ''}" data-admin-view="${id}">${labelize(id)}</button>`)
    .join('');

  const stats = `
    <div class="stats-grid">
      ${statCard('Books in library', books.length)}
      ${statCard('Available now', books.filter(b => b.available).length)}
      ${statCard('Registered users', users.length)}
      ${statCard('Active rentals', rentalsTotal)}
    </div>
  `;

  let content = stats;
  if (state.adminView === 'dashboard') content += renderAdminDashboard(books, users, activity, overdueRentals, rentalsTotal);
  if (state.adminView === 'books') content += renderAdminBooks(books);
  if (state.adminView === 'users') content += renderAdminUsers(users);
  if (state.adminView === 'analytics') content += renderAdminAnalytics(books, users, rentalsTotal, overdueRentals);
  if (state.adminView === 'activity') content += renderAdminActivity(activity);
  if (state.adminView === 'fines') content += renderAdminFines(overdueRentals);

  const modal = state.showModal ? renderBookModal() : '';
  return appShell(admin, nav, labelize(state.adminView), content) + modal;
}

function renderAdminDashboard(books, users, activity, overdueRentals, rentalsTotal) {
  const categories = getCategoryData(books);
  return `
    <div class="panel card">
      <h3>Admin summary</h3>
      <p class="muted">Manage books, watch user activity, and track overdue returns from one place.</p>
      <div class="stats-grid compact-top">
        ${miniStat('Categories', categories.length)}
        ${miniStat('Rented now', books.filter(b => !b.available).length)}
        ${miniStat('Outstanding fines', '$' + overdueRentals.reduce((sum, item) => sum + item.fine, 0))}
        ${miniStat('Recent actions', activity.length)}
      </div>
    </div>
    <div class="two-col-grid panel-grid">
      <div class="panel card">
        <h3>Books by category</h3>
        ${renderCategoryBars(categories)}
      </div>
      <div class="panel card">
        <h3>Quick health</h3>
        <div class="list">
          <div class="list-item"><strong>${books.filter(b => b.available).length}</strong><br><span class="muted">books ready to rent</span></div>
          <div class="list-item"><strong>${rentalsTotal}</strong><br><span class="muted">active rentals across all users</span></div>
          <div class="list-item"><strong>${overdueRentals.length}</strong><br><span class="muted">overdue rentals that need attention</span></div>
        </div>
      </div>
    </div>
    <div class="panel card">
      <h3>Recent activity</h3>
      <div class="list">
        ${activity.slice(0, 6).map(log => `
          <div class="list-item">
            <strong>${escapeHtml(log.action)}${log.book ? ` - ${escapeHtml(log.book)}` : ''}</strong>
            <p class="muted">${escapeHtml(log.user)} • ${escapeHtml(log.timestamp)}</p>
          </div>
        `).join('') || '<p class="empty">No activity yet.</p>'}
      </div>
    </div>
  `;
}

function renderAdminAnalytics(books, users, rentalsTotal, overdueRentals) {
  const categoryData = getCategoryData(books);
  const userRentals = users.map(user => ({ name: user.name, count: getRentals(user.id).length })).filter(item => item.count > 0);
  return `
    <div class="two-col-grid panel-grid">
      <div class="panel card">
        <h3>Books by category</h3>
        ${renderCategoryBars(categoryData)}
      </div>
      <div class="panel card">
        <h3>Library overview</h3>
        <div class="list">
          <div class="list-item"><strong>${books.length}</strong><br><span class="muted">total books</span></div>
          <div class="list-item"><strong>${books.filter(b => b.available).length}</strong><br><span class="muted">available books</span></div>
          <div class="list-item"><strong>${rentalsTotal}</strong><br><span class="muted">current rentals</span></div>
          <div class="list-item"><strong>${overdueRentals.length}</strong><br><span class="muted">overdue rentals</span></div>
        </div>
      </div>
    </div>
    <div class="panel card">
      <h3>Most active readers</h3>
      ${userRentals.length ? `
        <div class="list">
          ${userRentals.sort((a,b) => b.count - a.count).map(item => `
            <div class="list-item row-between">
              <span>${escapeHtml(item.name)}</span>
              <span class="badge info">${item.count} rentals</span>
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty">No user rentals yet.</p>'}
    </div>
  `;
}

function renderAdminActivity(activity) {
  return `
    <div class="panel card">
      <h3>Activity log</h3>
      <p class="muted">Recent system actions in the app.</p>
      <div class="list">
        ${activity.length ? activity.map(log => `
          <div class="list-item">
            <strong>${escapeHtml(log.action)}${log.book ? ` - ${escapeHtml(log.book)}` : ''}</strong>
            <p class="muted">by ${escapeHtml(log.user)} • ${escapeHtml(log.timestamp)}</p>
          </div>
        `).join('') : '<p class="empty">No activity found.</p>'}
      </div>
    </div>
  `;
}

function renderAdminFines(overdueRentals) {
  const search = state.finesSearch.trim().toLowerCase();
  const filtered = overdueRentals.filter(item => !search || item.userName.toLowerCase().includes(search) || item.bookTitle.toLowerCase().includes(search));
  const totalFines = overdueRentals.reduce((sum, item) => sum + item.fine, 0);
  return `
    <div class="panel card">
      <h3>Late returns and fines</h3>
      <p class="muted">Fine rule: $5 base + $5 every 60 overdue days.</p>
      <div class="filter-row">
        <input id="finesSearch" placeholder="Search by user or book title" value="${escapeAttr(state.finesSearch)}" />
      </div>
      <div class="stats-grid compact-top">
        ${miniStat('Overdue books', overdueRentals.length)}
        ${miniStat('Outstanding fines', '$' + totalFines)}
        ${miniStat('Average fine', '$' + (overdueRentals.length ? Math.round(totalFines / overdueRentals.length) : 0))}
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>User</th><th>Book</th><th>Due date</th><th>Days overdue</th><th>Fine</th></tr></thead>
          <tbody>
            ${filtered.length ? filtered.map(item => `
              <tr>
                <td>${escapeHtml(item.userName)}</td>
                <td>${escapeHtml(item.bookTitle)}</td>
                <td>${escapeHtml(item.returnDate)}</td>
                <td>${item.daysOverdue}</td>
                <td>$${item.fine}</td>
              </tr>
            `).join('') : '<tr><td colspan="5">No overdue rentals found.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getCategoryData(books) {
  return [...new Set(books.map(book => book.category))].map(name => ({
    name,
    count: books.filter(book => book.category === name).length,
  }));
}

function renderCategoryBars(items) {
  const max = Math.max(...items.map(item => item.count), 1);
  return `
    <div class="bars">
      ${items.map(item => `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(item.name)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
          <div class="bar-value">${item.count}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function miniStat(label, value) {
  return `<div class="card mini-stat"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function renderAdminBooks(books) {

  return `
    <div class="panel card">
      <div class="topbar" style="margin-bottom:16px;">
        <h3 style="margin:0;">Manage books</h3>
        <button class="btn btn-primary" data-action="open-add-book">Add book</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Title</th><th>Author</th><th>Category</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${books.map(book => `
              <tr>
                <td>${escapeHtml(book.title)}</td>
                <td>${escapeHtml(book.author)}</td>
                <td>${escapeHtml(book.category)}</td>
                <td><span class="badge ${book.available ? 'success' : 'warning'}">${book.available ? 'Available' : 'Rented'}</span></td>
                <td>
                  <div class="flex-row">
                    <button class="btn btn-secondary btn-small" data-edit-book="${book.id}">Edit</button>
                    <button class="btn btn-secondary btn-small" data-toggle-book="${book.id}">${book.available ? 'Mark rented' : 'Mark available'}</button>
                    <button class="btn btn-danger btn-small" data-delete-book="${book.id}">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminUsers(users) {
  return `
    <div class="panel card">
      <h3>Registered users</h3>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Rentals</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.length ? users.map(user => `
              <tr>
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.phone)}</td>
                <td>${escapeHtml(user.role)}</td>
                <td>${getRentals(user.id).length}</td>
                <td><button class="btn btn-danger btn-small" data-delete-user="${user.id}">Delete</button></td>
              </tr>
            `).join('') : '<tr><td colspan="5">No users yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBookModal() {
  const books = getBooks();
  const book = books.find(item => item.id === state.editingBookId) || { title: '', author: '', category: '', description: '' };
  return `
    <div class="modal-backdrop">
      <div class="card modal">
        <h3>${state.editingBookId ? 'Edit book' : 'Add book'}</h3>
        <form id="bookForm">
          <div class="form-group"><label>Title</label><input name="title" value="${escapeAttr(book.title || '')}" required /></div>
          <div class="form-group"><label>Author</label><input name="author" value="${escapeAttr(book.author || '')}" required /></div>
          <div class="form-group"><label>Category</label><input name="category" value="${escapeAttr(book.category || '')}" required /></div>
          <div class="form-group"><label>Description</label><textarea name="description">${escapeHtml(book.description || '')}</textarea></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button>
            <button class="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function statCard(label, value) {
  return `<div class="card stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function bookCard(book, rentals = [], wishlist = []) {
  const rentedByUser = rentals.some(r => r.bookId === book.id);
  const isWishlisted = wishlist.includes(book.id);
  return `
    <div class="card book-card">
      <div class="book-cover ${book.coverClass || 'c1'}">${escapeHtml(book.title.charAt(0).toUpperCase())}</div>
      <div>
        <span class="badge info">${escapeHtml(book.category)}</span>
        <h3 style="margin:10px 0 6px;">${escapeHtml(book.title)}</h3>
        <p class="muted" style="margin-bottom:8px;">by ${escapeHtml(book.author)}</p>
        <p class="muted">${escapeHtml(book.description || '')}</p>
      </div>
      <div class="flex-row">
        ${state.currentUser && state.currentUser.role === 'user' ? `
          <button class="btn ${book.available ? 'btn-primary' : 'btn-secondary'} btn-small" ${book.available ? `data-rent-book="${book.id}"` : 'disabled'}>${book.available ? 'Rent book' : 'Unavailable'}</button>
          <button class="btn btn-secondary btn-small" data-wishlist-book="${book.id}">${isWishlisted ? 'Remove wishlist' : 'Add wishlist'}</button>
          ${rentedByUser ? `<button class="btn btn-success btn-small" data-return-book="${book.id}">Return</button>` : ''}
        ` : ''}
      </div>
    </div>
  `;
}

function rentalItem(rental) {
  return `
    <div class="list-item">
      <h4>${escapeHtml(rental.bookTitle)}</h4>
      <p class="muted">Rented: ${escapeHtml(rental.rentDate)} | Return: ${escapeHtml(rental.returnDate)}</p>
      <button class="btn btn-success btn-small" data-return-book="${rental.bookId}">Return book</button>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll('[data-switch-auth]').forEach(button => {
    button.addEventListener('click', () => {
      state.authView = button.dataset.switchAuth;
      clearAuthMessages();
      render();
    });
  });

  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.textContent = isPassword ? 'Hide' : 'Show';
    });
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  document.querySelectorAll('[data-user-view]').forEach(button => {
    button.addEventListener('click', () => { state.userView = button.dataset.userView; render(); });
  });

  document.querySelectorAll('[data-admin-view]').forEach(button => {
    button.addEventListener('click', () => { state.adminView = button.dataset.adminView; render(); });
  });

  const finesSearch = document.getElementById('finesSearch');
  if (finesSearch) {
    finesSearch.addEventListener('input', (event) => {
      state.finesSearch = event.target.value;
      render();
    });
  }

  document.querySelectorAll('[data-action="logout"]').forEach(button => {
    button.addEventListener('click', logout);
  });

  const applyFilters = document.querySelector('[data-action="apply-filters"]');
  if (applyFilters) {
    applyFilters.addEventListener('click', () => {
      write(`filters_${state.currentUser.id}`, {
        search: document.getElementById('bookSearch').value,
        category: document.getElementById('bookCategory').value,
      });
      render();
    });
  }

  document.querySelectorAll('[data-rent-book]').forEach(button => button.addEventListener('click', () => rentBook(button.dataset.rentBook)));
  document.querySelectorAll('[data-return-book]').forEach(button => button.addEventListener('click', () => returnBook(button.dataset.returnBook)));
  document.querySelectorAll('[data-wishlist-book]').forEach(button => button.addEventListener('click', () => toggleWishlist(button.dataset.wishlistBook)));
  document.querySelectorAll('[data-action="open-add-book"]').forEach(button => button.addEventListener('click', openAddBook));
  document.querySelectorAll('[data-action="close-modal"]').forEach(button => button.addEventListener('click', closeModal));
  document.querySelectorAll('[data-edit-book]').forEach(button => button.addEventListener('click', () => openEditBook(button.dataset.editBook)));
  document.querySelectorAll('[data-delete-book]').forEach(button => button.addEventListener('click', () => deleteBook(button.dataset.deleteBook)));
  document.querySelectorAll('[data-toggle-book]').forEach(button => button.addEventListener('click', () => toggleBook(button.dataset.toggleBook)));
  document.querySelectorAll('[data-delete-user]').forEach(button => button.addEventListener('click', () => deleteUser(button.dataset.deleteUser)));

  const bookForm = document.getElementById('bookForm');
  if (bookForm) bookForm.addEventListener('submit', saveBookFromForm);
}

function handleLogin(event) {
  event.preventDefault();
  clearAuthMessages();

  const name = event.target.name.value.trim();
  const password = event.target.password.value;
  const users = getUsers();
  const normalizedName = name.toLowerCase();
  const foundUser = users.find(user => user.name.toLowerCase() === normalizedName && user.password === password);

  if (foundUser) {
    state.currentUser = { id: foundUser.id, name: foundUser.name, phone: foundUser.phone, role: foundUser.role };
    write(STORAGE_KEYS.currentUser, state.currentUser);
    render();
    return;
  }

  if (normalizedName === 'admin' && password === 'admin123') {
    state.currentUser = { id: 'admin-1', name: 'Admin', phone: '', role: 'admin' };
    write(STORAGE_KEYS.currentUser, state.currentUser);
    addActivity('Admin logged in', 'Admin');
    render();
    return;
  }

  setMessage('loginError', 'Invalid name or password.', 'error');
}

function handleSignup(event) {
  event.preventDefault();
  clearAuthMessages();

  const name = event.target.name.value.trim();
  const phone = event.target.phone.value.trim();
  const password = event.target.password.value;
  const users = getUsers();

  if (!name || !phone || !password) {
    setMessage('signupError', 'Please fill in all fields.', 'error');
    return;
  }

  if (users.some(user => user.name.toLowerCase() === name.toLowerCase())) {
    setMessage('signupError', 'An account with this name already exists. Please choose a different name.', 'error');
    return;
  }

  if (users.some(user => user.phone === phone)) {
    setMessage('signupError', 'An account with this phone number already exists.', 'error');
    return;
  }

  const newUser = { id: String(Date.now()), name, phone, password, role: 'user' };
  users.push(newUser);
  saveUsers(users);
  addActivity('New user registered', name);

  state.currentUser = { id: newUser.id, name: newUser.name, phone: newUser.phone, role: newUser.role };
  write(STORAGE_KEYS.currentUser, state.currentUser);
  render();
}

function clearAuthMessages() {
  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');
  if (loginError) loginError.innerHTML = '';
  if (signupError) signupError.innerHTML = '';
}

function setMessage(id, text, type = 'error') {
  const element = document.getElementById(id);
  if (!element) return;
  element.innerHTML = `<div class="${type}">${escapeHtml(text)}</div>`;
}

function logout() {
  state.currentUser = null;
  state.authView = 'login';
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  render();
}

function rentBook(bookId) {
  const user = state.currentUser;
  const books = getBooks();
  const book = books.find(item => item.id === bookId);
  if (!book || !book.available) return;

  const rentals = getRentals(user.id);
  if (rentals.some(rental => rental.bookId === bookId)) return;

  rentals.push({
    id: String(Date.now()),
    bookId: book.id,
    bookTitle: book.title,
    rentDate: new Date().toLocaleDateString(),
    returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  });
  saveRentals(user.id, rentals);

  book.available = false;
  saveBooks(books);
  addActivity('Book rented', user.name, book.title);
  render();
}

function returnBook(bookId) {
  const user = state.currentUser;
  const currentRentals = getRentals(user.id);
  const target = currentRentals.find(rental => rental.bookId === bookId);
  const rentals = currentRentals.filter(rental => rental.bookId !== bookId);
  saveRentals(user.id, rentals);
  const books = getBooks();
  const book = books.find(item => item.id === bookId);
  if (book) book.available = true;
  saveBooks(books);
  addActivity('Book returned', user.name, target ? target.bookTitle : (book ? book.title : 'Unknown'));
  render();
}

function toggleWishlist(bookId) {
  const user = state.currentUser;
  const wishlist = getWishlist(user.id);
  const updated = wishlist.includes(bookId)
    ? wishlist.filter(id => id !== bookId)
    : [...wishlist, bookId];
  saveWishlist(user.id, updated);
  render();
}

function openAddBook() {
  state.editingBookId = null;
  state.showModal = true;
  render();
}

function openEditBook(bookId) {
  state.editingBookId = bookId;
  state.showModal = true;
  render();
}

function closeModal() {
  state.editingBookId = null;
  state.showModal = false;
  render();
}

function saveBookFromForm(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const books = getBooks();
  const payload = {
    title: String(form.get('title')).trim(),
    author: String(form.get('author')).trim(),
    category: String(form.get('category')).trim(),
    description: String(form.get('description')).trim(),
  };

  let action = 'Book added';
  if (state.editingBookId) {
    const existing = books.find(book => book.id === state.editingBookId);
    if (existing) {
      Object.assign(existing, payload);
      action = 'Book edited';
    }
  } else {
    books.push({
      id: String(Date.now()),
      ...payload,
      available: true,
      rating: 4.0,
      coverClass: ['c1', 'c2', 'c3', 'c4', 'c5'][Math.floor(Math.random() * 5)],
    });
  }

  saveBooks(books);
  addActivity(action, state.currentUser.name, payload.title);
  closeModal();
}

function deleteBook(bookId) {
  const allBooks = getBooks();
  const book = allBooks.find(item => item.id === bookId);
  const books = allBooks.filter(item => item.id !== bookId);
  saveBooks(books);
  addActivity('Book deleted', state.currentUser.name, book ? book.title : 'Unknown');
  render();
}

function toggleBook(bookId) {
  const books = getBooks();
  const book = books.find(item => item.id === bookId);
  if (book) {
    book.available = !book.available;
    saveBooks(books);
    addActivity(book.available ? 'Book marked available' : 'Book marked rented', state.currentUser.name, book.title);
    render();
  }
}

function deleteUser(userId) {
  const allUsers = getUsers();
  const user = allUsers.find(item => item.id === userId);
  const users = allUsers.filter(item => item.id !== userId);
  saveUsers(users);
  localStorage.removeItem(`rentals_${userId}`);
  localStorage.removeItem(`wishlist_${userId}`);
  addActivity('User deleted', state.currentUser.name, user ? user.name : 'Unknown');
  render();
}

function labelize(value) {

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
