import { 
  state, write, STORAGE_KEYS, getUsers, saveUsers, getBooks, 
  saveBooks, getRentals, saveRentals, getWishlist, saveWishlist, addActivity 
} from './models.js';

import { render, clearAuthMessages, setMessage } from './UserInterface.js';

export function updateApp() {
  render();
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-switch-auth]').forEach(button => {
    button.addEventListener('click', () => {
      state.authView = button.dataset.switchAuth;
      clearAuthMessages();
      updateApp();
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
    button.addEventListener('click', () => { state.userView = button.dataset.userView; updateApp(); });
  });
  
  document.querySelectorAll('[data-admin-view]').forEach(button => {
    button.addEventListener('click', () => { state.adminView = button.dataset.adminView; updateApp(); });
  });

  const finesSearch = document.getElementById('finesSearch');
  if (finesSearch) {
    finesSearch.addEventListener('input', (event) => {
      state.finesSearch = event.target.value;
      updateApp();
    });
  }

  document.querySelectorAll('[data-action="logout"]').forEach(button => button.addEventListener('click', logout));

  const applyFilters = document.querySelector('[data-action="apply-filters"]');
  if (applyFilters) {
    applyFilters.addEventListener('click', () => {
      write(`filters_${state.currentUser.id}`, {
        search: document.getElementById('bookSearch').value,
        category: document.getElementById('bookCategory').value,
      });
      updateApp();
    });
  }

  document.querySelectorAll('[data-rent-book]').forEach(b => b.addEventListener('click', () => rentBook(b.dataset.rentBook)));
  document.querySelectorAll('[data-return-book]').forEach(b => b.addEventListener('click', () => returnBook(b.dataset.returnBook)));
  document.querySelectorAll('[data-wishlist-book]').forEach(b => b.addEventListener('click', () => toggleWishlist(b.dataset.wishlistBook)));
  document.querySelectorAll('[data-action="open-add-book"]').forEach(b => b.addEventListener('click', openAddBook));
  document.querySelectorAll('[data-action="close-modal"]').forEach(b => b.addEventListener('click', closeModal));
  document.querySelectorAll('[data-edit-book]').forEach(b => b.addEventListener('click', () => openEditBook(b.dataset.editBook)));
  document.querySelectorAll('[data-delete-book]').forEach(b => b.addEventListener('click', () => deleteBook(b.dataset.deleteBook)));
  document.querySelectorAll('[data-toggle-book]').forEach(b => b.addEventListener('click', () => toggleBook(b.dataset.toggleBook)));
  document.querySelectorAll('[data-delete-user]').forEach(b => b.addEventListener('click', () => deleteUser(b.dataset.deleteUser)));

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
  const foundUser = users.find(u => u.name.toLowerCase() === normalizedName && u.password === password);

  if (foundUser) {
    state.currentUser = { id: foundUser.id, name: foundUser.name, phone: foundUser.phone, role: foundUser.role };
    write(STORAGE_KEYS.currentUser, state.currentUser);
    updateApp();
    return;
  }

  if (normalizedName === 'admin' && password === 'admin123') {
    state.currentUser = { id: 'admin-1', name: 'Admin', phone: '', role: 'admin' };
    write(STORAGE_KEYS.currentUser, state.currentUser);
    addActivity('Admin logged in', 'Admin');
    updateApp();
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
  if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
    setMessage('signupError', 'An account with this name already exists. Please choose a different name.', 'error');
    return;
  }
  if (users.some(u => u.phone === phone)) {
    setMessage('signupError', 'An account with this phone number already exists.', 'error');
    return;
  }

  const newUser = { id: String(Date.now()), name, phone, password, role: 'user' };
  users.push(newUser);
  saveUsers(users);
  addActivity('New user registered', name);

  state.currentUser = { id: newUser.id, name: newUser.name, phone: newUser.phone, role: newUser.role };
  write(STORAGE_KEYS.currentUser, state.currentUser);
  updateApp();
}

function logout() {
  state.currentUser = null;
  state.authView = 'login';
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  updateApp();
}

function rentBook(bookId) {
  const user = state.currentUser;
  const books = getBooks();
  const book = books.find(item => item.id === bookId);
  if (!book || !book.available) return;

  const rentals = getRentals(user.id);
  if (rentals.some(r => r.bookId === bookId)) return;

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
  updateApp();
}

function returnBook(bookId) {
  const user = state.currentUser;
  const currentRentals = getRentals(user.id);
  const target = currentRentals.find(r => r.bookId === bookId);
  const rentals = currentRentals.filter(r => r.bookId !== bookId);
  saveRentals(user.id, rentals);

  const books = getBooks();
  const book = books.find(item => item.id === bookId);
  if (book) book.available = true;
  saveBooks(books);
  addActivity('Book returned', user.name, target ? target.bookTitle : (book ? book.title : 'Unknown'));
  updateApp();
}

function toggleWishlist(bookId) {
  const user = state.currentUser;
  const wishlist = getWishlist(user.id);
  const updated = wishlist.includes(bookId)
    ? wishlist.filter(id => id !== bookId)
    : [...wishlist, bookId];
  saveWishlist(user.id, updated);
  updateApp();
}

function openAddBook() {
  state.editingBookId = null;
  state.showModal = true;
  updateApp();
}

function openEditBook(bookId) {
  state.editingBookId = bookId;
  state.showModal = true;
  updateApp();
}

function closeModal() {
  state.editingBookId = null;
  state.showModal = false;
  updateApp();
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
    const existing = books.find(b => b.id === state.editingBookId);
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
  updateApp();
}

function toggleBook(bookId) {
  const books = getBooks();
  const book = books.find(item => item.id === bookId);
  if (book) {
    book.available = !book.available;
    saveBooks(books);
    addActivity(book.available ? 'Book marked available' : 'Book marked rented', state.currentUser.name, book.title);
    updateApp();
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
  updateApp();
}


updateApp();
