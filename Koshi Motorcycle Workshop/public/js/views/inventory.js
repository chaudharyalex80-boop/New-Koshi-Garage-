// Inventory Management View Component
window.InventoryView = {
  state: {
    items: [],
    categories: [],
    currentCategory: 'ALL',
    currentStatus: 'ALL',
    searchQuery: '',
    valuation: null
  },

  async render(container, options = {}) {
    if (options.status) {
      this.state.currentStatus = options.status;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading Spare Parts Inventory...</div>
      </div>
    `;

    try {
      const [itemsRes, catRes, valRes] = await Promise.all([
        window.api.getInventory({
          category: this.state.currentCategory,
          status: this.state.currentStatus === 'ALL' ? '' : this.state.currentStatus,
          search: this.state.searchQuery
        }),
        window.api.getCategories(),
        window.api.getStockValuation()
      ]);

      this.state.items = itemsRes.data || [];
      this.state.categories = catRes.data || [];
      this.state.valuation = valRes.data || null;

      this.renderInventoryUI(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger); text-align:center; padding:2rem;">
          <h3>Failed to load inventory</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  renderInventoryUI(container) {
    const cur = window.workshopSettings?.currency || 'Rs.';
    const totals = this.state.valuation?.totals || {
      total_distinct_items: this.state.items.length,
      total_units: 0,
      grand_cost_value: 0,
      grand_retail_value: 0,
      grand_potential_profit: 0
    };

    const html = `
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">
            📦 Spare Parts & Inventory Stock Management
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Real-time stock tracking, reorder alerts, supplier restocks, and warehouse locations.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button class="quick-action-btn btn-secondary" onclick="window.navigateTo('ledger')">
            <span>📜</span> Stock Movement Ledger
          </button>
          <button class="quick-action-btn btn-primary" onclick="window.openAddPartModal()">
            <span>+</span> Add New Spare Part
          </button>
        </div>
      </div>

      <!-- Inventory Metrics Bar -->
      <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.25rem;">
        <div class="stat-card blue" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Total Items</h3>
            <div class="stat-value" style="font-size: 1.45rem;">${totals.total_distinct_items} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">types</span></div>
            <div class="stat-sub"><strong>${totals.total_units}</strong> total stock units</div>
          </div>
        </div>

        <div class="stat-card orange" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Cost Valuation</h3>
            <div class="stat-value" style="font-size: 1.45rem;">${cur} ${Number(totals.grand_cost_value).toLocaleString()}</div>
            <div class="stat-sub">Warehouse purchase investment</div>
          </div>
        </div>

        <div class="stat-card green" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Retail Selling Value</h3>
            <div class="stat-value" style="font-size: 1.45rem;">${cur} ${Number(totals.grand_retail_value).toLocaleString()}</div>
            <div class="stat-sub">Potential retail turnover</div>
          </div>
        </div>

        <div class="stat-card purple" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Expected Profit</h3>
            <div class="stat-value" style="font-size: 1.45rem; color: #7c3aed;">
              ${cur} ${Number(totals.grand_potential_profit).toLocaleString()}
            </div>
            <div class="stat-sub">
              Margin: <strong>${totals.grand_retail_value > 0 ? ((totals.grand_potential_profit / totals.grand_retail_value) * 100).toFixed(1) : 0}%</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Search & Filters Card -->
      <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
        <div class="filter-bar" style="margin-bottom: 0.85rem;">
          <!-- Search box -->
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" id="inv-search-input" class="form-control" placeholder="Search part name, SKU, brand, model, rack..." 
                   value="${this.state.searchQuery}" oninput="window.InventoryView.onSearch(this.value)">
          </div>

          <!-- Stock Status Filter Tabs -->
          <div class="pill-group">
            <button class="pill-btn ${this.state.currentStatus === 'ALL' ? 'active' : ''}" onclick="window.InventoryView.filterStatus('ALL')">All Stock</button>
            <button class="pill-btn ${this.state.currentStatus === 'low' ? 'active' : ''}" style="${this.state.currentStatus === 'low' ? 'color:#d97706;' : ''}" onclick="window.InventoryView.filterStatus('low')">⚠️ Low Stock Alerts</button>
            <button class="pill-btn ${this.state.currentStatus === 'out' ? 'active' : ''}" style="${this.state.currentStatus === 'out' ? 'color:#dc2626;' : ''}" onclick="window.InventoryView.filterStatus('out')">🔴 Out of Stock</button>
            <button class="pill-btn ${this.state.currentStatus === 'in' ? 'active' : ''}" onclick="window.InventoryView.filterStatus('in')">🟢 In Stock</button>
          </div>
        </div>

        <!-- Category Horizontal Filter Tabs -->
        <div style="display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.35rem; align-items: center;">
          <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-right: 0.25rem;">Category:</span>
          <button class="pill-btn ${this.state.currentCategory === 'ALL' ? 'active' : ''}" onclick="window.InventoryView.filterCategory('ALL')">All Categories</button>
          ${this.state.categories.map(cat => `
            <button class="pill-btn ${this.state.currentCategory === cat ? 'active' : ''}" onclick="window.InventoryView.filterCategory('${cat.replace(/'/g, "\\'")}')">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Parts Inventory Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 140px;">SKU / Part #</th>
                <th>Part Description & Compatibility</th>
                <th>Category / Brand</th>
                <th style="text-align: right;">Cost Price</th>
                <th style="text-align: right;">Selling Price</th>
                <th style="text-align: center;">Stock Status</th>
                <th>Rack Location</th>
                <th style="text-align: right; width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.state.items.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                    <div style="font-weight: 600;">No spare parts match your filters</div>
                    <div style="font-size: 0.82rem; margin-top: 0.25rem;">Try adjusting search keyword or resetting category/status filters.</div>
                  </td>
                </tr>
              ` : this.state.items.map(item => {
                const margin = item.selling_price > 0 
                  ? (((item.selling_price - item.cost_price) / item.selling_price) * 100).toFixed(0) 
                  : 0;

                let stockBadgeClass = 'badge-success';
                let stockStatusText = `${item.stock_quantity} ${item.unit || 'pcs'}`;
                if (item.stock_quantity <= 0) {
                  stockBadgeClass = 'badge-danger';
                  stockStatusText = `OUT OF STOCK`;
                } else if (item.stock_quantity <= item.min_stock_alert) {
                  stockBadgeClass = 'badge-warning';
                  stockStatusText = `LOW: ${item.stock_quantity} ${item.unit || 'pcs'}`;
                }

                return `
                  <tr>
                    <td>
                      <span style="font-family: var(--font-mono); font-weight: 700; color: var(--primary); font-size: 0.84rem;">
                        ${item.part_number}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--text-main);">${item.name}</div>
                      ${item.compatible_models ? `
                        <div style="font-size: 0.76rem; color: var(--text-muted);">
                          🏍️ ${item.compatible_models}
                        </div>
                      ` : ''}
                    </td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 500;">${item.category}</div>
                      <div style="font-size: 0.74rem; color: var(--text-muted);">${item.brand || 'Generic'}</div>
                    </td>
                    <td style="text-align: right; font-family: var(--font-mono); color: var(--text-muted);">
                      ${cur} ${Number(item.cost_price).toFixed(2)}
                    </td>
                    <td style="text-align: right;">
                      <div style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main);">
                        ${cur} ${Number(item.selling_price).toFixed(2)}
                      </div>
                      <div style="font-size: 0.72rem; color: var(--success-text); font-weight: 600;">
                        +${margin}% margin
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <span class="badge ${stockBadgeClass}">
                        ${stockStatusText}
                      </span>
                      <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                        Alert at: ${item.min_stock_alert}
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-secondary" style="font-family: var(--font-mono);">
                        ${item.location_rack || 'Main Rack'}
                      </span>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn-primary btn-sm" onclick="window.openRestockModal(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.stock_quantity}, ${item.cost_price}, '${item.unit || 'pcs'}')" title="Quick Restock Stock-In">
                          + Restock
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.openEditPartModal(${item.id})" title="Edit Details">
                          ✏️
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.openAdjustModal(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.stock_quantity}, '${item.unit || 'pcs'}')" title="Adjust Stock">
                          ⚖️
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  onSearch(val) {
    this.state.searchQuery = val;
    this.refreshList();
  },

  filterStatus(status) {
    this.state.currentStatus = status;
    this.refreshList();
  },

  filterCategory(cat) {
    this.state.currentCategory = cat;
    this.refreshList();
  },

  async refreshList() {
    try {
      const res = await window.api.getInventory({
        category: this.state.currentCategory,
        status: this.state.currentStatus === 'ALL' ? '' : this.state.currentStatus,
        search: this.state.searchQuery
      });
      this.state.items = res.data || [];
      const container = document.getElementById('app-view-container');
      this.renderInventoryUI(container);
    } catch (err) {
      window.showToast(`Error updating inventory: ${err.message}`, 'error');
    }
  }
};

