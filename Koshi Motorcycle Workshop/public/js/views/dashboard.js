// Dashboard View Component
window.DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading dashboard metrics...</div>
      </div>
    `;

    try {
      const res = await window.api.getDashboardStats();
      const stats = res.data;
      const cur = window.workshopSettings?.currency || 'Rs.';

      const html = `
        <!-- Quick Action Bar -->
        <div class="card" style="padding: 1.15rem 1.5rem; background: linear-gradient(135deg, #1e3a8a, #1e40af); color: #fff; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 700;">Welcome to Koshi Motorcycle Workshop</h2>
              <p style="font-size: 0.85rem; opacity: 0.9; margin-top: 0.2rem;">Quickly generate bills, track spare parts inventory, and manage vehicle service records.</p>
            </div>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="quick-action-btn btn-accent" onclick="window.navigateTo('billing')">
                <span>🧾</span> New Bill (POS)
              </button>
              <button class="quick-action-btn btn-secondary" style="color: #0f172a;" onclick="window.openAddPartModal()">
                <span>📦</span> Add Spare Part
              </button>
              <button class="quick-action-btn btn-secondary" style="color: #0f172a;" onclick="window.navigateTo('inventory')">
                <span>🔍</span> View Stock
              </button>
            </div>
          </div>
        </div>

        <!-- 4 Top Stat Cards -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-info">
              <h3>Today's Billing</h3>
              <div class="stat-value">${cur} ${Number(stats.today.total_sales).toLocaleString()}</div>
              <div class="stat-sub">
                <strong>${stats.today.invoice_count}</strong> bills generated today
              </div>
            </div>
            <div class="stat-icon">💰</div>
          </div>

          <div class="stat-card green">
            <div class="stat-info">
              <h3>This Month's Revenue</h3>
              <div class="stat-value">${cur} ${Number(stats.thisMonth.total_sales).toLocaleString()}</div>
              <div class="stat-sub">
                Collected: <strong>${cur} ${Number(stats.thisMonth.total_collected).toLocaleString()}</strong>
              </div>
            </div>
            <div class="stat-icon">📈</div>
          </div>

          <div class="stat-card orange">
            <div class="stat-info">
              <h3>Inventory Valuation</h3>
              <div class="stat-value">${cur} ${Number(stats.inventory.total_retail_valuation).toLocaleString()}</div>
              <div class="stat-sub">
                Cost: <strong>${cur} ${Number(stats.inventory.total_cost_valuation).toLocaleString()}</strong> (${stats.inventory.total_units} units)
              </div>
            </div>
            <div class="stat-icon">📦</div>
          </div>

          <div class="stat-card ${stats.overallDues.total_due_balance > 0 ? 'red' : 'green'}">
            <div class="stat-info">
              <h3>Customer Credit (Dues)</h3>
              <div class="stat-value" style="color: ${stats.overallDues.total_due_balance > 0 ? 'var(--danger)' : 'var(--success)'};">
                ${cur} ${Number(stats.overallDues.total_due_balance).toLocaleString()}
              </div>
              <div class="stat-sub">
                ${stats.overallDues.unpaid_bills_count} bills with pending dues
              </div>
            </div>
            <div class="stat-icon">⚖️</div>
          </div>
        </div>

        <!-- Low Stock Alerts & Recent Invoices Layout -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
          
          <!-- Low Stock Alert Box -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span style="color: #ef4444;">⚠️</span> Low Stock Alerts (${stats.lowStockItems.length})
              </div>
              <button class="btn-secondary btn-sm" onclick="window.navigateTo('inventory', { status: 'low' })">
                Manage Stock
              </button>
            </div>
            <div>
              ${stats.lowStockItems.length === 0 ? `
                <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                  <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">✅</div>
                  <div style="font-weight: 600;">Stock Levels Healthy!</div>
                  <div style="font-size: 0.82rem;">No items are currently below minimum alert threshold.</div>
                </div>
              ` : `
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Part / Item</th>
                        <th>Rack</th>
                        <th>In Stock</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stats.lowStockItems.map(item => `
                        <tr>
                          <td>
                            <div style="font-weight: 600;">${item.name}</div>
                            <div style="font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-mono);">${item.part_number}</div>
                          </td>
                          <td><span class="badge badge-secondary">${item.location_rack || 'N/A'}</span></td>
                          <td>
                            <span class="badge ${item.stock_quantity === 0 ? 'badge-danger' : 'badge-warning'}">
                              ${item.stock_quantity} ${item.unit || 'pcs'} left
                            </span>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Min: ${item.min_stock_alert}</div>
                          </td>
                          <td>
                            <button class="btn-primary btn-sm" onclick="window.openRestockModal(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.stock_quantity}, ${item.cost_price}, '${item.unit || 'pcs'}')">
                              + Restock
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>

          <!-- Recent Invoices Box -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span>🧾</span> Recent Invoices
              </div>
              <button class="btn-secondary btn-sm" onclick="window.navigateTo('invoices')">
                View All Bills
              </button>
            </div>
            <div>
              ${stats.recentInvoices.length === 0 ? `
                <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                  <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧾</div>
                  <div style="font-weight: 600;">No bills generated yet today</div>
                  <div style="font-size: 0.82rem;">Click "+ New Bill" above to create your first workshop bill!</div>
                </div>
              ` : `
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Bill #</th>
                        <th>Customer / Bike</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stats.recentInvoices.map(inv => `
                        <tr>
                          <td>
                            <div style="font-weight: 700; font-family: var(--font-mono); color: var(--primary);">${inv.invoice_number}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${inv.date}</div>
                          </td>
                          <td>
                            <div style="font-weight: 600;">${inv.customer_name}</div>
                            <div style="font-size: 0.78rem; font-family: var(--font-mono); color: #475569;">🏍️ ${inv.vehicle_plate}</div>
                          </td>
                          <td>
                            <div style="font-weight: 700;">${cur} ${Number(inv.grand_total).toLocaleString()}</div>
                            ${inv.due_amount > 0 ? `<div style="font-size:0.75rem; color:var(--danger);">Due: ${cur} ${Number(inv.due_amount).toLocaleString()}</div>` : ''}
                          </td>
                          <td>
                            <span class="badge ${inv.payment_status === 'PAID' ? 'badge-success' : inv.payment_status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}">
                              ${inv.payment_status}
                            </span>
                          </td>
                          <td>
                            <button class="btn-secondary btn-sm" onclick="window.viewInvoiceDetail(${inv.id})">
                              View / Print
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>

        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--danger); padding: 2rem;">
          <h3>Error loading dashboard</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
};

