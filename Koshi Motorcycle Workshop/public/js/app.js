// Main Application Orchestrator & Global Modals
window.currentView = 'dashboard';
window.workshopSettings = null;
window.currentUser = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  checkAuth();

  try {
    const settingsRes = await window.api.getSettings();
    window.workshopSettings = settingsRes.data;
    if (document.getElementById('brand-workshop-name')) {
      document.getElementById('brand-workshop-name').textContent = window.workshopSettings.workshop_name;
    }
  } catch (err) {
    console.warn('Could not load workshop settings initially:', err);
  }

  // Update real-time clock
  updateClock();
  setInterval(updateClock, 1000);

  // Check low stock count for sidebar badge
  updateLowStockBadge();

  // If user is authenticated, load dashboard
  if (window.currentUser) {
    window.navigateTo('dashboard');
  }
});

function checkAuth() {
  const storedUser = localStorage.getItem('koshi_auth_user') || sessionStorage.getItem('koshi_auth_user');
  const storedToken = localStorage.getItem('koshi_auth_token') || sessionStorage.getItem('koshi_auth_token');

  const overlay = document.getElementById('login-overlay');
  const headerUser = document.getElementById('header-user-profile');
  const sidebarUser = document.getElementById('sidebar-user-info');

  if (storedUser && storedToken) {
    try {
      window.currentUser = JSON.parse(storedUser);
      if (overlay) overlay.style.display = 'none';
      if (headerUser) {
        headerUser.style.display = 'flex';
        document.getElementById('header-user-name').textContent = window.currentUser.full_name || window.currentUser.username;
      }
      if (sidebarUser) {
        sidebarUser.style.display = 'block';
        document.getElementById('sidebar-user-name').textContent = window.currentUser.full_name || window.currentUser.username;
        document.getElementById('sidebar-user-role').textContent = window.currentUser.role ? window.currentUser.role.toUpperCase() : 'USER';
      }
      return true;
    } catch (e) {
      localStorage.removeItem('koshi_auth_user');
      localStorage.removeItem('koshi_auth_token');
    }
  }

  window.currentUser = null;
  if (overlay) overlay.style.display = 'flex';
  if (headerUser) headerUser.style.display = 'none';
  if (sidebarUser) sidebarUser.style.display = 'none';
  return false;
}

window.handleLogin = async function(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember').checked;
  const errorBox = document.getElementById('login-error-box');
  const errorMsg = document.getElementById('login-error-msg');
  const submitBtn = document.getElementById('login-submit-btn');

  if (!username || !password) {
    errorBox.style.display = 'flex';
    errorMsg.textContent = 'Please enter both username and password';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Verifying credentials...';
  errorBox.style.display = 'none';

  try {
    const res = await window.api.login({ username, password });
    if (res.success && res.user) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('koshi_auth_user', JSON.stringify(res.user));
      storage.setItem('koshi_auth_token', res.token);

      window.currentUser = res.user;

      // Update UI
      const overlay = document.getElementById('login-overlay');
      if (overlay) overlay.style.display = 'none';

      const headerUser = document.getElementById('header-user-profile');
      if (headerUser) {
        headerUser.style.display = 'flex';
        document.getElementById('header-user-name').textContent = res.user.full_name || res.user.username;
      }

      const sidebarUser = document.getElementById('sidebar-user-info');
      if (sidebarUser) {
        sidebarUser.style.display = 'block';
        document.getElementById('sidebar-user-name').textContent = res.user.full_name || res.user.username;
        document.getElementById('sidebar-user-role').textContent = res.user.role ? res.user.role.toUpperCase() : 'USER';
      }

      window.showToast(`Welcome back, ${res.user.full_name || res.user.username}!`, 'success');
      window.navigateTo('dashboard');
    }
  } catch (err) {
    errorBox.style.display = 'flex';
    errorMsg.textContent = err.message || 'Invalid username or password';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In to Workshop ➔';
  }
};

window.logoutUser = function() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('koshi_auth_user');
    localStorage.removeItem('koshi_auth_token');
    sessionStorage.removeItem('koshi_auth_user');
    sessionStorage.removeItem('koshi_auth_token');

    window.currentUser = null;
    checkAuth();
    window.showToast('Logged out successfully', 'info');
  }
};

window.fillDemoLogin = function() {
  document.getElementById('login-username').value = 'admin';
  document.getElementById('login-password').value = 'admin123';
  const errBox = document.getElementById('login-error-box');
  if (errBox) errBox.style.display = 'none';
};

window.toggleLoginPassword = function() {
  const pwdInput = document.getElementById('login-password');
  const btn = document.getElementById('toggle-pwd-btn');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    btn.textContent = 'Hide';
  } else {
    pwdInput.type = 'password';
    btn.textContent = 'Show';
  }
};

function updateClock() {
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

async function updateLowStockBadge() {
  try {
    const res = await window.api.getLowStockItems();
    const badge = document.getElementById('sidebar-low-stock-badge');
    if (badge) {
      const count = res.data?.length || 0;
      if (count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = count;
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {}
}

// Mobile Sidebar Toggle
window.toggleMobileSidebar = function(isOpen) {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  if (isOpen === undefined) {
    isOpen = !sidebar.classList.contains('sidebar-open');
  }

  if (isOpen) {
    sidebar.classList.add('sidebar-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('sidebar-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// Navigation Router
window.navigateTo = function(viewName, options = {}) {
  window.currentView = viewName;

  // Auto-close mobile sidebar if open
  window.toggleMobileSidebar(false);

  // Update active sidebar link
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    }
  });

  // Update mobile bottom nav active button
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-nav') === viewName) {
      btn.classList.add('active');
    }
  });

  // Update header title
  const titleEl = document.getElementById('top-page-title');
  const titleMap = {
    dashboard: '📊 Workshop Dashboard',
    billing: '🧾 Billing & Invoicing (POS)',
    invoices: '📋 Bills & Invoices Register',
    inventory: '📦 Stock & Spare Parts Inventory',
    customers: '🏍️ Customers & Vehicle Service History',
    reports: '📈 Sales Reports & Audit Ledger',
    settings: '⚙️ Workshop Settings & Services'
  };
  if (titleEl) {
    titleEl.textContent = titleMap[viewName] || 'Koshi Motorcycle Workshop';
  }

  const container = document.getElementById('app-view-container');
  if (!container) return;

  switch (viewName) {
    case 'dashboard':
      window.DashboardView.render(container);
      break;
    case 'billing':
      window.BillingView.render(container);
      break;
    case 'invoices':
      window.InvoicesView.render(container);
      break;
    case 'inventory':
      window.InventoryView.render(container, options);
      break;
    case 'customers':
      window.CustomersView.render(container);
      break;
    case 'ledger':
      window.ReportsView.render(container, { tab: 'ledger' });
      break;
    case 'reports':
      window.ReportsView.render(container, options);
      break;
    case 'settings':
      window.SettingsView.render(container);
      break;
    default:
      window.DashboardView.render(container);
  }

  updateLowStockBadge();
};

// Toast Notifications
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span style="flex: 1;">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// =============================================================================
// MODAL HANDLERS
// =============================================================================

// Close any open modal
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.classList.remove('print-active');
  }
};

// -----------------------------------------------------------------------------
// 1. PRINT INVOICE MODAL (A4 & POS 80mm THERMAL RECEIPT)
// -----------------------------------------------------------------------------
window.viewInvoiceDetail = async function(invoiceId) {
  try {
    const res = await window.api.getInvoiceDetail(invoiceId);
    window.openPrintModal(res.data);
  } catch (err) {
    window.showToast(`Error loading invoice: ${err.message}`, 'error');
  }
};

window.openPrintModal = function(invoiceData) {
  const modal = document.getElementById('print-invoice-modal');
  const printBody = document.getElementById('print-modal-content');
  if (!modal || !printBody) return;

  window.currentInvoiceData = invoiceData;
  window.renderInvoicePaper('a4');

  modal.classList.add('active');
  modal.classList.add('print-active');
};

window.renderInvoicePaper = function(format = 'a4') {
  const printBody = document.getElementById('print-modal-content');
  const inv = window.currentInvoiceData;
  if (!inv || !printBody) return;

  const w = inv.workshop || window.workshopSettings || {
    workshop_name: 'Koshi Motorcycle Workshop',
    address: 'Main Road, Biratnagar, Koshi Province, Nepal',
    phone: '+977-9800000000',
    pan_vat: 'PAN: 601234567',
    currency: 'Rs.',
    receipt_footer: 'Thank you for choosing Koshi Motorcycle Workshop!'
  };

  const cur = w.currency || 'Rs.';

  if (format === 'thermal') {
    // 80mm POS Thermal Receipt Format
    printBody.innerHTML = `
      <div class="thermal-receipt">
        <div class="center" style="font-weight: 700; font-size: 15px; text-transform: uppercase;">
          ${w.workshop_name}
        </div>
        <div class="center" style="font-size: 11px;">
          ${w.address}<br>
          Tel: ${w.phone}<br>
          ${w.pan_vat || ''}
        </div>
        <div class="dashed-line"></div>
        <div class="center" style="font-weight: 700; font-size: 13px;">CASH / ESTIMATE RECEIPT</div>
        <div class="dashed-line"></div>

        <div class="flex-row"><span>Bill No:</span><strong>${inv.invoice_number}</strong></div>
        <div class="flex-row"><span>Date:</span><span>${inv.date}</span></div>
        <div class="flex-row"><span>Customer:</span><strong>${inv.customer_name}</strong></div>
        ${inv.customer_phone ? `<div class="flex-row"><span>Phone:</span><span>${inv.customer_phone}</span></div>` : ''}
        <div class="flex-row"><span>Bike Reg:</span><strong>${inv.vehicle_plate}</strong></div>
        ${inv.vehicle_model ? `<div class="flex-row"><span>Model:</span><span>${inv.vehicle_model}</span></div>` : ''}
        ${inv.odometer_km ? `<div class="flex-row"><span>Odometer:</span><span>${inv.odometer_km} KM</span></div>` : ''}
        ${inv.mechanic_name ? `<div class="flex-row"><span>Mechanic:</span><span>${inv.mechanic_name}</span></div>` : ''}

        <div class="dashed-line"></div>
        <div class="flex-row" style="font-weight: 700;">
          <span style="flex: 2;">ITEM</span>
          <span style="flex: 0.6; text-align: center;">QTY</span>
          <span style="flex: 1; text-align: right;">AMOUNT</span>
        </div>
        <div class="dashed-line"></div>

        ${(inv.items || []).map(it => `
          <div class="flex-row" style="margin-bottom: 3px;">
            <span style="flex: 2;">${it.item_name}</span>
            <span style="flex: 0.6; text-align: center;">${it.quantity}</span>
            <span style="flex: 1; text-align: right;">${cur} ${it.total_price}</span>
          </div>
        `).join('')}

        <div class="dashed-line"></div>
        <div class="flex-row"><span>Parts Subtotal:</span><span>${cur} ${inv.parts_subtotal}</span></div>
        <div class="flex-row"><span>Labor Subtotal:</span><span>${cur} ${inv.labor_subtotal}</span></div>
        ${inv.discount_amount > 0 ? `<div class="flex-row"><span>Discount:</span><span>-${cur} ${inv.discount_amount}</span></div>` : ''}
        ${inv.tax_amount > 0 ? `<div class="flex-row"><span>VAT (13%):</span><span>${cur} ${inv.tax_amount}</span></div>` : ''}
        
        <div class="dashed-line"></div>
        <div class="flex-row" style="font-size: 14px; font-weight: 800;">
          <span>GRAND TOTAL:</span>
          <span>${cur} ${inv.grand_total}</span>
        </div>
        <div class="flex-row"><span>Paid (${inv.payment_method}):</span><span>${cur} ${inv.paid_amount}</span></div>
        ${inv.due_amount > 0 ? `
          <div class="flex-row" style="font-weight: 700; color: #dc2626;">
            <span>REMAINING DUE:</span>
            <span>${cur} ${inv.due_amount}</span>
          </div>
        ` : ''}

        <div class="dashed-line"></div>
        ${inv.next_service_km ? `
          <div class="center" style="font-weight: 700; margin: 4px 0;">
            Next Service Due at: ${inv.next_service_km} KM
          </div>
        ` : ''}
        <div class="center" style="font-size: 10px; margin-top: 6px;">
          ${w.receipt_footer || 'Thank you for your visit!'}<br>
          Drive Safely! Wear Helmet!
        </div>
      </div>
    `;
  } else {
    // Standard Professional A4 Workshop Invoice Format
    printBody.innerHTML = `
      <div class="invoice-paper">
        <!-- Header -->
        <div class="invoice-header-block">
          <h1>${w.workshop_name}</h1>
          <div style="font-size: 0.9rem; font-weight: 500; color: #334155; margin-top: 0.2rem;">
            ${w.tagline || 'Complete Two-Wheeler Servicing & Genuine Spare Parts'}
          </div>
          <div style="font-size: 0.85rem; color: #475569; margin-top: 0.35rem;">
            ${w.address} | Phone: <strong>${w.phone}</strong> ${w.email ? `| Email: ${w.email}` : ''}
          </div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #0f172a; margin-top: 0.2rem;">
            ${w.pan_vat || ''}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <span style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Tax / Cash Invoice</span>
            <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: var(--primary);">
              ${inv.invoice_number}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.85rem;">Date: <strong>${inv.date}</strong></div>
            <div style="margin-top: 0.25rem;">
              <span class="badge ${inv.payment_status === 'PAID' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.85rem; padding: 0.3rem 0.75rem;">
                ${inv.payment_status} (${inv.payment_method})
              </span>
            </div>
          </div>
        </div>

        <!-- Customer & Vehicle Meta Grid -->
        <div class="invoice-meta-grid">
          <div class="invoice-meta-col">
            <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">CUSTOMER DETAILS</div>
            <p><strong>Name:</strong> ${inv.customer_name}</p>
            <p><strong>Phone:</strong> ${inv.customer_phone || 'N/A'}</p>
            ${inv.customer_address ? `<p><strong>Address:</strong> ${inv.customer_address}</p>` : ''}
          </div>

          <div class="invoice-meta-col">
            <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">MOTORCYCLE SPECS</div>
            <p><strong>Number Plate:</strong> <span style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${inv.vehicle_plate}</span></p>
            <p><strong>Model:</strong> ${inv.vehicle_model || 'Motorcycle'}</p>
            <p><strong>Odometer:</strong> ${inv.odometer_km ? `${inv.odometer_km} KM` : 'N/A'} ${inv.mechanic_name ? `| <strong>Mechanic:</strong> ${inv.mechanic_name}` : ''}</p>
          </div>
        </div>

        ${inv.service_notes ? `
          <div style="margin-bottom: 1.25rem; font-size: 0.85rem; background-color: #f1f5f9; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
            <strong>Service Notes:</strong> ${inv.service_notes}
          </div>
        ` : ''}

        <!-- Itemized Table -->
        <table class="data-table" style="margin-bottom: 1.5rem; border: 1px solid var(--border);">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="width: 40px; text-align: center;">#</th>
              <th>Description / Spare Part</th>
              <th>Type / SKU</th>
              <th style="text-align: center; width: 70px;">Qty</th>
              <th style="text-align: right; width: 110px;">Rate (${cur})</th>
              <th style="text-align: right; width: 120px;">Amount (${cur})</th>
            </tr>
          </thead>
          <tbody>
            ${(inv.items || []).map((it, idx) => `
              <tr>
                <td style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">${idx + 1}</td>
                <td>
                  <strong>${it.item_name}</strong>
                </td>
                <td>
                  <span class="badge ${it.item_type === 'PART' ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.72rem;">
                    ${it.item_type === 'PART' ? `Part: ${it.part_number || 'N/A'}` : 'Labor / Service'}
                  </span>
                </td>
                <td style="text-align: center; font-weight: 600;">${it.quantity}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${Number(it.unit_price).toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700; font-family: var(--font-mono);">${Number(it.total_price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals & Payment Summary -->
        <div style="display: flex; justify-content: space-between; gap: 2rem; align-items: flex-start; margin-bottom: 2rem;">
          <div style="flex: 1; font-size: 0.84rem; color: #475569; background-color: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
            <div style="font-weight: 700; margin-bottom: 0.35rem; color: var(--text-main);">Maintenance Advisory:</div>
            ${inv.next_service_km ? `<div>Recommended Next Service: <strong>${inv.next_service_km} KM</strong></div>` : ''}
            <div>• Always check engine oil levels every 1,000 km.</div>
            <div>• Maintain correct tire pressure for safety & mileage.</div>
            <div style="margin-top: 0.5rem; font-style: italic; color: #64748b;">${w.receipt_footer || ''}</div>
          </div>

          <div style="width: 320px; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; color: var(--text-muted);">
              <span>Parts Subtotal:</span>
              <span>${cur} ${Number(inv.parts_subtotal).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; color: var(--text-muted);">
              <span>Labor Subtotal:</span>
              <span>${cur} ${Number(inv.labor_subtotal).toFixed(2)}</span>
            </div>
            ${inv.discount_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; color: var(--danger);">
                <span>Discount:</span>
                <span>-${cur} ${Number(inv.discount_amount).toFixed(2)}</span>
              </div>
            ` : ''}
            ${inv.tax_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0;">
                <span>VAT (${inv.tax_rate}%):</span>
                <span>${cur} ${Number(inv.tax_amount).toFixed(2)}</span>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; padding: 0.65rem 0; border-top: 2px solid var(--border); border-bottom: 2px solid var(--border); font-size: 1.25rem; font-weight: 800; color: var(--primary);">
              <span>Grand Total:</span>
              <span>${cur} ${Number(inv.grand_total).toFixed(2)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; font-weight: 600; color: var(--success-text);">
              <span>Paid Amount:</span>
              <span>${cur} ${Number(inv.paid_amount).toFixed(2)}</span>
            </div>

            ${inv.due_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; font-weight: 700; color: var(--danger);">
                <span>Balance Due:</span>
                <span>${cur} ${Number(inv.due_amount).toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Signature Blocks -->
        <div style="display: flex; justify-content: space-between; padding-top: 3.5rem; border-top: 1px dashed var(--border); text-align: center; font-size: 0.85rem;">
          <div style="width: 200px;">
            <div style="border-top: 1px solid #475569; padding-top: 0.35rem;">Customer Signature</div>
          </div>
          <div style="width: 200px;">
            <div style="border-top: 1px solid #475569; padding-top: 0.35rem;">Authorized Workshop Seal & Sign</div>
          </div>
        </div>
      </div>
    `;
  }
};

window.printInvoice = function() {
  window.print();
};

// -----------------------------------------------------------------------------
// 2. ADD SPARE PART MODAL
// -----------------------------------------------------------------------------
window.openAddPartModal = function() {
  const modal = document.getElementById('add-part-modal');
  if (modal) {
    document.getElementById('add-part-form').reset();
    document.getElementById('add-part-sku').value = 'PART-' + Date.now().toString().slice(-5);
    modal.classList.add('active');
  }
};

window.submitAddPart = async function(e) {
  e.preventDefault();
  const payload = {
    part_number: document.getElementById('add-part-sku').value.trim(),
    name: document.getElementById('add-part-name').value.trim(),
    category: document.getElementById('add-part-category').value.trim(),
    brand: document.getElementById('add-part-brand').value.trim(),
    compatible_models: document.getElementById('add-part-compat').value.trim(),
    unit: document.getElementById('add-part-unit').value.trim() || 'pcs',
    cost_price: parseFloat(document.getElementById('add-part-cost').value) || 0,
    selling_price: parseFloat(document.getElementById('add-part-sell').value) || 0,
    stock_quantity: parseInt(document.getElementById('add-part-stock').value, 10) || 0,
    min_stock_alert: parseInt(document.getElementById('add-part-alert').value, 10) || 5,
    location_rack: document.getElementById('add-part-rack').value.trim()
  };

  try {
    const res = await window.api.createInventoryItem(payload);
    window.showToast(`Spare part '${res.data.name}' added successfully!`, 'success');
    window.closeModal('add-part-modal');
    if (window.currentView === 'inventory') {
      window.InventoryView.render(document.getElementById('app-view-container'));
    } else {
      updateLowStockBadge();
    }
  } catch (err) {
    window.showToast(`Failed to add part: ${err.message}`, 'error');
  }
};

// -----------------------------------------------------------------------------
// 3. QUICK RESTOCK MODAL
// -----------------------------------------------------------------------------
window.openRestockModal = function(id, name, currentStock, currentCost, unit) {
  const modal = document.getElementById('restock-modal');
  if (!modal) return;

  document.getElementById('restock-part-id').value = id;
  document.getElementById('restock-part-name').textContent = name;
  document.getElementById('restock-current-stock').textContent = `${currentStock} ${unit}`;
  document.getElementById('restock-cost').value = currentCost;
  document.getElementById('restock-qty').value = '';
  document.getElementById('restock-supplier').value = '';
  document.getElementById('restock-ref').value = '';

  modal.classList.add('active');
  setTimeout(() => document.getElementById('restock-qty').focus(), 100);
};

window.submitRestock = async function(e) {
  e.preventDefault();
  const id = document.getElementById('restock-part-id').value;
  const qty = parseInt(document.getElementById('restock-qty').value, 10);
  const cost = document.getElementById('restock-cost').value;
  const supplier = document.getElementById('restock-supplier').value.trim();
  const ref = document.getElementById('restock-ref').value.trim();

  if (!qty || qty <= 0) {
    window.showToast('Please enter a valid restock quantity', 'error');
    return;
  }

  try {
    const res = await window.api.restockInventoryItem(id, {
      quantity: qty,
      cost_price: cost,
      supplier_name: supplier,
      reference_id: ref
    });

    window.showToast(res.message, 'success');
    window.closeModal('restock-modal');

    if (window.currentView === 'inventory') {
      window.InventoryView.render(document.getElementById('app-view-container'));
    } else if (window.currentView === 'dashboard') {
      window.DashboardView.render(document.getElementById('app-view-container'));
    } else {
      updateLowStockBadge();
    }
  } catch (err) {
    window.showToast(`Restock failed: ${err.message}`, 'error');
  }
};

// -----------------------------------------------------------------------------
// 4. STOCK ADJUSTMENT MODAL
// -----------------------------------------------------------------------------
window.openAdjustModal = function(id, name, currentStock, unit) {
  const modal = document.getElementById('adjust-modal');
  if (!modal) return;

  document.getElementById('adjust-part-id').value = id;
  document.getElementById('adjust-part-name').textContent = name;
  document.getElementById('adjust-current-stock').textContent = `${currentStock} ${unit}`;
  document.getElementById('adjust-qty').value = '';
  document.getElementById('adjust-reason').value = '';

  modal.classList.add('active');
};

window.submitAdjustment = async function(e) {
  e.preventDefault();
  const id = document.getElementById('adjust-part-id').value;
  const type = document.getElementById('adjust-type').value;
  const qty = parseInt(document.getElementById('adjust-qty').value, 10);
  const reason = document.getElementById('adjust-reason').value.trim();

  if (isNaN(qty) || qty < 0) {
    window.showToast('Please enter a valid quantity', 'error');
    return;
  }

  try {
    const res = await window.api.adjustInventoryItem(id, {
      adjustment_type: type,
      quantity: qty,
      reason: reason
    });

    window.showToast(res.message, 'success');
    window.closeModal('adjust-modal');
    if (window.currentView === 'inventory') {
      window.InventoryView.render(document.getElementById('app-view-container'));
    }
  } catch (err) {
    window.showToast(`Adjustment failed: ${err.message}`, 'error');
  }
};

// -----------------------------------------------------------------------------
// 5. EDIT PART MODAL
// -----------------------------------------------------------------------------
window.openEditPartModal = async function(id) {
  try {
    const res = await window.api.getInventoryItem(id);
    const item = res.data;
    const modal = document.getElementById('edit-part-modal');
    if (!modal) return;

    document.getElementById('edit-part-id').value = item.id;
    document.getElementById('edit-part-sku').value = item.part_number;
    document.getElementById('edit-part-name').value = item.name;
    document.getElementById('edit-part-category').value = item.category;
    document.getElementById('edit-part-brand').value = item.brand || '';
    document.getElementById('edit-part-compat').value = item.compatible_models || '';
    document.getElementById('edit-part-cost').value = item.cost_price;
    document.getElementById('edit-part-sell').value = item.selling_price;
    document.getElementById('edit-part-alert').value = item.min_stock_alert;
    document.getElementById('edit-part-rack').value = item.location_rack || '';

    modal.classList.add('active');
  } catch (err) {
    window.showToast(`Error: ${err.message}`, 'error');
  }
};

window.submitEditPart = async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-part-id').value;
  const payload = {
    part_number: document.getElementById('edit-part-sku').value.trim(),
    name: document.getElementById('edit-part-name').value.trim(),
    category: document.getElementById('edit-part-category').value.trim(),
    brand: document.getElementById('edit-part-brand').value.trim(),
    compatible_models: document.getElementById('edit-part-compat').value.trim(),
    cost_price: parseFloat(document.getElementById('edit-part-cost').value) || 0,
    selling_price: parseFloat(document.getElementById('edit-part-sell').value) || 0,
    min_stock_alert: parseInt(document.getElementById('edit-part-alert').value, 10) || 5,
    location_rack: document.getElementById('edit-part-rack').value.trim()
  };

  try {
    await window.api.updateInventoryItem(id, payload);
    window.showToast('Part updated successfully', 'success');
    window.closeModal('edit-part-modal');
    if (window.currentView === 'inventory') {
      window.InventoryView.render(document.getElementById('app-view-container'));
    }
  } catch (err) {
    window.showToast(`Error: ${err.message}`, 'error');
  }
};

// -----------------------------------------------------------------------------
// 6. SETTLE CREDIT PAYMENT MODAL
// -----------------------------------------------------------------------------
window.openSettlePaymentModal = function(invoiceId, invoiceNumber, customerName, dueAmount) {
  const modal = document.getElementById('settle-payment-modal');
  if (!modal) return;

  const cur = window.workshopSettings?.currency || 'Rs.';
  document.getElementById('settle-inv-id').value = invoiceId;
  document.getElementById('settle-inv-num').textContent = invoiceNumber;
  document.getElementById('settle-cust-name').textContent = customerName;
  document.getElementById('settle-due-display').textContent = `${cur} ${dueAmount}`;
  document.getElementById('settle-amount').value = dueAmount;
  document.getElementById('settle-amount').max = dueAmount;
  document.getElementById('settle-notes').value = '';

  modal.classList.add('active');
};

window.submitSettlePayment = async function(e) {
  e.preventDefault();
  const id = document.getElementById('settle-inv-id').value;
  const amount = parseFloat(document.getElementById('settle-amount').value) || 0;
  const method = document.getElementById('settle-method').value;
  const note = document.getElementById('settle-notes').value.trim();

  if (amount <= 0) {
    window.showToast('Please enter a valid payment amount', 'error');
    return;
  }

  try {
    const res = await window.api.recordInvoicePayment(id, {
      amount: amount,
      payment_method: method,
      reference_note: note
    });

    window.showToast(res.message, 'success');
    window.closeModal('settle-payment-modal');

    if (window.currentView === 'invoices') {
      window.InvoicesView.render(document.getElementById('app-view-container'));
    } else if (window.currentView === 'dashboard') {
      window.DashboardView.render(document.getElementById('app-view-container'));
    }
  } catch (err) {
    window.showToast(`Payment recording failed: ${err.message}`, 'error');
  }
};

