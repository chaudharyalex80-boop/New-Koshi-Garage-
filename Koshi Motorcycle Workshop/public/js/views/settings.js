// Workshop Settings & Services Management View Component
window.SettingsView = {
  state: {
    settings: null,
    services: []
  },

  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Loading Workshop Settings...</div>
      </div>
    `;

    try {
      const [setRes, servRes] = await Promise.all([
        window.api.getSettings(),
        window.api.getServices()
      ]);

      this.state.settings = setRes.data || {};
      this.state.services = servRes.data || [];

      this.renderUI(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger); text-align:center; padding:2rem;">
          <h3>Failed to load settings</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  renderUI(container) {
    const s = this.state.settings;
    const cur = s.currency || 'Rs.';

    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">
            ⚙️ Workshop Settings & Business Profile
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Manage workshop details, receipt header/footer, standard labor charges, and database backups.
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; align-items: start;">
        
        <!-- Left: Workshop Profile Form -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span>🏢</span> Workshop Information (Printed on Bills)
            </div>
          </div>

          <form id="settings-form" onsubmit="window.SettingsView.saveSettings(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label required">Workshop Business Name</label>
                <input type="text" id="set-name" class="form-control" value="${s.workshop_name || ''}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Tagline / Subtitle</label>
                <input type="text" id="set-tagline" class="form-control" value="${s.tagline || ''}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label required">Workshop Address</label>
                <input type="text" id="set-address" class="form-control" value="${s.address || ''}" required>
              </div>

              <div class="form-group">
                <label class="form-label required">Contact Phone Numbers</label>
                <input type="text" id="set-phone" class="form-control" value="${s.phone || ''}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="set-email" class="form-control" value="${s.email || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">PAN / VAT Registration #</label>
                <input type="text" id="set-pan" class="form-control" value="${s.pan_vat || ''}" placeholder="PAN: 601234567">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Currency Symbol</label>
                <input type="text" id="set-currency" class="form-control" style="width: 120px;" value="${s.currency || 'Rs.'}">
              </div>

              <div class="form-group">
                <label class="form-label">Default Tax / VAT %</label>
                <input type="number" id="set-tax-rate" class="form-control" style="width: 120px;" value="${s.tax_rate || 13}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Invoice Receipt Footer Note</label>
              <textarea id="set-footer" class="form-control" rows="2">${s.receipt_footer || ''}</textarea>
            </div>

            <div style="text-align: right; margin-top: 1rem;">
              <button type="submit" class="quick-action-btn btn-primary">
                💾 Save Settings
              </button>
            </div>
          </form>
        </div>

        <!-- Right: Labor Services & Database Management -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- Standard Labor Services Catalog -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <span>🛠️</span> Standard Labor Services Catalog
              </div>
              <button class="btn-primary btn-sm" onclick="window.SettingsView.openAddServiceModal()">
                + New Service
              </button>
            </div>

            <div style="max-height: 280px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th style="text-align: right;">Standard Charge</th>
                    <th style="text-align: right; width: 60px;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.services.map(srv => `
                    <tr>
                      <td>
                        <div style="font-weight: 600;">${srv.name}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">${srv.category || 'General'}</div>
                      </td>
                      <td style="text-align: right; font-weight: 700; font-family: var(--font-mono);">
                        ${cur} ${srv.standard_charge}
                      </td>
                      <td style="text-align: right;">
                        <button style="background:none; border:none; color:var(--danger); cursor:pointer;" onclick="window.SettingsView.deleteService(${srv.id})" title="Delete Service">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Data Backup & Reset -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <span>💾</span> Backup & Data Management
              </div>
            </div>

            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
              Download a complete JSON database snapshot of all your customers, inventory items, and invoices for safekeeping.
            </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <a href="${window.api.getBackupDownloadUrl()}" download class="quick-action-btn btn-primary" style="text-decoration: none;">
                📥 Download Full Database Backup
              </a>
              <button class="quick-action-btn btn-secondary" style="color: var(--danger); border-color: #fca5a5;" onclick="window.SettingsView.resetDemo()">
                🔄 Reset & Reload Demo Data
              </button>
            </div>
          </div>

          <!-- Security & Login Credentials -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <span>🔐</span> Security & Login Password
              </div>
            </div>

            <form onsubmit="window.SettingsView.changePassword(event)">
              <div class="form-group">
                <label class="form-label required">Current Password</label>
                <input type="password" id="chg-curr-pwd" class="form-control" required placeholder="Enter current password">
              </div>

              <div class="form-group">
                <label class="form-label required">New Password</label>
                <input type="password" id="chg-new-pwd" class="form-control" required minlength="4" placeholder="Enter new password">
              </div>

              <div style="text-align: right;">
                <button type="submit" class="quick-action-btn btn-secondary">
                  Update Password
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    `;

    container.innerHTML = html;
  },

  async saveSettings(e) {
    e.preventDefault();
    const payload = {
      workshop_name: document.getElementById('set-name').value.trim(),
      tagline: document.getElementById('set-tagline').value.trim(),
      address: document.getElementById('set-address').value.trim(),
      phone: document.getElementById('set-phone').value.trim(),
      email: document.getElementById('set-email').value.trim(),
      pan_vat: document.getElementById('set-pan').value.trim(),
      currency: document.getElementById('set-currency').value.trim() || 'Rs.',
      tax_rate: parseFloat(document.getElementById('set-tax-rate').value) || 13,
      receipt_footer: document.getElementById('set-footer').value.trim()
    };

    try {
      const res = await window.api.updateSettings(payload);
      window.workshopSettings = res.data;
      window.showToast('Workshop settings updated successfully!', 'success');
      // Update top header workshop name
      document.getElementById('brand-workshop-name').textContent = res.data.workshop_name;
    } catch (err) {
      window.showToast(`Failed to update settings: ${err.message}`, 'error');
    }
  },

  openAddServiceModal() {
    const name = prompt('Enter Service Name (e.g. "Front Fork Oil Change"):');
    if (!name || !name.trim()) return;
    const charge = prompt('Enter Standard Labor Charge in Rs. (e.g. 350):', '300');
    if (charge === null) return;

    window.api.createService({
      name: name.trim(),
      category: 'General',
      standard_charge: parseFloat(charge) || 0
    }).then(res => {
      window.showToast(`Service '${name}' added!`, 'success');
      this.render(document.getElementById('app-view-container'));
    }).catch(err => {
      window.showToast(`Error adding service: ${err.message}`, 'error');
    });
  },

  deleteService(id) {
    if (confirm('Delete this standard service from catalog?')) {
      window.api.deleteService(id).then(() => {
        window.showToast('Service deleted', 'info');
        this.render(document.getElementById('app-view-container'));
      });
    }
  },

  async changePassword(e) {
    e.preventDefault();
    const curr = document.getElementById('chg-curr-pwd').value;
    const next = document.getElementById('chg-new-pwd').value;
    const username = window.currentUser?.username || 'admin';

    try {
      await window.api.changePassword({
        username,
        current_password: curr,
        new_password: next
      });
      window.showToast('Password changed successfully!', 'success');
      document.getElementById('chg-curr-pwd').value = '';
      document.getElementById('chg-new-pwd').value = '';
    } catch (err) {
      window.showToast(`Error changing password: ${err.message}`, 'error');
    }
  },

  async resetDemo() {
    if (confirm('WARNING: This will reset the database and re-seed the default 35 motorcycle spare parts, services, and demo records. Continue?')) {
      try {
        await window.api.resetDemoData();
        window.showToast('Database reset and demo data reloaded!', 'success');
        this.render(document.getElementById('app-view-container'));
      } catch (err) {
        window.showToast(`Error resetting: ${err.message}`, 'error');
      }
    }
  }
};

