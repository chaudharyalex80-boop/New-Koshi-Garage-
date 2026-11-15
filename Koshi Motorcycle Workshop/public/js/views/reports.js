// Reports & Stock Audit Ledger View Component
window.ReportsView = {
  state: {
    activeTab: 'ledger', // 'ledger' | 'sales' | 'valuation'
    ledgerItems: [],
    salesData: null,
    valuationData: null,
    filterType: 'ALL'
  },

  async render(container, options = {}) {
    if (options.tab) {
      this.state.activeTab = options.tab;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading Analytics & Ledger...</div>
      </div>
    `;

    try {
      const [ledgerRes, salesRes, valRes] = await Promise.all([
        window.api.getStockLedger({ type: this.state.filterType }),
        window.api.getSalesReport(30),
        window.api.getStockValuation()
      ]);

      this.state.ledgerItems = ledgerRes.data || [];
      this.state.salesData = salesRes.data || null;
      this.state.valuationData = valRes.data || null;

      this.renderUI(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger); text-align:center; padding:2rem;">
          <h3>Failed to load reports</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  renderUI(container) {
    const cur = window.workshopSettings?.currency || 'Rs.';

    const html = `
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">
            📈 Inventory Audit Ledger & Financial Reports
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Audit stock transactions, analyze 30-day revenue trends, and evaluate inventory margins.
          </p>
        </div>

        <!-- Tab Pills -->
        <div class="pill-group">
          <button class="pill-btn ${this.state.activeTab === 'ledger' ? 'active' : ''}" onclick="window.ReportsView.switchTab('ledger')">
            📜 Stock Audit Ledger
          </button>
          <button class="pill-btn ${this.state.activeTab === 'sales' ? 'active' : ''}" onclick="window.ReportsView.switchTab('sales')">
            📊 Sales & Revenue Trends
          </button>
          <button class="pill-btn ${this.state.activeTab === 'valuation' ? 'active' : ''}" onclick="window.ReportsView.switchTab('valuation')">
            💰 Category Stock Valuation
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div id="reports-tab-content">
        ${this.state.activeTab === 'ledger' ? this.renderLedgerTab(cur) : ''}
        ${this.state.activeTab === 'sales' ? this.renderSalesTab(cur) : ''}
        ${this.state.activeTab === 'valuation' ? this.renderValuationTab(cur) : ''}
      </div>
    `;

    container.innerHTML = html;
  },

  renderLedgerTab(cur) {
    return `
      <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div style="font-weight: 600; font-size: 0.95rem;">
            Real-time Inventory Audit Trail (${this.state.ledgerItems.length} transactions)
          </div>

          <div class="pill-group">
            <button class="pill-btn ${this.state.filterType === 'ALL' ? 'active' : ''}" onclick="window.ReportsView.filterLedger('ALL')">All Types</button>
            <button class="pill-btn ${this.state.filterType === 'BILL_SALE' ? 'active' : ''}" onclick="window.ReportsView.filterLedger('BILL_SALE')">Bill Sales</button>
            <button class="pill-btn ${this.state.filterType === 'PURCHASE_RESTOCK' ? 'active' : ''}" onclick="window.ReportsView.filterLedger('PURCHASE_RESTOCK')">Restocks / Purchases</button>
            <button class="pill-btn ${this.state.filterType === 'ADJUSTMENT_ADD' ? 'active' : ''}" onclick="window.ReportsView.filterLedger('ADJUSTMENT_ADD')">Adjustments</button>
            <button class="pill-btn ${this.state.filterType === 'RETURN' ? 'active' : ''}" onclick="window.ReportsView.filterLedger('RETURN')">Returns / Voids</button>
          </div>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Part Description</th>
                <th>SKU</th>
                <th style="text-align: center;">Event Type</th>
                <th style="text-align: center;">Change Qty</th>
                <th style="text-align: center;">Stock Shift</th>
                <th>Reference / Invoice #</th>
                <th>Notes / Party</th>
              </tr>
            </thead>
            <tbody>
              ${this.state.ledgerItems.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No stock transaction records match this filter.
                  </td>
                </tr>
              ` : this.state.ledgerItems.map(row => {
                let badgeClass = 'badge-primary';
                let typeText = row.type;
                if (row.type === 'BILL_SALE') {
                  badgeClass = 'badge-danger';
                  typeText = 'Bill Sale';
                } else if (row.type === 'PURCHASE_RESTOCK') {
                  badgeClass = 'badge-success';
                  typeText = 'Restock In';
                } else if (row.type === 'RETURN') {
                  badgeClass = 'badge-warning';
                  typeText = 'Return Void';
                } else if (row.type.startsWith('ADJUSTMENT')) {
                  badgeClass = 'badge-secondary';
                  typeText = 'Adjustment';
                }

                return `
                  <tr>
                    <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                      ${row.created_at}
                    </td>
                    <td>
                      <div style="font-weight: 600;">${row.part_name}</div>
                    </td>
                    <td>
                      <span style="font-family: var(--font-mono); font-weight: 600; color: var(--primary); font-size: 0.8rem;">
                        ${row.part_number}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span class="badge ${badgeClass}">${typeText}</span>
                    </td>
                    <td style="text-align: center; font-weight: 700; font-family: var(--font-mono); color: ${row.quantity < 0 ? 'var(--danger)' : 'var(--success-text)'};">
                      ${row.quantity > 0 ? '+' : ''}${row.quantity} ${row.unit || 'pcs'}
                    </td>
                    <td style="text-align: center; font-family: var(--font-mono); font-size: 0.82rem;">
                      ${row.previous_stock} ➔ <strong style="color: var(--text-main);">${row.new_stock}</strong>
                    </td>
                    <td>
                      <span style="font-family: var(--font-mono); font-weight: 600; color: #334155;">
                        ${row.reference_id || 'N/A'}
                      </span>
                    </td>
                    <td style="font-size: 0.82rem; color: var(--text-muted);">
                      ${row.supplier_name ? `<strong>${row.supplier_name}</strong> - ` : ''}${row.notes || ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderSalesTab(cur) {
    const daily = this.state.salesData?.dailySummary || [];
    const topParts = this.state.salesData?.topParts || [];
    const topServices = this.state.salesData?.topServices || [];

    return `
      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 1.5rem; align-items: start;">
        
        <!-- Left: Daily Breakdown Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="card-header" style="padding: 1rem 1.25rem; margin-bottom: 0;">
            <div class="card-title">📅 Daily Revenue Breakdown (Past 30 Days)</div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="text-align: center;">Bills</th>
                  <th style="text-align: right;">Parts Sales</th>
                  <th style="text-align: right;">Labor Sales</th>
                  <th style="text-align: right;">Total Revenue</th>
                  <th style="text-align: right;">Collected</th>
                </tr>
              </thead>
              <tbody>
                ${daily.length === 0 ? `
                  <tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No sales recorded yet.</td></tr>
                ` : daily.map(d => `
                  <tr>
                    <td><strong>${d.date}</strong></td>
                    <td style="text-align: center;"><span class="badge badge-secondary">${d.total_bills}</span></td>
                    <td style="text-align: right;">${cur} ${Number(d.parts_revenue).toFixed(2)}</td>
                    <td style="text-align: right;">${cur} ${Number(d.labor_revenue).toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--primary);">
                      ${cur} ${Number(d.total_revenue).toFixed(2)}
                    </td>
                    <td style="text-align: right; color: var(--success-text); font-weight: 600;">
                      ${cur} ${Number(d.total_collected).toFixed(2)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right: Top Selling Parts & Services -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem; padding-bottom: 0.5rem;">
              <div class="card-title">🔥 Top Selling Spare Parts</div>
            </div>
            ${topParts.length === 0 ? `
              <div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1.5rem;">No parts sold yet.</div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:0.6rem;">
                ${topParts.map((p, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem;">
                    <div>
                      <span style="font-weight: 700; color: var(--primary); margin-right: 0.35rem;">#${idx+1}</span>
                      <strong>${p.item_name}</strong>
                    </div>
                    <div style="text-align: right;">
                      <span class="badge badge-primary">${p.total_qty_sold} sold</span>
                      <div style="font-weight: 600; font-size: 0.78rem; margin-top: 2px;">${cur} ${p.total_amount}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem; padding-bottom: 0.5rem;">
              <div class="card-title">🛠️ Top Workshop Services</div>
            </div>
            ${topServices.length === 0 ? `
              <div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1.5rem;">No services performed yet.</div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:0.6rem;">
                ${topServices.map((s, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem;">
                    <div>
                      <span style="font-weight: 700; color: var(--accent); margin-right: 0.35rem;">#${idx+1}</span>
                      <strong>${s.item_name}</strong>
                    </div>
                    <div style="text-align: right;">
                      <span class="badge badge-secondary">${s.times_performed} jobs</span>
                      <div style="font-weight: 600; font-size: 0.78rem; margin-top: 2px;">${cur} ${s.total_earned}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  },

  renderValuationTab(cur) {
    const cats = this.state.valuationData?.categoryBreakdown || [];
    const totals = this.state.valuationData?.totals || {};

    return `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="card-header" style="padding: 1.25rem; margin-bottom: 0;">
          <div class="card-title">📦 Inventory Valuation Breakdown by Category</div>
          <div style="font-weight: 700; color: var(--primary);">
            Grand Total Valuation: ${cur} ${Number(totals.grand_retail_value || 0).toLocaleString()}
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: center;">Item Types</th>
                <th style="text-align: center;">Total Units</th>
                <th style="text-align: right;">Total Cost (Rs.)</th>
                <th style="text-align: right;">Total Retail Value (Rs.)</th>
                <th style="text-align: right;">Unrealized Profit (Rs.)</th>
                <th style="text-align: center;">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${cats.map(cat => {
                const margin = cat.total_retail_value > 0 
                  ? ((cat.potential_profit / cat.total_retail_value) * 100).toFixed(1) 
                  : 0;
                return `
                  <tr>
                    <td><strong>${cat.category}</strong></td>
                    <td style="text-align: center;"><span class="badge badge-secondary">${cat.item_count}</span></td>
                    <td style="text-align: center; font-weight: 600;">${cat.total_quantity}</td>
                    <td style="text-align: right; color: var(--text-muted); font-family: var(--font-mono);">${cur} ${Number(cat.total_cost_value).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 700; font-family: var(--font-mono);">${cur} ${Number(cat.total_retail_value).toLocaleString()}</td>
                    <td style="text-align: right; color: var(--success-text); font-weight: 700; font-family: var(--font-mono);">
                      ${cur} ${Number(cat.potential_profit).toLocaleString()}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge badge-success">+${margin}%</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.state.activeTab = tab;
    const container = document.getElementById('app-view-container');
    this.renderUI(container);
  },

  async filterLedger(type) {
    this.state.filterType = type;
    const res = await window.api.getStockLedger({ type });
    this.state.ledgerItems = res.data || [];
    document.getElementById('reports-tab-content').innerHTML = this.renderLedgerTab(window.workshopSettings?.currency || 'Rs.');
  }
};

