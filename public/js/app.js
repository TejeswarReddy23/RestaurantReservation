/**
 * Restaurant Reservation Management System - Tejeswar Restaurant
 * Common Frontend JavaScript (app.js)
 * Supports all 9 HTML pages seamlessly
 */

// If page is loaded through Live Server (port 5500), file://, or another port, connect to Express on port 3000
const API_BASE = (window.location.protocol.startsWith('http') && window.location.port === '3000')
  ? ''
  : 'http://localhost:3000';

// Safe Fetch Wrapper to handle non-JSON / server-down errors gracefully
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error(
          `Connected to a static server instead of Express API. Please ensure "node server.js" is running in your terminal and open http://localhost:3000 in your browser.`
        );
      }
      throw new Error(`Unexpected non-JSON response from server (HTTP ${res.status}).`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Could not connect to backend server. Please start the server using "node server.js" in your terminal.');
    }
    throw err;
  }
}

// ========================================================
// 1. UTILITIES & NOTIFICATIONS
// ========================================================

function showAlert(message, type = 'info', containerId = 'alert-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    alert(message);
    return;
  }
  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type}`;
  alertEl.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button type="button" class="alert-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.innerHTML = '';
  container.appendChild(alertEl);

  setTimeout(() => {
    if (alertEl.parentElement) {
      alertEl.remove();
    }
  }, 6000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  // If date string contains T, extract date part
  const part = dateStr.split('T')[0];
  return part;
}

function formatTime(timeStr) {
  if (!timeStr) return 'N/A';
  return timeStr.substring(0, 5); // HH:MM
}

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  let badgeClass = 'badge-pending';
  if (s === 'confirmed') badgeClass = 'badge-confirmed';
  else if (s === 'cancelled') badgeClass = 'badge-cancelled';
  else if (s === 'available') badgeClass = 'badge-available';
  else if (s === 'reserved') badgeClass = 'badge-reserved';
  return `<span class="badge ${badgeClass}">${escapeHtml(status || 'Unknown')}</span>`;
}

// ========================================================
// 2. NAVIGATION BAR & MOBILE MENU
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const toggleBtn = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }

  // Active Navigation Item Highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.nav-link');
  navItems.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Page Initializers based on present DOM elements
  initDashboard();
  initInsertPage();
  initListPage();
  initListOnePage();
  initUpdatePage();
  initDeletePage();
  initCustomersPage();
  initTablesPage();
  initReservationsPage();
});

// ========================================================
// 3. PAGE 1: DASHBOARD (index.html)
// ========================================================
async function initDashboard() {
  const statsContainer = document.getElementById('dashboard-stats');
  if (!statsContainer) return;

  try {
    const result = await apiFetch('/dashboard');
    if (!result.success) throw new Error(result.message);

    const d = result.data;

    // Update stat numbers
    const elCust = document.getElementById('stat-total-customers');
    const elTbl = document.getElementById('stat-total-tables');
    const elRes = document.getElementById('stat-total-reservations');
    const elPending = document.getElementById('stat-pending-reservations');
    const elConfirmed = document.getElementById('stat-confirmed-reservations');
    const elCancelled = document.getElementById('stat-cancelled-reservations');
    const elAvail = document.getElementById('stat-available-tables');

    if (elCust) elCust.textContent = d.total_customers ?? 0;
    if (elTbl) elTbl.textContent = d.total_tables ?? 0;
    if (elRes) elRes.textContent = d.total_reservations ?? 0;
    if (elPending) elPending.textContent = d.pending_reservations ?? 0;
    if (elConfirmed) elConfirmed.textContent = d.confirmed_reservations ?? 0;
    if (elCancelled) elCancelled.textContent = d.cancelled_reservations ?? 0;
    if (elAvail) elAvail.textContent = d.available_tables ?? 0;

    // Render Recent Reservations Table
    const tbody = document.getElementById('recent-reservations-tbody');
    if (tbody) {
      if (!d.recent_reservations || d.recent_reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No recent reservations found.</td></tr>`;
      } else {
        tbody.innerHTML = d.recent_reservations.map(r => {
          const resId = r.reservation_id || r.reservations_id;
          return `
          <tr>
            <td><strong>#${resId}</strong></td>
            <td>${escapeHtml(r.customer_name || 'N/A')}</td>
            <td>${escapeHtml(r.customer_phone || 'N/A')}</td>
            <td>Table ${escapeHtml(r.table_number || 'N/A')}</td>
            <td>${formatDate(r.reservation_date)} at ${formatTime(r.reservation_time)}</td>
            <td>${r.guests} Guests</td>
            <td>${getStatusBadge(r.status)}</td>
          </tr>
        `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showAlert('Failed to connect or load dashboard statistics: ' + err.message, 'danger');
  }
}

// ========================================================
// 4. PAGE 2: INSERT RECORDS (insert.html)
// ========================================================
async function initInsertPage() {
  const customerForm = document.getElementById('form-add-customer');
  const tableForm = document.getElementById('form-add-table');
  const reservationForm = document.getElementById('form-add-reservation');

  if (!customerForm && !tableForm && !reservationForm) return;

  // Tab switching if tabs exist
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.add('active');
    });
  });

  // Populate Dropdowns for Reservation form
  await loadCustomerDropdown('reservation-customer-id');
  await loadTableDropdown('reservation-table-id');

  // Customer Form Submission
  if (customerForm) {
    customerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      const password = document.getElementById('customer-password') ? document.getElementById('customer-password').value.trim() : '';

      if (name.length > 15) {
        showAlert('Customer Name cannot exceed 15 characters (database schema constraint).', 'danger', 'customer-alert');
        return;
      }

      try {
        const result = await apiFetch('/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password })
        });
        if (!result.success) throw new Error(result.message);

        showAlert(`✅ Customer "${result.data.name}" added successfully with ID #${result.data.customer_id}!`, 'success', 'customer-alert');
        customerForm.reset();
        await loadCustomerDropdown('reservation-customer-id');
      } catch (err) {
        showAlert(`Error: ${err.message}`, 'danger', 'customer-alert');
      }
    });
  }

  // Table Form Submission
  if (tableForm) {
    tableForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const table_number = document.getElementById('table-number').value.trim();
      const seating_capacity = document.getElementById('table-capacity').value;
      const location = document.getElementById('table-location').value.trim();
      const status = document.getElementById('table-status').value;

      try {
        const result = await apiFetch('/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_number, seating_capacity, location, status })
        });
        if (!result.success) throw new Error(result.message);

        showAlert(`✅ Table "${result.data.table_number}" added successfully with ID #${result.data.table_id}!`, 'success', 'table-alert');
        tableForm.reset();
        await loadTableDropdown('reservation-table-id');
      } catch (err) {
        showAlert(`Error: ${err.message}`, 'danger', 'table-alert');
      }
    });
  }

  // Reservation Form Submission
  if (reservationForm) {
    // Dynamic capacity helper on table selection
    const tableSelect = document.getElementById('reservation-table-id');
    const guestsInput = document.getElementById('reservation-guests');
    const tableHint = document.getElementById('table-capacity-hint');

    if (tableSelect) {
      tableSelect.addEventListener('change', () => {
        const opt = tableSelect.options[tableSelect.selectedIndex];
        if (opt && opt.dataset.capacity) {
          if (tableHint) tableHint.textContent = `Selected Table Capacity: Max ${opt.dataset.capacity} guests`;
          if (guestsInput) guestsInput.max = opt.dataset.capacity;
        } else if (tableHint) {
          tableHint.textContent = '';
        }
      });
    }

    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customer_id = document.getElementById('reservation-customer-id').value;
      const table_id = document.getElementById('reservation-table-id').value;
      const reservation_date = document.getElementById('reservation-date').value;
      const reservation_time = document.getElementById('reservation-time').value;
      const guests = document.getElementById('reservation-guests').value;
      const status = document.getElementById('reservation-status').value;

      try {
        const result = await apiFetch('/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id, table_id, reservation_date, reservation_time, guests, status })
        });
        if (!result.success) throw new Error(result.message);

        const resId = result.data.reservation_id || result.data.reservations_id;
        showAlert(`✅ Reservation #${resId} created successfully for ${result.data.customer_name}!`, 'success', 'reservation-alert');
        reservationForm.reset();
        if (tableHint) tableHint.textContent = '';
      } catch (err) {
        showAlert(`Reservation Error: ${err.message}`, 'danger', 'reservation-alert');
      }
    });
  }
}

// Helpers to load dropdowns
async function loadCustomerDropdown(selectId, selectedId = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const result = await apiFetch('/customers');
    sel.innerHTML = '<option value="">-- Choose a Customer --</option>';
    if (result.success && result.data.length > 0) {
      result.data.forEach(c => {
        const isSel = selectedId && Number(selectedId) === Number(c.customer_id) ? 'selected' : '';
        sel.innerHTML += `<option value="${c.customer_id}" ${isSel}>ID #${c.customer_id} - ${escapeHtml(c.name)} (${escapeHtml(c.phone || c.email)})</option>`;
      });
    } else {
      sel.innerHTML = '<option value="">No customers found. Please add one first.</option>';
    }
  } catch (err) {
    console.error('Error loading customers dropdown:', err);
  }
}

async function loadTableDropdown(selectId, selectedId = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const result = await apiFetch('/tables');
    sel.innerHTML = '<option value="">-- Choose a Table --</option>';
    if (result.success && result.data.length > 0) {
      result.data.forEach(t => {
        const isSel = selectedId && Number(selectedId) === Number(t.table_id) ? 'selected' : '';
        sel.innerHTML += `<option value="${t.table_id}" data-capacity="${t.seating_capacity}" ${isSel}>Table ${escapeHtml(t.table_number)} (Capacity: ${t.seating_capacity} | ${escapeHtml(t.location || 'Dining')})</option>`;
      });
    } else {
      sel.innerHTML = '<option value="">No tables found. Please add one first.</option>';
    }
  } catch (err) {
    console.error('Error loading tables dropdown:', err);
  }
}

// ========================================================
// 5. PAGE 3: LIST ALL RECORDS (list.html)
// ========================================================
async function initListPage() {
  const customersTbody = document.getElementById('all-customers-tbody');
  const tablesTbody = document.getElementById('all-tables-tbody');
  const reservationsTbody = document.getElementById('all-reservations-tbody');

  if (!customersTbody && !tablesTbody && !reservationsTbody) return;

  // Load all 3 sections
  loadAllCustomers();
  loadAllTables();
  loadAllReservations();

  // Search input filter for Reservations
  const searchInput = document.getElementById('reservations-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loadAllReservations(e.target.value);
    });
  }
}

async function loadAllCustomers(search = '') {
  const tbody = document.getElementById('all-customers-tbody');
  if (!tbody) return;
  try {
    const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No customer records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = result.data.map(c => `
      <tr>
        <td><strong>#${c.customer_id}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td class="table-actions">
          <a href="update.html?type=customer&id=${c.customer_id}" class="btn btn-outline btn-sm">Edit</a>
          <a href="delete.html?type=customer&id=${c.customer_id}" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadAllTables(search = '') {
  const tbody = document.getElementById('all-tables-tbody');
  if (!tbody) return;
  try {
    const url = search ? `/tables?search=${encodeURIComponent(search)}` : '/tables';
    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No restaurant tables found.</td></tr>`;
      return;
    }

    tbody.innerHTML = result.data.map(t => `
      <tr>
        <td><strong>#${t.table_id}</strong></td>
        <td>Table ${escapeHtml(t.table_number)}</td>
        <td>${t.seating_capacity} Persons</td>
        <td>${escapeHtml(t.location || 'Main Floor')}</td>
        <td>${getStatusBadge(t.status)}</td>
        <td class="table-actions">
          <a href="update.html?type=table&id=${t.table_id}" class="btn btn-outline btn-sm">Edit</a>
          <a href="delete.html?type=table&id=${t.table_id}" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadAllReservations(search = '', date = '', status = '') {
  const tbody = document.getElementById('all-reservations-tbody');
  if (!tbody) return;
  try {
    let url = `/reservations?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (date) url += `date=${encodeURIComponent(date)}&`;
    if (status) url += `status=${encodeURIComponent(status)}&`;

    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No reservations match the criteria.</td></tr>`;
      return;
    }

    // Reservation columns using SQL JOIN data
    tbody.innerHTML = result.data.map(r => {
      const resId = r.reservation_id || r.reservations_id;
      return `
      <tr>
        <td><strong>#${resId}</strong></td>
        <td>
          <strong>${escapeHtml(r.customer_name || 'Customer #' + r.customer_id)}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(r.customer_phone || '')}</div>
        </td>
        <td>
          Table ${escapeHtml(r.table_number || '#' + r.table_id)}
          <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(r.table_location || '')}</div>
        </td>
        <td>${formatDate(r.reservation_date)}</td>
        <td>${formatTime(r.reservation_time)}</td>
        <td>${r.guests} Guests</td>
        <td>${getStatusBadge(r.status)}</td>
        <td class="table-actions">
          <a href="update.html?type=reservation&id=${resId}" class="btn btn-outline btn-sm">Edit</a>
          <a href="delete.html?type=reservation&id=${resId}" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

// ========================================================
// 6. PAGE 4: SEARCH SINGLE RECORD (listOne.html)
// ========================================================
function initListOnePage() {
  const searchForm = document.getElementById('search-single-form');
  const clearBtn = document.getElementById('search-clear-btn');
  const resultContainer = document.getElementById('search-single-result');

  if (!searchForm || !resultContainer) return;

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchForm.reset();
      resultContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>Search the Database</h3>
          <p>Choose an entity category and enter a search query to view complete record details.</p>
        </div>
      `;
    });
  }

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entity = document.getElementById('search-entity-type').value;
    const query = document.getElementById('search-query-input').value.trim();

    if (!query) {
      showAlert('Please enter an ID, name, phone, or keyword to search.', 'danger', 'search-alert');
      return;
    }

    resultContainer.innerHTML = '<div style="text-align:center; padding:2rem;">Searching database...</div>';

    try {
      if (entity === 'customer') {
        const isNum = !isNaN(query);
        let customer = null;
        if (isNum) {
          try {
            const r = await apiFetch(`/customers/${query}`);
            if (r.success) customer = r.data;
          } catch (e) {}
        }
        if (!customer) {
          const r = await apiFetch(`/customers?search=${encodeURIComponent(query)}`);
          if (r.success && r.data.length > 0) customer = r.data[0];
        }

        if (!customer) {
          resultContainer.innerHTML = `
            <div class="alert alert-danger">
              No customer record found matching "${escapeHtml(query)}". Please verify the ID or name.
            </div>
          `;
          return;
        }

        resultContainer.innerHTML = `
          <div class="card" style="border-color:var(--border-gold);">
            <div class="card-header">
              <span class="card-title">👤 Customer Record #${customer.customer_id}</span>
              <div class="page-header-actions">
                <a href="update.html?type=customer&id=${customer.customer_id}" class="btn btn-outline btn-sm">Edit Customer</a>
                <a href="delete.html?type=customer&id=${customer.customer_id}" class="btn btn-danger btn-sm">Delete</a>
              </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.2rem;">
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Customer ID</label>
                <p style="font-size:1.1rem; font-weight:700; color:var(--primary-gold-light);">#${customer.customer_id}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Full Name</label>
                <p style="font-size:1.1rem; font-weight:600;">${escapeHtml(customer.name)}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Phone Number</label>
                <p style="font-size:1.1rem;">${escapeHtml(customer.phone)}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Email Address</label>
                <p style="font-size:1.1rem;">${escapeHtml(customer.email)}</p>
              </div>
            </div>
          </div>
        `;
      } else if (entity === 'table') {
        const isNum = !isNaN(query);
        let table = null;
        if (isNum) {
          try {
            const r = await apiFetch(`/tables/${query}`);
            if (r.success) table = r.data;
          } catch (e) {}
        }
        if (!table) {
          const r = await apiFetch(`/tables?search=${encodeURIComponent(query)}`);
          if (r.success && r.data.length > 0) table = r.data[0];
        }

        if (!table) {
          resultContainer.innerHTML = `
            <div class="alert alert-danger">
              No restaurant table found matching "${escapeHtml(query)}".
            </div>
          `;
          return;
        }

        resultContainer.innerHTML = `
          <div class="card" style="border-color:var(--border-gold);">
            <div class="card-header">
              <span class="card-title">🪑 Table Record #${table.table_id}</span>
              <div class="page-header-actions">
                <a href="update.html?type=table&id=${table.table_id}" class="btn btn-outline btn-sm">Edit Table</a>
                <a href="delete.html?type=table&id=${table.table_id}" class="btn btn-danger btn-sm">Delete</a>
              </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.2rem;">
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Table ID</label>
                <p style="font-size:1.1rem; font-weight:700; color:var(--primary-gold-light);">#${table.table_id}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Table Number</label>
                <p style="font-size:1.1rem; font-weight:600;">Table ${escapeHtml(table.table_number)}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Capacity</label>
                <p style="font-size:1.1rem;">${table.seating_capacity} Persons</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Location</label>
                <p style="font-size:1.1rem;">${escapeHtml(table.location || 'Main Floor')}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Status</label>
                <div>${getStatusBadge(table.status)}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Reservation search
        const isNum = !isNaN(query);
        let resv = null;
        if (isNum) {
          try {
            const r = await apiFetch(`/reservations/${query}`);
            if (r.success) resv = r.data;
          } catch (e) {}
        }
        if (!resv) {
          const r = await apiFetch(`/reservations?search=${encodeURIComponent(query)}`);
          if (r.success && r.data.length > 0) resv = r.data[0];
        }

        if (!resv) {
          resultContainer.innerHTML = `
            <div class="alert alert-danger">
              No reservation found matching "${escapeHtml(query)}".
            </div>
          `;
          return;
        }

        const resId = resv.reservation_id || resv.reservations_id;
        resultContainer.innerHTML = `
          <div class="card" style="border-color:var(--border-gold);">
            <div class="card-header">
              <span class="card-title">📅 Reservation #${resId}</span>
              <div class="page-header-actions">
                <a href="update.html?type=reservation&id=${resId}" class="btn btn-outline btn-sm">Edit Reservation</a>
                <a href="delete.html?type=reservation&id=${resId}" class="btn btn-danger btn-sm">Delete</a>
              </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.2rem;">
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Reservation ID</label>
                <p style="font-size:1.1rem; font-weight:700; color:var(--primary-gold-light);">#${resId}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Customer</label>
                <p style="font-size:1.1rem; font-weight:600;">${escapeHtml(resv.customer_name || 'N/A')}</p>
                <span style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(resv.customer_phone || '')}</span>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Table Reserved</label>
                <p style="font-size:1.1rem; font-weight:600;">Table ${escapeHtml(resv.table_number || 'N/A')}</p>
                <span style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(resv.table_location || '')} (Max: ${resv.seating_capacity})</span>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Date & Time</label>
                <p style="font-size:1.1rem;">${formatDate(resv.reservation_date)} at ${formatTime(resv.reservation_time)}</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Party Size</label>
                <p style="font-size:1.1rem;">${resv.guests} Guests</p>
              </div>
              <div>
                <label style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">Status</label>
                <div>${getStatusBadge(resv.status)}</div>
              </div>
            </div>
          </div>
        `;
      }
    } catch (err) {
      resultContainer.innerHTML = `<div class="alert alert-danger">Error querying database: ${err.message}</div>`;
    }
  });
}

// ========================================================
// 7. PAGE 5: UPDATE RECORDS (update.html)
// ========================================================
async function initUpdatePage() {
  const entitySelect = document.getElementById('update-entity-type');
  const recordIdInput = document.getElementById('update-record-id');
  const loadBtn = document.getElementById('update-load-btn');
  const formContainer = document.getElementById('update-form-container');

  if (!entitySelect || !formContainer) return;

  // Auto-fill from URL parameters if available (e.g. ?type=customer&id=2)
  const urlParams = new URLSearchParams(window.location.search);
  const paramType = urlParams.get('type');
  const paramId = urlParams.get('id');

  if (paramType) entitySelect.value = paramType;
  if (paramId) recordIdInput.value = paramId;

  if (paramType && paramId) {
    loadRecordForUpdate(paramType, paramId);
  }

  loadBtn.addEventListener('click', () => {
    const type = entitySelect.value;
    const id = recordIdInput.value.trim();
    if (!id) {
      showAlert('Please enter a record ID to load.', 'danger', 'update-alert');
      return;
    }
    loadRecordForUpdate(type, id);
  });
}

async function loadRecordForUpdate(type, id) {
  const container = document.getElementById('update-form-container');
  container.innerHTML = '<div style="text-align:center; padding:2rem;">Fetching record from database...</div>';

  try {
    if (type === 'customer') {
      const result = await apiFetch(`/customers/${id}`);
      if (!result.success) throw new Error(result.message);

      const c = result.data;
      container.innerHTML = `
        <form id="form-edit-customer" class="card">
          <div class="card-header">
            <span class="card-title">✏️ Edit Customer #${c.customer_id}</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Customer ID</label>
              <input type="text" class="form-control" value="${c.customer_id}" disabled />
            </div>
            <div class="form-group">
              <label>Full Name <span class="required">*</span></label>
              <input type="text" id="edit-cust-name" class="form-control" value="${escapeHtml(c.name)}" maxlength="15" required />
              <div class="form-help">Max 15 characters (database schema limit).</div>
            </div>
            <div class="form-group">
              <label>Email Address <span class="required">*</span></label>
              <input type="email" id="edit-cust-email" class="form-control" value="${escapeHtml(c.email)}" required />
            </div>
            <div class="form-group">
              <label>Phone Number <span class="required">*</span></label>
              <input type="tel" id="edit-cust-phone" class="form-control" value="${escapeHtml(c.phone)}" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <a href="list.html" class="btn btn-outline">Back to Records</a>
          </div>
        </form>
      `;

      document.getElementById('form-edit-customer').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('edit-cust-name').value.trim();
        const email = document.getElementById('edit-cust-email').value.trim();
        const phone = document.getElementById('edit-cust-phone').value.trim();

        try {
          const updateData = await apiFetch(`/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone })
          });
          if (!updateData.success) {
            showAlert(updateData.message, 'danger', 'update-alert');
          } else {
            showAlert(`✅ Customer #${id} updated successfully!`, 'success', 'update-alert');
          }
        } catch (err) {
          showAlert(err.message, 'danger', 'update-alert');
        }
      });
    } else if (type === 'table') {
      const result = await apiFetch(`/tables/${id}`);
      if (!result.success) throw new Error(result.message);

      const t = result.data;
      container.innerHTML = `
        <form id="form-edit-table" class="card">
          <div class="card-header">
            <span class="card-title">✏️ Edit Table #${t.table_id}</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Table ID</label>
              <input type="text" class="form-control" value="${t.table_id}" disabled />
            </div>
            <div class="form-group">
              <label>Table Number / Name <span class="required">*</span></label>
              <input type="text" id="edit-tbl-number" class="form-control" value="${escapeHtml(t.table_number)}" required />
            </div>
            <div class="form-group">
              <label>Seating Capacity <span class="required">*</span></label>
              <input type="number" id="edit-tbl-capacity" class="form-control" value="${t.seating_capacity}" min="1" required />
            </div>
            <div class="form-group">
              <label>Dining Location</label>
              <input type="text" id="edit-tbl-location" class="form-control" value="${escapeHtml(t.location || '')}" />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="edit-tbl-status" class="form-control">
                <option value="Available" ${t.status === 'Available' ? 'selected' : ''}>Available</option>
                <option value="Reserved" ${t.status === 'Reserved' ? 'selected' : ''}>Reserved</option>
                <option value="Maintenance" ${t.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <a href="list.html" class="btn btn-outline">Back to Records</a>
          </div>
        </form>
      `;

      document.getElementById('form-edit-table').addEventListener('submit', async (e) => {
        e.preventDefault();
        const table_number = document.getElementById('edit-tbl-number').value.trim();
        const seating_capacity = document.getElementById('edit-tbl-capacity').value;
        const location = document.getElementById('edit-tbl-location').value.trim();
        const status = document.getElementById('edit-tbl-status').value;

        try {
          const updateData = await apiFetch(`/tables/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_number, seating_capacity, location, status })
          });
          if (!updateData.success) {
            showAlert(updateData.message, 'danger', 'update-alert');
          } else {
            showAlert(`✅ Table #${id} updated successfully!`, 'success', 'update-alert');
          }
        } catch (err) {
          showAlert(err.message, 'danger', 'update-alert');
        }
      });
    } else {
      // Reservation
      const result = await apiFetch(`/reservations/${id}`);
      if (!result.success) throw new Error(result.message);

      const r = result.data;
      const resId = r.reservation_id || r.reservations_id || id;
      container.innerHTML = `
        <form id="form-edit-resv" class="card">
          <div class="card-header">
            <span class="card-title">✏️ Edit Reservation #${resId}</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Reservation ID</label>
              <input type="text" class="form-control" value="${resId}" disabled />
            </div>
            <div class="form-group">
              <label>Customer <span class="required">*</span></label>
              <select id="edit-resv-cust" class="form-control" required></select>
            </div>
            <div class="form-group">
              <label>Table <span class="required">*</span></label>
              <select id="edit-resv-tbl" class="form-control" required></select>
            </div>
            <div class="form-group">
              <label>Reservation Date <span class="required">*</span></label>
              <input type="date" id="edit-resv-date" class="form-control" value="${formatDate(r.reservation_date)}" required />
            </div>
            <div class="form-group">
              <label>Reservation Time <span class="required">*</span></label>
              <input type="time" id="edit-resv-time" class="form-control" value="${formatTime(r.reservation_time)}" required />
            </div>
            <div class="form-group">
              <label>Number of Guests <span class="required">*</span></label>
              <input type="number" id="edit-resv-guests" class="form-control" value="${r.guests}" min="1" required />
            </div>
            <div class="form-group">
              <label>Reservation Status</label>
              <select id="edit-resv-status" class="form-control">
                <option value="Confirmed" ${r.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Cancelled" ${r.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <a href="list.html" class="btn btn-outline">Back to Records</a>
          </div>
        </form>
      `;

      await loadCustomerDropdown('edit-resv-cust', r.customer_id);
      await loadTableDropdown('edit-resv-tbl', r.table_id);

      document.getElementById('form-edit-resv').addEventListener('submit', async (e) => {
        e.preventDefault();
        const customer_id = document.getElementById('edit-resv-cust').value;
        const table_id = document.getElementById('edit-resv-tbl').value;
        const reservation_date = document.getElementById('edit-resv-date').value;
        const reservation_time = document.getElementById('edit-resv-time').value;
        const guests = document.getElementById('edit-resv-guests').value;
        const status = document.getElementById('edit-resv-status').value;

        try {
          const updateData = await apiFetch(`/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id, table_id, reservation_date, reservation_time, guests, status })
          });
          if (!updateData.success) {
            showAlert(updateData.message, 'danger', 'update-alert');
          } else {
            showAlert(`✅ Reservation #${id} updated successfully!`, 'success', 'update-alert');
          }
        } catch (err) {
          showAlert(err.message, 'danger', 'update-alert');
        }
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ========================================================
// 8. PAGE 6: DELETE RECORDS (delete.html)
// ========================================================
function initDeletePage() {
  const entitySelect = document.getElementById('delete-entity-type');
  const recordIdInput = document.getElementById('delete-record-id');
  const previewBtn = document.getElementById('delete-preview-btn');
  const previewContainer = document.getElementById('delete-preview-container');

  if (!entitySelect || !previewContainer) return;

  // Auto-fill from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const paramType = urlParams.get('type');
  const paramId = urlParams.get('id');

  if (paramType) entitySelect.value = paramType;
  if (paramId) recordIdInput.value = paramId;

  if (paramType && paramId) {
    loadRecordForDeletePreview(paramType, paramId);
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const type = entitySelect.value;
      const id = recordIdInput.value.trim();
      if (!id) {
        showAlert('Please enter a record ID to inspect before deleting.', 'danger', 'delete-alert');
        return;
      }
      loadRecordForDeletePreview(type, id);
    });
  }
}

async function loadRecordForDeletePreview(type, id) {
  const container = document.getElementById('delete-preview-container');
  container.innerHTML = '<div style="text-align:center; padding:2rem;">Inspecting record...</div>';

  try {
    let url = '';
    let title = '';
    let detailsHtml = '';

    if (type === 'customer') {
      const data = await apiFetch(`/customers/${id}`);
      if (!data.success) throw new Error(data.message);
      const c = data.data;
      title = `Customer #${c.customer_id}: ${c.name}`;
      detailsHtml = `
        <p><strong>Customer Name:</strong> ${escapeHtml(c.name)}</p>
        <p><strong>Email Address:</strong> ${escapeHtml(c.email)}</p>
        <p><strong>Phone Number:</strong> ${escapeHtml(c.phone)}</p>
        <div class="alert alert-info" style="margin-top:1rem;">
          ⚠️ <em>Database Foreign Key Protection:</em> If this customer has existing reservations, the database will safeguard data and prevent deletion until reservations are deleted or canceled.
        </div>
      `;
    } else if (type === 'table') {
      const data = await apiFetch(`/tables/${id}`);
      if (!data.success) throw new Error(data.message);
      const t = data.data;
      title = `Table #${t.table_id}: ${t.table_number}`;
      detailsHtml = `
        <p><strong>Table Number:</strong> ${escapeHtml(t.table_number)}</p>
        <p><strong>Seating Capacity:</strong> ${t.seating_capacity} Persons</p>
        <p><strong>Location:</strong> ${escapeHtml(t.location || 'Main Floor')}</p>
        <p><strong>Current Status:</strong> ${escapeHtml(t.status)}</p>
        <div class="alert alert-info" style="margin-top:1rem;">
          ⚠️ <em>Foreign Key Protection:</em> If active or historical reservations are booked on this table, deletion will be blocked by MySQL foreign keys.
        </div>
      `;
    } else {
      const data = await apiFetch(`/reservations/${id}`);
      if (!data.success) throw new Error(data.message);
      const r = data.data;
      const resId = r.reservation_id || r.reservations_id || id;
      title = `Reservation #${resId}`;
      detailsHtml = `
        <p><strong>Customer:</strong> ${escapeHtml(r.customer_name || 'ID ' + r.customer_id)} (${escapeHtml(r.customer_phone || '')})</p>
        <p><strong>Table:</strong> Table ${escapeHtml(r.table_number || 'ID ' + r.table_id)}</p>
        <p><strong>Date & Time:</strong> ${formatDate(r.reservation_date)} at ${formatTime(r.reservation_time)}</p>
        <p><strong>Guests:</strong> ${r.guests} Guests</p>
        <p><strong>Status:</strong> ${escapeHtml(r.status)}</p>
      `;
    }

    container.innerHTML = `
      <div class="card" style="border:1px solid rgba(231,76,60,0.5);">
        <div class="card-header">
          <span class="card-title" style="color:#ff6b6b;">⚠️ Confirm Deletion of ${escapeHtml(title)}</span>
        </div>
        <div style="margin-bottom:1.5rem;">
          ${detailsHtml}
        </div>
        <div style="background:rgba(231,76,60,0.1); border-left:4px solid #e74c3c; padding:1rem; margin-bottom:1.5rem; border-radius:4px;">
          <strong>Warning:</strong> This action permanently removes the selected record from the MySQL database. This action cannot be undone.
        </div>
        <div class="form-actions">
          <button id="confirm-delete-btn" class="btn btn-danger btn-lg">Yes, Delete This Record</button>
          <a href="list.html" class="btn btn-outline">Cancel</a>
        </div>
      </div>
    `;

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
      const pluralType = type === 'customer' ? 'customers' : (type === 'table' ? 'tables' : 'reservations');
      try {
        const result = await apiFetch(`/${pluralType}/${id}`, { method: 'DELETE' });
        if (!result.success) throw new Error(result.message);

        showAlert(`✅ ${result.message}`, 'success', 'delete-alert');
        container.innerHTML = `
          <div class="alert alert-success">
            <strong>Record Removed:</strong> ${escapeHtml(result.message)}
          </div>
          <div style="margin-top:1rem;">
            <a href="list.html" class="btn btn-primary">View Remaining Records</a>
          </div>
        `;
      } catch (err) {
        showAlert(`Deletion Error: ${err.message}`, 'danger', 'delete-alert');
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ========================================================
// 9. ADDITIONAL MANAGEMENT PAGES
// ========================================================

// customers.html
function initCustomersPage() {
  const tbody = document.getElementById('customers-mgmt-tbody');
  const searchInput = document.getElementById('customers-mgmt-search');
  const addForm = document.getElementById('form-mgmt-add-customer');

  if (!tbody) return;

  loadCustomersMgmt();

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loadCustomersMgmt(e.target.value);
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('mgmt-cust-name').value.trim();
      const email = document.getElementById('mgmt-cust-email').value.trim();
      const phone = document.getElementById('mgmt-cust-phone').value.trim();

      if (name.length > 15) {
        showAlert('Customer Name cannot exceed 15 characters (database schema limit).', 'danger', 'mgmt-cust-alert');
        return;
      }

      try {
        const result = await apiFetch('/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone })
        });
        if (!result.success) throw new Error(result.message);

        showAlert(`✅ Customer "${result.data.name}" added successfully!`, 'success', 'mgmt-cust-alert');
        addForm.reset();
        loadCustomersMgmt();
      } catch (err) {
        showAlert(err.message, 'danger', 'mgmt-cust-alert');
      }
    });
  }
}

async function loadCustomersMgmt(search = '') {
  const tbody = document.getElementById('customers-mgmt-tbody');
  if (!tbody) return;
  try {
    const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No customer records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = result.data.map(c => `
      <tr>
        <td><strong>#${c.customer_id}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td class="table-actions">
          <a href="update.html?type=customer&id=${c.customer_id}" class="btn btn-outline btn-sm">Edit</a>
          <a href="delete.html?type=customer&id=${c.customer_id}" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// tables.html
function initTablesPage() {
  const tbody = document.getElementById('tables-mgmt-tbody');
  const searchInput = document.getElementById('tables-mgmt-search');
  const statusFilter = document.getElementById('tables-mgmt-status-filter');
  const addForm = document.getElementById('form-mgmt-add-table');

  if (!tbody) return;

  loadTablesMgmt();

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      loadTablesMgmt(searchInput.value, statusFilter ? statusFilter.value : '');
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadTablesMgmt(searchInput ? searchInput.value : '', statusFilter.value);
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const table_number = document.getElementById('mgmt-tbl-number').value.trim();
      const seating_capacity = document.getElementById('mgmt-tbl-capacity').value;
      const location = document.getElementById('mgmt-tbl-location').value.trim();
      const status = document.getElementById('mgmt-tbl-status').value;

      try {
        const result = await apiFetch('/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_number, seating_capacity, location, status })
        });
        if (!result.success) throw new Error(result.message);

        showAlert(`✅ Table "${result.data.table_number}" added successfully!`, 'success', 'mgmt-tbl-alert');
        addForm.reset();
        loadTablesMgmt();
      } catch (err) {
        showAlert(err.message, 'danger', 'mgmt-tbl-alert');
      }
    });
  }
}

async function loadTablesMgmt(search = '', status = '') {
  const tbody = document.getElementById('tables-mgmt-tbody');
  if (!tbody) return;
  try {
    let url = `/tables?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (status && status !== 'all') url += `status=${encodeURIComponent(status)}&`;

    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No tables found.</td></tr>`;
      return;
    }

    tbody.innerHTML = result.data.map(t => `
      <tr>
        <td><strong>#${t.table_id}</strong></td>
        <td>Table ${escapeHtml(t.table_number)}</td>
        <td>${t.seating_capacity} Persons</td>
        <td>${escapeHtml(t.location || 'Main Floor')}</td>
        <td>${getStatusBadge(t.status)}</td>
        <td class="table-actions">
          <a href="update.html?type=table&id=${t.table_id}" class="btn btn-outline btn-sm">Edit</a>
          <a href="delete.html?type=table&id=${t.table_id}" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// reservations.html
function initReservationsPage() {
  const tbody = document.getElementById('reservations-mgmt-tbody');
  const searchInput = document.getElementById('reservations-mgmt-search');
  const dateFilter = document.getElementById('reservations-mgmt-date');
  const statusFilter = document.getElementById('reservations-mgmt-status');
  const addForm = document.getElementById('form-mgmt-add-reservation');

  if (!tbody) return;

  loadCustomerDropdown('mgmt-resv-cust');
  loadTableDropdown('mgmt-resv-tbl');
  loadReservationsMgmt();

  function triggerReload() {
    loadReservationsMgmt(
      searchInput ? searchInput.value : '',
      dateFilter ? dateFilter.value : '',
      statusFilter ? statusFilter.value : ''
    );
  }

  if (searchInput) searchInput.addEventListener('input', triggerReload);
  if (dateFilter) dateFilter.addEventListener('change', triggerReload);
  if (statusFilter) statusFilter.addEventListener('change', triggerReload);

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customer_id = document.getElementById('mgmt-resv-cust').value;
      const table_id = document.getElementById('mgmt-resv-tbl').value;
      const reservation_date = document.getElementById('mgmt-resv-date').value;
      const reservation_time = document.getElementById('mgmt-resv-time').value;
      const guests = document.getElementById('mgmt-resv-guests').value;
      const status = document.getElementById('mgmt-resv-status').value;

      try {
        const result = await apiFetch('/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id, table_id, reservation_date, reservation_time, guests, status })
        });
        if (!result.success) throw new Error(result.message);

        const resId = result.data.reservation_id || result.data.reservations_id;
        showAlert(`✅ Reservation #${resId} created successfully!`, 'success', 'mgmt-resv-alert');
        addForm.reset();
        triggerReload();
      } catch (err) {
        showAlert(err.message, 'danger', 'mgmt-resv-alert');
      }
    });
  }
}

async function loadReservationsMgmt(search = '', date = '', status = '') {
  const tbody = document.getElementById('reservations-mgmt-tbody');
  if (!tbody) return;
  try {
    let url = `/reservations?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (date) url += `date=${encodeURIComponent(date)}&`;
    if (status && status !== 'all') url += `status=${encodeURIComponent(status)}&`;

    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No reservations found.</td></tr>`;
      return;
    }

    tbody.innerHTML = result.data.map(r => {
      const resId = r.reservation_id || r.reservations_id;
      return `
      <tr>
        <td><strong>#${resId}</strong></td>
        <td>
          <strong>${escapeHtml(r.customer_name || 'Customer #' + r.customer_id)}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(r.customer_phone || '')}</div>
        </td>
        <td>
          Table ${escapeHtml(r.table_number || '#' + r.table_id)}
          <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(r.table_location || '')}</div>
        </td>
        <td>${formatDate(r.reservation_date)}</td>
        <td>${formatTime(r.reservation_time)}</td>
        <td>${r.guests} Guests</td>
        <td>${getStatusBadge(r.status)}</td>
        <td class="table-actions">
          <a href="update.html?type=reservation&id=${resId}" class="btn btn-outline btn-sm">Edit</a>
          <button class="btn btn-danger btn-sm" onclick="cancelReservationQuick(${resId})">Cancel</button>
          <a href="delete.html?type=reservation&id=${resId}" class="btn btn-danger btn-sm" title="Delete">🗑️</a>
        </td>
      </tr>
    `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

// Quick Cancel Reservation action
async function cancelReservationQuick(id) {
  if (!confirm(`Are you sure you want to mark Reservation #${id} as Cancelled?`)) return;
  try {
    const result = await apiFetch(`/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Cancelled' })
    });
    if (!result.success) throw new Error(result.message);

    showAlert(`Reservation #${id} is now Cancelled.`, 'info', 'mgmt-resv-alert');
    if (typeof loadReservationsMgmt === 'function') {
      loadReservationsMgmt();
    }
  } catch (err) {
    showAlert(err.message, 'danger', 'mgmt-resv-alert');
  }
}
