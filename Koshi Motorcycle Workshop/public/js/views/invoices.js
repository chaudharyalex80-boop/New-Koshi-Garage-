// Invoices & Billing History View Component
window.InvoicesView = {
  state: {
    invoices: [],
    searchQuery: '',
    statusFilter: 'ALL',
    fromDate: '',
    toDate: ''
  },

  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading Invoices & Bills History...</div>
      </div>
    `;

    try {
      const res = await window.api.getInvoices({
        search: this.state.searchQuery,
        status: this.state.statusFilter,
        from_date: this.state.fromDate,
        to_date: this.state.toDate
      });

      this.state.invoices = res.data || [];
      this.renderInvoicesUI(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger); text-align:center; padding:2rem;">
          <h3>Failed to load invoices</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  renderInvoicesUI(container) {
    const cur = window.workshopSettings?.currency || 'Rs.';

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDue = 0;

    for (const inv of this.state.invoices) {
      totalBilled += inv.grand_total || 0;
      totalCollected += inv.paid_amount || 0;
      totalDue += inv.due_amount || 0;
    }

    const html = `
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">
            📋 Workshop Bills & Invoices Register
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Search invoices, track credit payments, and reprint customer receipts.
          </p>
        </div>

        <button class="quick-action-btn btn-accent" onclick="window.navigateTo('billing')">
          <span>🧾</span> + Create New Bill
        </button>
      </div>

      <!-- Financial Metrics Summary -->
      <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.25rem;">
        <div class="stat-card blue" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Total Invoices</h3>
            <div class="stat-value" style="font-size: 1.45rem;">${this.state.invoices.length}</div>
            <div class="stat-sub">Bills on record</div>
          </div>
        </div>

        <div class="stat-card green" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Total Billed</h3>
            <div class="stat-value" style="font-size: 1.45rem;">${cur} ${Number(totalBilled).toLocaleString()}</div>
            <div class="stat-sub">Gross revenue invoiced</div>
          </div>
        </div>

        <div class="stat-card orange" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Total Collected</h3>
            <div class="stat-value" style="font-size: 1.45rem;">${cur} ${Number(totalCollected).toLocaleString()}</div>
            <div class="stat-sub">Received in cash/digital</div>
          </div>
        </div>

        <div class="stat-card ${totalDue > 0 ? 'red' : 'green'}" style="padding: 1rem 1.25rem;">
          <div class="stat-info">
            <h3>Outstanding Dues</h3>
            <div class="stat-value" style="font-size: 1.45rem; color: ${totalDue > 0 ? 'var(--danger)' : 'var(--success)'};">
              ${cur} ${Number(totalDue).toLocaleString()}
            </div>
            <div class="stat-sub">Pending credit settlement</div>
          </div>
        </div>
      </div>

      <!-- Filters & Search Bar -->
      <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
        <div class="filter-bar" style="margin-bottom: 0;">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" id="invs-search-input" class="form-control" placeholder="Search bill #, customer name, phone, plate #..." 
                   value="${this.state.searchQuery}" oninput="window.InvoicesView.onSearch(this.value)">
          </div>

          <div class="pill-group">
            <button class="pill-btn ${this.state.statusFilter === 'ALL' ? 'active' : ''}" onclick="window.InvoicesView.filterStatus('ALL')">All Invoices</button>
            <button class="pill-btn ${this.state.statusFilter === 'PAID' ? 'active' : ''}" onclick="window.InvoicesView.filterStatus('PAID')">🟢 Paid</button>
            <button class="pill-btn ${this.state.statusFilter === 'PARTIAL' ? 'active' : ''}" onclick="window.InvoicesView.filterStatus('PARTIAL')">🟡 Partial</button>
            <button class="pill-btn ${this.state.statusFilter === 'CREDIT' ? 'active' : ''}" onclick="window.InvoicesView.filterStatus('CREDIT')">🔴 Credit (Udharo)</button>
          </div>
        </div>
      </div>

      <!-- Invoices List Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 130px;">Invoice #</th>
                <th style="width: 100px;">Date</th>
                <th>Customer Name</th>
                <th>Vehicle / Plate #</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">Paid</th>
                <th style="text-align: right;">Due</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: center;">Payment</th>
                <th style="text-align: right; width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.state.invoices.length === 0 ? `
                <tr>
                  <td colspan="10" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🧾</div>
                    <div style="font-weight: 600;">No invoices found</div>
                    <div style="font-size: 0.82rem; margin-top: 0.25rem;">Adjust search filters or create a new bill.</div>
                  </td>
                </tr>
              ` : this.state.invoices.map(inv => {
                let badgeClass = 'badge-success';
                if (inv.payment_status === 'PARTIAL') badgeClass = 'badge-warning';
                if (inv.payment_status === 'CREDIT') badgeClass = 'badge-danger';

                return `
                  <tr>
                    <td>
                      <span style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">
                        ${inv.invoice_number}
                      </span>
                    </td>
                    <td>
                      <span style="font-size: 0.82rem; color: var(--text-muted);">${inv.date}</span>
                    </td>
                    <td>
                      <div style="font-weight: 600;">${inv.customer_name}</div>
                      ${inv.customer_phone ? `<div style="font-size: 0.74rem; color: var(--text-muted);">${inv.customer_phone}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-family: var(--font-mono); font-weight: 600; color: #334155;">
                        🏍️ ${inv.vehicle_plate}
                      </div>
                      ${inv.vehicle_model ? `<div style="font-size: 0.74rem; color: var(--text-muted);">${inv.vehicle_model}</div>` : ''}
                    </td>
                    <td style="text-align: right; font-weight: 700;">
                      ${cur} ${Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td style="text-align: right; color: var(--success-text); font-weight: 600;">
                      ${cur} ${Number(inv.paid_amount).toFixed(2)}
                    </td>
                    <td style="text-align: right; font-weight: 600; color: ${inv.due_amount > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
                      ${cur} ${Number(inv.due_amount).toFixed(2)}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge ${badgeClass}">
                        ${inv.payment_status}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span class="badge badge-secondary" style="font-size: 0.72rem;">
                        ${inv.payment_method}
                      </span>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn-primary btn-sm" onclick="window.viewInvoiceDetail(${inv.id})" title="View & Print Invoice Receipt">
                          Print
                        </button>
                        ${inv.due_amount > 0 ? `
                          <button class="btn-accent btn-sm" onclick="window.openSettlePaymentModal(${inv.id}, '${inv.invoice_number}', '${inv.customer_name.replace(/'/g, "\\'")}', ${inv.due_amount})" title="Collect Credit Payment">
                            Pay Due
                          </button>
                        ` : ''}
                        <button class="btn-secondary btn-sm" style="color: var(--danger);" onclick="window.InvoicesView.confirmVoid(${inv.id}, '${inv.invoice_number}')" title="Void Bill & Restore Stock">
                          Void
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
    this.state.statusFilter = status;
    this.refreshList();
  },

  async refreshList() {
    try {
      const res = await window.api.getInvoices({
        search: this.state.searchQuery,
        status: this.state.statusFilter,
        from_date: this.state.fromDate,
        to_date: this.state.toDate
      });
      this.state.invoices = res.data || [];
      const container = document.getElementById('app-view-container');
      this.renderInvoicesUI(container);
    } catch (err) {
      window.showToast(`Error updating invoices: ${err.message}`, 'error');
    }
  },

  async confirmVoid(id, invoiceNumber) {
    if (confirm(`Are you sure you want to VOID invoice ${invoiceNumber}?\n\nThis will cancel the bill and RESTORE all parts back to inventory stock.`)) {
      try {
        await window.api.voidInvoice(id);
        window.showToast(`Invoice ${invoiceNumber} has been voided and stock restored.`, 'success');
        this.refreshList();
      } catch (err) {
        window.showToast(`Failed to void invoice: ${err.message}`, 'error');
      }
    }
  }
};

