import { state, getBooks, getUsers, getRentals, getWishlist, getActivity, getOverdueRentals, read } from './models.js';

function clone(templateId) {
  const tpl = document.getElementById(templateId);
  if (!tpl) throw new Error(`Template not found: ${templateId}`);
  return tpl.content.cloneNode(true);
}

function setText(fragment, slotName, value) {
  const target = fragment.querySelector(`[data-slot="${slotName}"]`);
  if (target) target.textContent = String(value ?? '');
  return fragment;
}

function setContent(fragment, slotName, content) {
  const target = fragment.querySelector(`[data-slot="${slotName}"]`);
  if (!target) return fragment;
  target.replaceChildren();
  if (content instanceof Node || content instanceof DocumentFragment) {
    target.appendChild(content);
  } else if (Array.isArray(content)) {
    content.forEach(node => target.appendChild(node));
  }
  return fragment;
}

export function labelize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function clearAuthMessages() {
  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');
  if (loginError) loginError.replaceChildren();
  if (signupError) signupError.replaceChildren();
}

export function setMessage(id, text, type = 'error') {
  const element = document.getElementById(id);
  if (!element) return;
  element.replaceChildren();
  const div = document.createElement('div');
  div.className = type;
  div.textContent = text;
  element.appendChild(div);
}

export function render() {
  const app = document.getElementById('app');
  app.replaceChildren();

  try {
    if (!state.currentUser) {
      app.appendChild(renderAuth());
    } else if (state.currentUser.role === 'admin') {
      app.appendChild(renderAdminApp());
      if (state.showModal) app.appendChild(renderBookModal());
    } else {
      app.appendChild(renderUserApp());
    }
  } catch (error) {
    console.error(error);
    app.replaceChildren();
    const fragment = clone('tpl-error-fallback');
    setText(fragment, 'message', error.message || 'Unknown error');
    app.appendChild(fragment);
    const reloadButton = document.getElementById('reloadAppButton');
    if (reloadButton) reloadButton.addEventListener('click', () => window.location.reload());
  }
}

function renderAuth() {
  const fragment = clone('tpl-auth-shell');
  setText(fragment, 'title', state.authView === 'login' ? 'Welcome back' : 'Create account');
  setContent(fragment, 'form', clone(state.authView === 'login' ? 'tpl-login-form' : 'tpl-signup-form'));
  return fragment;
}

function renderUserApp() {
  const user = state.currentUser;
  const books = getBooks();
  const rentals = getRentals(user.id);
  const wishlist = getWishlist(user.id);

  const navFrag = document.createDocumentFragment();
  ['dashboard', 'browse', 'rentals', 'wishlist'].forEach(id => {
    const btn = document.createElement('button');
    btn.className = `nav-btn ${state.userView === id ? 'active' : ''}`;
    btn.dataset.userView = id;
    btn.textContent = labelize(id);
    navFrag.appendChild(btn);
  });

  const content = document.createElement('div');
  content.appendChild(buildStatsGrid([
    ['Active rentals', rentals.length],
    ['Wishlist', wishlist.length],
    ['Available books', books.filter(b => b.available).length],
    ['Total books', books.length],
  ]));

  if (state.userView === 'dashboard') {
    renderUserDashboardPanels(books, rentals, wishlist).forEach(node => content.appendChild(node));
  } else if (state.userView === 'browse') {
    content.appendChild(renderBrowseBooks(user, books, rentals, wishlist));
  } else if (state.userView === 'rentals') {
    content.appendChild(renderRentals(rentals));
  } else if (state.userView === 'wishlist') {
    content.appendChild(renderWishlist(books, wishlist));
  }

  return appShell(user, navFrag, labelize(state.userView), content);
}

function renderUserDashboardPanels(books, rentals, wishlist) {
  const panels = [];
  const overview = clone('tpl-panel');
  setText(overview, 'title', 'Quick overview');
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'Use Browse Books to rent books, or Wishlist to save books for later.';
  setContent(overview, 'content', p);
  panels.push(overview);

  const rentalsPanel = clone('tpl-panel');
  setText(rentalsPanel, 'title', 'Current rentals');
  if (rentals.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'You have not rented any books yet.');
    setContent(rentalsPanel, 'content', empty);
  } else {
    const list = document.createElement('div');
    list.className = 'list';
    rentals.forEach(r => list.appendChild(rentalItem(r)));
    setContent(rentalsPanel, 'content', list);
  }
  panels.push(rentalsPanel);

  const recommended = clone('tpl-panel');
  setText(recommended, 'title', 'Recommended books');
  const grid = document.createElement('div');
  grid.className = 'books-grid';
  books.slice(0, 3).forEach(book => grid.appendChild(bookCard(book)));
  setContent(recommended, 'content', grid);
  panels.push(recommended);

  return panels;
}

function renderBrowseBooks(user, books, rentals, wishlist) {
  const categories = ['All', ...new Set(books.map(b => b.category))];
  const filters = read(`filters_${user.id}`, { search: '', category: 'All' });

  const filtered = books.filter(book => {
    const search = (filters.search || '').toLowerCase();
    const matchesSearch = !search || book.title.toLowerCase().includes(search) || book.author.toLowerCase().includes(search);
    const matchesCategory = filters.category === 'All' || book.category === filters.category;
    return matchesSearch && matchesCategory;
  });

  const panel = clone('tpl-browse-panel');

  const searchInput = document.createElement('input');
  searchInput.id = 'bookSearch';
  searchInput.placeholder = 'Search by title or author';
  searchInput.value = filters.search || '';

  const select = document.createElement('select');
  select.id = 'bookCategory';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === filters.category) opt.selected = true;
    select.appendChild(opt);
  });

  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary';
  btn.dataset.action = 'apply-filters';
  btn.textContent = 'Apply filters';

  const filtersFrag = document.createDocumentFragment();
  filtersFrag.append(searchInput, select, btn);
  setContent(panel, 'filters', filtersFrag);

  const grid = document.createElement('div');
  grid.className = 'books-grid';
  if (filtered.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'No books match your filters.');
    grid.appendChild(empty);
  } else {
    filtered.forEach(book => grid.appendChild(bookCard(book, rentals, wishlist)));
  }
  setContent(panel, 'grid', grid);

  return panel;
}

function renderRentals(rentals) {
  const panel = clone('tpl-panel');
  setText(panel, 'title', 'My rentals');
  if (rentals.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'No active rentals yet.');
    setContent(panel, 'content', empty);
  } else {
    const list = document.createElement('div');
    list.className = 'list';
    rentals.forEach(r => list.appendChild(rentalItem(r)));
    setContent(panel, 'content', list);
  }
  return panel;
}

function renderWishlist(books, wishlist) {
  const panel = clone('tpl-panel');
  setText(panel, 'title', 'Wishlist');
  const wishlistBooks = books.filter(b => wishlist.includes(b.id));

  if (wishlistBooks.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'Your wishlist is empty.');
    setContent(panel, 'content', empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'books-grid';
    wishlistBooks.forEach(book => grid.appendChild(bookCard(book, [], wishlist)));
    setContent(panel, 'content', grid);
  }
  return panel;
}

function renderAdminApp() {
  const admin = state.currentUser;
  const books = getBooks();
  const users = getUsers();
  const activity = getActivity();
  const overdueRentals = getOverdueRentals();
  const rentalsTotal = users.reduce((sum, u) => sum + getRentals(u.id).length, 0);

  const navFrag = document.createDocumentFragment();
  ['dashboard', 'books', 'users', 'analytics', 'activity', 'fines'].forEach(id => {
    const btn = document.createElement('button');
    btn.className = `nav-btn ${state.adminView === id ? 'active' : ''}`;
    btn.dataset.adminView = id;
    btn.textContent = labelize(id);
    navFrag.appendChild(btn);
  });

  const content = document.createElement('div');
  content.appendChild(buildStatsGrid([
    ['Books in library', books.length],
    ['Available now', books.filter(b => b.available).length],
    ['Registered users', users.length],
    ['Active rentals', rentalsTotal],
  ]));

  if (state.adminView === 'dashboard') {
    renderAdminDashboard(books, users, activity, overdueRentals, rentalsTotal).forEach(node => content.appendChild(node));
  } else if (state.adminView === 'books') {
    content.appendChild(renderAdminBooks(books));
  } else if (state.adminView === 'users') {
    content.appendChild(renderAdminUsers(users));
  } else if (state.adminView === 'analytics') {
    renderAdminAnalytics(books, users, rentalsTotal, overdueRentals).forEach(node => content.appendChild(node));
  } else if (state.adminView === 'activity') {
    content.appendChild(renderAdminActivity(activity));
  } else if (state.adminView === 'fines') {
    content.appendChild(renderAdminFines(overdueRentals));
  }

  return appShell(admin, navFrag, labelize(state.adminView), content);
}

function renderAdminDashboard(books, users, activity, overdueRentals, rentalsTotal) {
  const categoryData = getCategoryData(books);
  const panels = [];

  const summary = clone('tpl-admin-summary');
  const summaryGrid = document.createDocumentFragment();
  [
    ['Categories', categoryData.length],
    ['Rented now', books.filter(b => !b.available).length],
    ['Outstanding fines', '$' + overdueRentals.reduce((sum, item) => sum + item.fine, 0)],
    ['Recent actions', activity.length],
  ].forEach(([label, value]) => summaryGrid.appendChild(miniStat(label, value)));
  setContent(summary, 'grid', summaryGrid);
  panels.push(summary);

  const twoCol = document.createElement('div');
  twoCol.className = 'two-col-grid panel-grid';

  const categoryPanel = clone('tpl-panel');
  setText(categoryPanel, 'title', 'Books by category');
  setContent(categoryPanel, 'content', buildCategoryBars(categoryData));
  twoCol.appendChild(categoryPanel);

  const healthPanel = clone('tpl-panel');
  setText(healthPanel, 'title', 'Quick health');
  const healthList = document.createElement('div');
  healthList.className = 'list';
  [
    [books.filter(b => b.available).length, 'books ready to rent'],
    [rentalsTotal, 'active rentals across all users'],
    [overdueRentals.length, 'overdue rentals that need attention'],
  ].forEach(([num, label]) => {
    const item = clone('tpl-health-item');
    setText(item, 'value', num);
    setText(item, 'label', label);
    healthList.appendChild(item);
  });
  setContent(healthPanel, 'content', healthList);
  twoCol.appendChild(healthPanel);

  panels.push(twoCol);

  const activityPanel = clone('tpl-panel');
  setText(activityPanel, 'title', 'Recent activity');
  if (activity.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'No activity yet.');
    setContent(activityPanel, 'content', empty);
  } else {
    const activityList = document.createElement('div');
    activityList.className = 'list';
    activity.slice(0, 6).forEach(log => activityList.appendChild(activityListItem(log)));
    setContent(activityPanel, 'content', activityList);
  }
  panels.push(activityPanel);

  return panels;
}

function renderAdminAnalytics(books, users, rentalsTotal, overdueRentals) {
  const categoryData = getCategoryData(books);
  const userRentals = users.map(u => ({ name: u.name, count: getRentals(u.id).length })).filter(item => item.count > 0);
  const panels = [];

  const twoCol = document.createElement('div');
  twoCol.className = 'two-col-grid panel-grid';

  const catPanel = clone('tpl-panel');
  setText(catPanel, 'title', 'Books by category');
  setContent(catPanel, 'content', buildCategoryBars(categoryData));
  twoCol.appendChild(catPanel);

  const overviewPanel = clone('tpl-panel');
  setText(overviewPanel, 'title', 'Library overview');
  const overviewList = document.createElement('div');
  overviewList.className = 'list';
  [
    [books.length, 'total books'],
    [books.filter(b => b.available).length, 'available books'],
    [rentalsTotal, 'current rentals'],
    [overdueRentals.length, 'overdue rentals'],
  ].forEach(([num, label]) => {
    const item = clone('tpl-health-item');
    setText(item, 'value', num);
    setText(item, 'label', label);
    overviewList.appendChild(item);
  });
  setContent(overviewPanel, 'content', overviewList);
  twoCol.appendChild(overviewPanel);

  panels.push(twoCol);

  const readersPanel = clone('tpl-panel');
  setText(readersPanel, 'title', 'Most active readers');
  if (userRentals.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'No user rentals yet.');
    setContent(readersPanel, 'content', empty);
  } else {
    const list = document.createElement('div');
    list.className = 'list';
    userRentals.sort((a, b) => b.count - a.count).forEach(item => {
      const row = clone('tpl-reader-item');
      setText(row, 'name', item.name);
      setText(row, 'count', `${item.count} rentals`);
      list.appendChild(row);
    });
    setContent(readersPanel, 'content', list);
  }
  panels.push(readersPanel);

  return panels;
}

function renderAdminActivity(activity) {
  const panel = clone('tpl-panel');
  setText(panel, 'title', 'Activity log');
  if (activity.length === 0) {
    const empty = clone('tpl-empty-message');
    setText(empty, 'message', 'No activity found.');
    setContent(panel, 'content', empty);
  } else {
    const list = document.createElement('div');
    list.className = 'list';
    activity.forEach(log => list.appendChild(activityListItem(log, true)));
    setContent(panel, 'content', list);
  }
  return panel;
}

function renderAdminFines(overdueRentals) {
  const search = state.finesSearch.trim().toLowerCase();
  const filtered = overdueRentals.filter(item => !search || item.userName.toLowerCase().includes(search) || item.bookTitle.toLowerCase().includes(search));
  const totalFines = overdueRentals.reduce((sum, item) => sum + item.fine, 0);
  const avgFine = overdueRentals.length ? Math.round(totalFines / overdueRentals.length) : 0;

  const panel = clone('tpl-admin-fines');

  const searchInput = document.createElement('input');
  searchInput.id = 'finesSearch';
  searchInput.placeholder = 'Search by user or book title';
  searchInput.value = state.finesSearch;
  setContent(panel, 'filters', searchInput);

  const statsFrag = document.createDocumentFragment();
  [
    ['Overdue books', overdueRentals.length],
    ['Outstanding fines', '$' + totalFines],
    ['Average fine', '$' + avgFine],
  ].forEach(([label, value]) => statsFrag.appendChild(miniStat(label, value)));
  setContent(panel, 'stats', statsFrag);

  const tbody = document.createDocumentFragment();
  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No overdue rentals found.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    filtered.forEach(item => {
      const row = clone('tpl-fine-row');
      setText(row, 'user', item.userName);
      setText(row, 'book', item.bookTitle);
      setText(row, 'due', item.returnDate);
      setText(row, 'overdue', item.daysOverdue);
      setText(row, 'fine', `$${item.fine}`);
      tbody.appendChild(row);
    });
  }
  setContent(panel, 'rows', tbody);

  return panel;
}

function renderAdminBooks(books) {
  const panel = clone('tpl-admin-books');
  const tbody = document.createDocumentFragment();

  books.forEach(book => {
    const row = clone('tpl-book-row');
    setText(row, 'title', book.title);
    setText(row, 'author', book.author);
    setText(row, 'category', book.category);

    const badge = clone('tpl-badge');
    const badgeSpan = badge.querySelector('.badge');
    badgeSpan.className = `badge ${book.available ? 'success' : 'warning'}`;
    badgeSpan.textContent = book.available ? 'Available' : 'Rented';
    setContent(row, 'status', badge);

    const actions = clone('tpl-action-buttons-book');
    actions.querySelector('[data-slot="edit"]').dataset.editBook = book.id;
    const toggleBtn = actions.querySelector('[data-slot="toggle"]');
    toggleBtn.dataset.toggleBook = book.id;
    toggleBtn.textContent = book.available ? 'Mark rented' : 'Mark available';
    actions.querySelector('[data-slot="delete"]').dataset.deleteBook = book.id;

    setContent(row, 'actions', actions);
    tbody.appendChild(row);
  });
  setContent(panel, 'rows', tbody);
  return panel;
}

function renderAdminUsers(users) {
  const panel = clone('tpl-admin-users');
  const tbody = document.createDocumentFragment();

  if (users.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No users yet.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    users.forEach(user => {
      const row = clone('tpl-user-row');
      setText(row, 'name', user.name);
      setText(row, 'phone', user.phone);
      setText(row, 'role', user.role);
      setText(row, 'rentals', getRentals(user.id).length);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger btn-small';
      delBtn.dataset.deleteUser = user.id;
      delBtn.textContent = 'Delete';
      setContent(row, 'actions', delBtn);

      tbody.appendChild(row);
    });
  }
  setContent(panel, 'rows', tbody);
  return panel;
}

export function renderBookModal() {
  const fragment = clone('tpl-book-modal');
  const books = getBooks();
  const book = books.find(item => item.id === state.editingBookId) || { title: '', author: '', category: '', description: '' };

  setText(fragment, 'title', state.editingBookId ? 'Edit book' : 'Add book');
  fragment.querySelector('input[name="title"]').value = book.title || '';
  fragment.querySelector('input[name="author"]').value = book.author || '';
  fragment.querySelector('input[name="category"]').value = book.category || '';
  fragment.querySelector('textarea[name="description"]').value = book.description || '';

  return fragment;
}

function appShell(user, navNode, title, contentNode) {
  const fragment = clone('tpl-app-shell');
  setText(fragment, 'subtitle', user.role === 'admin' ? 'Admin panel' : 'Reader dashboard');
  setText(fragment, 'userName', user.name);
  setText(fragment, 'userRole', user.role);
  setText(fragment, 'title', title);
  setContent(fragment, 'nav', navNode);
  setContent(fragment, 'content', contentNode);
  return fragment;
}

function buildStatsGrid(items) {
  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  items.forEach(([label, value]) => grid.appendChild(statCard(label, value)));
  return grid;
}

function statCard(label, value) {
  const fragment = clone('tpl-stat-card');
  setText(fragment, 'label', label);
  setText(fragment, 'value', value);
  return fragment;
}

function miniStat(label, value) {
  const fragment = clone('tpl-mini-stat');
  setText(fragment, 'label', label);
  setText(fragment, 'value', value);
  return fragment;
}

function bookCard(book, rentals = [], wishlist = []) {
  const fragment = clone('tpl-book-card');
  const cover = fragment.querySelector('[data-slot="cover"]');
  cover.classList.add(book.coverClass || 'c1');
  cover.textContent = (book.title.charAt(0) || '?').toUpperCase();

  setText(fragment, 'category', book.category);
  setText(fragment, 'title', book.title);
  setText(fragment, 'author', `by ${book.author}`);
  setText(fragment, 'description', book.description || '');

  const actionsSlot = fragment.querySelector('[data-slot="actions"]');
  actionsSlot.replaceChildren();

  if (state.currentUser && state.currentUser.role === 'user') {
    const rentedByUser = rentals.some(r => r.bookId === book.id);
    const isWishlisted = wishlist.includes(book.id);

    const rentBtn = document.createElement('button');
    rentBtn.className = `btn ${book.available ? 'btn-primary' : 'btn-secondary'} btn-small`;
    if (book.available) {
      rentBtn.dataset.rentBook = book.id;
      rentBtn.textContent = 'Rent book';
    } else {
      rentBtn.disabled = true;
      rentBtn.textContent = 'Unavailable';
    }
    actionsSlot.appendChild(rentBtn);

    const wishBtn = document.createElement('button');
    wishBtn.className = 'btn btn-secondary btn-small';
    wishBtn.dataset.wishlistBook = book.id;
    wishBtn.textContent = isWishlisted ? 'Remove wishlist' : 'Add wishlist';
    actionsSlot.appendChild(wishBtn);

    if (rentedByUser) {
      const returnBtn = document.createElement('button');
      returnBtn.className = 'btn btn-success btn-small';
      returnBtn.dataset.returnBook = book.id;
      returnBtn.textContent = 'Return';
      actionsSlot.appendChild(returnBtn);
    }
  }

  return fragment;
}

function rentalItem(rental) {
  const fragment = clone('tpl-rental-item');
  setText(fragment, 'title', rental.bookTitle);
  setText(fragment, 'dates', `Rented: ${rental.rentDate} | Return: ${rental.returnDate}`);

  const returnBtn = document.createElement('button');
  returnBtn.className = 'btn btn-success btn-small';
  returnBtn.dataset.returnBook = rental.bookId;
  returnBtn.textContent = 'Return book';
  setContent(fragment, 'returnBtn', returnBtn);

  return fragment;
}

function activityListItem(log, includeBy = false) {
  const fragment = clone('tpl-list-item');
  const title = log.action + (log.book ? ` - ${log.book}` : '');
  const subtitle = (includeBy ? `by ${log.user}` : log.user) + ` • ${log.timestamp}`;
  setText(fragment, 'title', title);
  setText(fragment, 'subtitle', subtitle);
  return fragment;
}

function buildCategoryBars(items) {
  const bars = document.createElement('div');
  bars.className = 'bars';
  const max = Math.max(...items.map(i => i.count), 1);
  items.forEach(item => {
    const fragment = clone('tpl-bar-row');
    setText(fragment, 'label', item.name);
    setText(fragment, 'value', item.count);
    fragment.querySelector('.bar-fill').style.width = `${(item.count / max) * 100}%`;
    bars.appendChild(fragment);
  });
  return bars;
}

function getCategoryData(books) {
  return [...new Set(books.map(b => b.category))].map(name => ({
    name, count: books.filter(b => b.category === name).length,
  }));
}
