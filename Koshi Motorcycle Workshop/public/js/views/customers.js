// Customers & Motorcycle History View Component
window.CustomersView = {
  state: {
    customers: [],
    searchQuery: '',
    selectedPlate: null,
    vehicleHistory: null
  },

  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading Customer & Vehicle Records...</div>
      </div>
    `;

    try {
      const res = await window.api.getCustomers({ search: this.state.searchQuery });
      this.state.customers = res.data || [];
      this.renderUI(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger); text-align:center; padding:2rem;">
          <h3>Failed to load customer records</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  renderUI(container) {
    const cur = window.workshopSettings?.currency || 'Rs.';

    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">
            🏍️ Customers & Motorcycle Service History
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Lookup vehicle service history, mileage tracking, and customer credit ledger.
          </p>
        </div>

        <!-- Quick Plate Lookup -->
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="text" id="quick-plate-search" class="form-control" style="width: 220px; font-family: var(--font-mono); text-transform: uppercase; font-weight: 600;" placeholder="Search Bike Plate #...">
          <button class="quick-action-btn btn-primary" onclick="window.CustomersView.lookupPlate()">
            Lookup History
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; align-items: start;">
        
        <!-- Left: Customer Directory -->
        <div>
          <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1rem;">
            <div class="search-input-wrapper" style="max-width: 100%;">
              <span class="search-icon">🔍</span>
              <input type="text" class="form-control" placeholder="Search customer name, phone, address..." 
                     value="${this.state.searchQuery}" oninput="window.CustomersView.onSearch(this.value)">
            </div>
          </div>

          <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone / Address</th>
                    <th style="text-align: center;">Bikes</th>
                    <th style="text-align: center;">Bills</th>
                    <th style="text-align: right;">Credit Balance</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.customers.length === 0 ? `
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        No customer records found.
                      </td>
                    </tr>
                  ` : this.state.customers.map(c => `
                    <tr>
                      <td>
                        <div style="font-weight: 600;">${c.name}</div>
                      </td>
                      <td>
                        <div style="font-family: var(--font-mono); font-size: 0.82rem;">${c.phone}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${c.address || ''}</div>
                      </td>
                      <td style="text-align: center;">
                        <span class="badge badge-secondary">${c.vehicle_count}</span>
                      </td>
                      <td style="text-align: center;">
                        <span class="badge badge-secondary">${c.invoice_count}</span>
                      </td>
                      <td style="text-align: right; font-weight: 600; color: ${c.total_due_amount > 0 ? 'var(--danger)' : 'var(--success-text)'};">
                        ${cur} ${Number(c.total_due_amount).toFixed(2)}
                      </td>
                      <td style="text-align: right;">
                        <button class="btn-secondary btn-sm" onclick="window.CustomersView.viewCustomerDetail(${c.id})">
                          Profile
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: Motorcycle Lifetime Service Timeline Display -->
        <div>
          <div class="card" id="history-display-card">
            <div class="card-header">
              <div class="card-title">
                <span>🛠️</span> Vehicle Service Timeline
              </div>
              <span id="history-plate-badge" class="badge badge-primary" style="font-family: var(--font-mono); display: none;"></span>
            </div>

            <div id="history-content-area" style="min-height: 250px;">
              <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏍️</div>
                <div style="font-weight: 600;">Select a vehicle or lookup a number plate</div>
                <div style="font-size: 0.82rem; margin-top: 0.25rem;">
                  Enter any motorcycle registration number (e.g. <code>KO 1 PA 4521</code>) to inspect its full maintenance and parts history.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
  },

  onSearch(val) {
    this.state.searchQuery = val;
    window.api.getCustomers({ search: val }).then(res => {
      this.state.customers = res.data || [];
      const tbody = document.querySelector('.data-table tbody');
      if (tbody) {
        const cur = window.workshopSettings?.currency || 'Rs.';
        tbody.innerHTML = this.state.customers.map(c => `
          <tr>
            <td><div style="font-weight: 600;">${c.name}</div></td>
            <td>
              <div style="font-family: var(--font-mono); font-size: 0.82rem;">${c.phone}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${c.address || ''}</div>
            </td>
            <td style="text-align: center;"><span class="badge badge-secondary">${c.vehicle_count}</span></td>
            <td style="text-align: center;"><span class="badge badge-secondary">${c.invoice_count}</span></td>
            <td style="text-align: right; font-weight: 600; color: ${c.total_due_amount > 0 ? 'var(--danger)' : 'var(--success-text)'};">
              ${cur} ${Number(c.total_due_amount).toFixed(2)}
            </td>
            <td style="text-align: right;">
              <button class="btn-secondary btn-sm" onclick="window.CustomersView.viewCustomerDetail(${c.id})">Profile</button>
            </td>
          </tr>
        `).join('');
      }
    });
  },

  async lookupPlate(plateValue) {
    const input = document.getElementById('quick-plate-search');
    const plate = (plateValue || input?.value || '').trim();
    if (!plate) {
      window.showToast('Please enter a motorcycle number plate', 'error');
      return;
    }

    try {
      const res = await window.api.getVehicleHistory(plate);
      this.renderVehicleHistory(res.data);
    } catch (err) {
      window.showToast(`Error finding vehicle: ${err.message}`, 'error');
    }
  },

  renderVehicleHistory(data) {
    const cur = window.workshopSettings?.currency || 'Rs.';
    const plateBadge = document.getElementById('history-plate-badge');
    const content = document.getElementById('history-content-area');

    if (plateBadge) {
      plateBadge.style.display = 'inline-block';
      plateBadge.textContent = data.vehicle?.plate_number || 'Motorcycle';
    }

    if (!data.serviceHistory || data.serviceHistory.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">ℹ️</div>
          <div style="font-weight: 600;">No service records found for ${data.vehicle?.plate_number}</div>
          <div style="font-size: 0.82rem; margin-top: 0.25rem;">This bike has not been billed yet. Create a new bill to start its service history.</div>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background-color: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border);">
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">
          ${data.vehicle?.model || 'Motorcycle'}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 1.5rem; margin-top: 0.25rem;">
          <span>Plate: <strong style="font-family: var(--font-mono); color: var(--primary);">${data.vehicle?.plate_number}</strong></span>
          <span>Last Odometer: <strong>${data.vehicle?.current_km || 'N/A'} KM</strong></span>
          <span>Total Visits: <strong>${data.serviceHistory.length}</strong></span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
        ${data.serviceHistory.map(inv => `
          <div style="border-left: 3px solid var(--primary); padding-left: 1rem; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-weight: 700; font-family: var(--font-mono); color: var(--primary);">${inv.invoice_number}</span>
                <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 0.5rem;">${inv.date}</span>
              </div>
              <span class="badge ${inv.payment_status === 'PAID' ? 'badge-success' : 'badge-danger'}">
                ${inv.payment_status}
              </span>
            </div>

            <div style="font-size: 0.82rem; margin-top: 0.35rem; color: #334155;">
              <span>Odo: <strong>${inv.odometer_km || 'N/A'} KM</strong></span>
              ${inv.mechanic_name ? `<span style="margin-left: 1rem;">Mechanic: <strong>${inv.mechanic_name}</strong></span>` : ''}
              ${inv.next_service_km ? `<span style="margin-left: 1rem; color: var(--primary);">Next Due: <strong>${inv.next_service_km} KM</strong></span>` : ''}
            </div>

            ${inv.service_notes ? `
              <div style="font-size: 0.8rem; background-color: #f1f5f9; padding: 0.4rem 0.6rem; border-radius: 4px; margin-top: 0.35rem; font-style: italic;">
                "${inv.service_notes}"
              </div>
            ` : ''}

            <!-- Items installed -->
            <div style="margin-top: 0.5rem; font-size: 0.78rem;">
              <div style="font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Parts Replaced & Services:</div>
              <ul style="padding-left: 1.25rem; margin-top: 0.2rem; color: var(--text-main);">
                ${(inv.items || []).map(it => `
                  <li>
                    ${it.item_type === 'PART' ? '📦' : '🛠️'} <strong>${it.item_name}</strong> 
                    ${it.quantity > 1 ? `(${it.quantity}x)` : ''} - ${cur} ${it.total_price}
                  </li>
                `).join('')}
              </ul>
            </div>

            <div style="margin-top: 0.5rem; text-align: right;">
              <button class="btn-secondary btn-sm" onclick="window.viewInvoiceDetail(${inv.id})">
                View Bill
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async viewCustomerDetail(id) {
    try {
      const res = await window.api.getCustomerDetail(id);
      const cust = res.data;
      if (cust.vehicles && cust.vehicles.length > 0) {
        this.lookupPlate(cust.vehicles[0].plate_number);
      } else {
        window.showToast(`Customer ${cust.name} has no vehicles registered yet`, 'info');
      }
    } catch (err) {
      window.showToast(`Error: ${err.message}`, 'error');
    }
  }
};

