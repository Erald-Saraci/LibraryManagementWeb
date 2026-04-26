export const STORAGE_KEYS = {
  currentUser: 'bookrent_user',
  users: 'bookrent_users',
  books: 'bookrent_books',
  activity: 'bookrent_activity',
};

export const defaultBooks = [
  { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Classic', available: true, rating: 4.5, description: 'A timeless classic about the American Dream.', coverClass: 'c1' },
  { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Classic', available: true, rating: 4.8, description: 'A powerful story of justice and empathy.', coverClass: 'c2' },
  { id: '3', title: '1984', author: 'George Orwell', category: 'Dystopian', available: false, rating: 4.6, description: 'A dystopian novel about surveillance and control.', coverClass: 'c3' },
  { id: '4', title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Romance', available: true, rating: 4.7, description: 'A classic romance filled with wit and tension.', coverClass: 'c4' },
  { id: '5', title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasy', available: true, rating: 4.9, description: 'A fantasy adventure through Middle-earth.', coverClass: 'c5' },
  { id: '6', title: 'Harry Potter', author: 'J.K. Rowling', category: 'Fantasy', available: true, rating: 4.8, description: 'A magical school adventure loved by readers worldwide.', coverClass: 'c1' },
];

export const state = {
  currentUser: read(STORAGE_KEYS.currentUser, null),
  authView: 'login',
  userView: 'dashboard',
  adminView: 'dashboard',
  showModal: false,
  editingBookId: null,
  finesSearch: '',
};

export function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function bootstrap() {
  const storedBooks = read(STORAGE_KEYS.books, null);
  if (!Array.isArray(storedBooks)) write(STORAGE_KEYS.books, defaultBooks);

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
    if (!Array.isArray(read(rentalsKey, []))) write(rentalsKey, []);
    if (!Array.isArray(read(wishlistKey, []))) write(wishlistKey, []);
  });

  if (state.currentUser && state.currentUser.id) {
    state.currentUser = {
      id: String(state.currentUser.id),
      name: String(state.currentUser.name || '').trim(),
      phone: String(state.currentUser.phone || '').trim(),
      role: state.currentUser.role || 'user',
    };
    write(STORAGE_KEYS.currentUser, state.currentUser);
    const rentalsKey = `rentals_${state.currentUser.id}`;
    const wishlistKey = `wishlist_${state.currentUser.id}`;
    if (!Array.isArray(read(rentalsKey, []))) write(rentalsKey, []);
    if (!Array.isArray(read(wishlistKey, []))) write(wishlistKey, []);
  }
}

export function getUsers() { return Array.isArray(read(STORAGE_KEYS.users, [])) ? read(STORAGE_KEYS.users, []) : []; }
export function getBooks() { return Array.isArray(read(STORAGE_KEYS.books, defaultBooks)) ? read(STORAGE_KEYS.books, defaultBooks) : [...defaultBooks]; }
export function saveUsers(users) { write(STORAGE_KEYS.users, Array.isArray(users) ? users : []); }
export function saveBooks(books) { write(STORAGE_KEYS.books, Array.isArray(books) ? books : [...defaultBooks]); }
export function getRentals(userId) { return Array.isArray(read(`rentals_${userId}`, [])) ? read(`rentals_${userId}`, []) : []; }
export function saveRentals(userId, rentals) { write(`rentals_${userId}`, Array.isArray(rentals) ? rentals : []); }
export function getWishlist(userId) { return Array.isArray(read(`wishlist_${userId}`, [])) ? read(`wishlist_${userId}`, []) : []; }
export function saveWishlist(userId, wishlist) { write(`wishlist_${userId}`, Array.isArray(wishlist) ? wishlist : []); }
export function getActivity() { return Array.isArray(read(STORAGE_KEYS.activity, [])) ? read(STORAGE_KEYS.activity, []) : []; }
export function saveActivity(items) { write(STORAGE_KEYS.activity, Array.isArray(items) ? items : []); }

export function addActivity(action, user, book = '') {
  const items = getActivity();
  items.unshift({ id: String(Date.now() + Math.random()), action, user, book, timestamp: new Date().toLocaleString() });
  saveActivity(items.slice(0, 50));
}

export function getAllRentalsWithUsers() {
  return getUsers().flatMap(user => getRentals(user.id).map(r => ({ ...r, userId: user.id, userName: user.name })));
}

export function getOverdueRentals() {
  return getAllRentalsWithUsers().map(rental => {
    const due = new Date(rental.returnDate);
    const diffMs = Date.now() - due.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const fine = daysOverdue > 0 ? 5 + Math.floor(daysOverdue / 60) * 5 : 0;
    return { ...rental, daysOverdue, fine };
  }).filter(r => r.daysOverdue > 0);
}

bootstrap();