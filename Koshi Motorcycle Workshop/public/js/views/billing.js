// Billing (POS & Invoicing) View Component
window.BillingView = {
  state: {
    items: [], // { id, item_type: 'PART'|'LABOR', part_id, item_name, part_number, quantity, unit_price, max_stock }
    inventoryList: [],
    servicesList: [],
    customersList: [],
    discountType: 'amount', // 'amount' | 'percentage'
    discountValue: 0,
    taxApplicable: false,
    taxRate: 13.0,
    paidAmount: 0,
    paymentMethod: 'CASH',
    mechanicName: '',
    nextInvoiceNumber: ''
  },

  async render(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px;">
        <div style="font-size:1.1rem; color:var(--text-muted);">Initializing Billing POS System...</div>
      </div>
    `;

    try {
      // Load inventory, services, customers, next invoice number
      const [invRes, servRes, custRes, nextInvRes] = await Promise.all([
        window.api.getInventory(),
        window.api.getServices(),
        window.api.getCustomers(),
        window.api.getNextInvoiceNumber()
      ]);

      this.state.inventoryList = invRes.data || [];
      this.state.servicesList = servRes.data || [];
      this.state.customersList = custRes.data || [];
      this.state.nextInvoiceNumber = nextInvRes.invoice_number || 'KMW-2026-0001';
      this.state.items = [];
      this.state.discountValue = 0;
      this.state.taxApplicable = false;
      this.state.paidAmount = 0;
      this.state.paymentMethod = 'CASH';

      this.renderBillingUI(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger); text-align:center; padding:2rem;">
          <h3>Failed to load billing dependencies</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  renderBillingUI(container) {
    const cur = window.workshopSettings?.currency || 'Rs.';

    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">
            🧾 Create New Workshop Bill / Invoicing
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Add customer info, motorcycle specs, parts from inventory, and labor charges.
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Invoice Number</div>
          <div style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: var(--primary);">
            ${this.state.nextInvoiceNumber}
          </div>
        </div>
      </div>

      <!-- Billing Grid Layout -->
      <div style="display: grid; grid-template-columns: 1.25fr 1fr; gap: 1.5rem; align-items: start;">
        
        <!-- LEFT COLUMN: Customer, Vehicle, Add Services & Parts -->
        <div>
          
          <!-- Customer & Vehicle Details Card -->
          <div class="card" style="margin-bottom: 1.25rem;">
            <div class="card-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem;">
              <div class="card-title" style="font-size: 0.95rem;">
                <span>👤</span> Customer & Motorcycle Information
              </div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Required for warranty & service log</span>
            </div>

            <!-- Customer Fields -->
            <div class="form-row">
              <div class="form-group" style="flex: 1.2;">
                <label class="form-label required">Customer Full Name</label>
                <input type="text" id="bill-cust-name" class="form-control" placeholder="e.g. Ramesh Adhikari" required list="customer-name-suggestions">
                <datalist id="customer-name-suggestions">
                  ${this.state.customersList.map(c => `<option value="${c.name}">${c.phone} - ${c.address || ''}</option>`).join('')}
                </datalist>
              </div>

              <div class="form-group">
                <label class="form-label required">Phone Number</label>
                <input type="tel" id="bill-cust-phone" class="form-control" placeholder="e.g. 9842011223" required onchange="window.BillingView.onPhoneChange(this.value)">
              </div>
            </div>

            <!-- Vehicle Fields -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label required">Motorcycle Number Plate</label>
                <input type="text" id="bill-veh-plate" class="form-control" style="font-family: var(--font-mono); text-transform: uppercase; font-weight: 600;" placeholder="e.g. KO 1 PA 4521" required>
              </div>

              <div class="form-group">
                <label class="form-label">Motorcycle Model</label>
                <input type="text" id="bill-veh-model" class="form-control" placeholder="e.g. Pulsar 150 / Shine / FZ">
              </div>

              <div class="form-group" style="max-width: 130px;">
                <label class="form-label">Current Odo (KM)</label>
                <input type="number" id="bill-veh-km" class="form-control" placeholder="15000" oninput="window.BillingView.onOdometerChange(this.value)">
              </div>
            </div>

            <!-- Mechanic & Notes -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Assigned Mechanic</label>
                <input type="text" id="bill-mechanic" class="form-control" placeholder="e.g. Master Anil / Bikram">
              </div>

              <div class="form-group">
                <label class="form-label">Next Service Due (KM)</label>
                <input type="number" id="bill-next-km" class="form-control" placeholder="Odo + 2000 KM">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Service Diagnosis / Notes</label>
              <input type="text" id="bill-notes" class="form-control" placeholder="e.g. 3rd Periodic Servicing, Front disc pad replaced, Oil changed">
            </div>
          </div>

          <!-- Add Labor & Services Card -->
          <div class="card" style="margin-bottom: 1.25rem;">
            <div class="card-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem;">
              <div class="card-title" style="font-size: 0.95rem;">
                <span>🛠️</span> Add Labor & Workshop Services
              </div>
            </div>

            <div style="display: flex; gap: 0.75rem; align-items: flex-end;">
              <div class="form-group" style="flex: 2; margin-bottom: 0;">
                <label class="form-label">Select Standard Service</label>
                <select id="bill-service-select" class="form-control" onchange="window.BillingView.onServiceSelect(this)">
                  <option value="">-- Choose from standard services list --</option>
                  ${this.state.servicesList.map(s => `
                    <option value="${s.id}" data-charge="${s.standard_charge}" data-name="${s.name}">
                      ${s.name} (${cur} ${s.standard_charge})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group" style="width: 120px; margin-bottom: 0;">
                <label class="form-label">Labor Charge (${cur})</label>
                <input type="number" id="bill-service-charge" class="form-control" placeholder="Charge" min="0">
              </div>

              <button type="button" class="quick-action-btn btn-primary" style="height: 40px;" onclick="window.BillingView.addLaborItem()">
                + Add Labor
              </button>
            </div>
          </div>

          <!-- Add Spare Parts from Inventory Card -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem;">
              <div class="card-title" style="font-size: 0.95rem;">
                <span>📦</span> Add Spare Parts from Inventory
              </div>
              <span class="badge badge-primary" style="font-size: 0.72rem;">Live Stock Deduction</span>
            </div>

            <div style="display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap;">
              <div class="form-group" style="flex: 2; min-width: 250px; margin-bottom: 0;">
                <label class="form-label">Search & Select Spare Part</label>
                <select id="bill-part-select" class="form-control" onchange="window.BillingView.onPartSelect(this)">
                  <option value="">-- Search by part name, SKU, or bike model --</option>
                  ${this.state.inventoryList.map(p => `
                    <option value="${p.id}" 
                            data-price="${p.selling_price}" 
                            data-stock="${p.stock_quantity}" 
                            data-name="${p.name}" 
                            data-sku="${p.part_number}"
                            data-unit="${p.unit || 'pcs'}"
                            ${p.stock_quantity <= 0 ? 'disabled' : ''}>
                      ${p.name} | [${p.part_number}] | Stock: ${p.stock_quantity} ${p.unit} | ${cur} ${p.selling_price} ${p.stock_quantity <= 0 ? '(OUT OF STOCK)' : ''}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group" style="width: 80px; margin-bottom: 0;">
                <label class="form-label">Qty</label>
                <input type="number" id="bill-part-qty" class="form-control" value="1" min="1" max="999">
              </div>

              <div class="form-group" style="width: 110px; margin-bottom: 0;">
                <label class="form-label">Unit Price (${cur})</label>
                <input type="number" id="bill-part-price" class="form-control" placeholder="Price" min="0">
              </div>

              <button type="button" class="quick-action-btn btn-accent" style="height: 40px;" onclick="window.BillingView.addPartItem()">
                + Add Part
              </button>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: Bill Summary & Checkout -->
        <div>
          <div class="card" style="box-shadow: var(--shadow-md); border-color: #cbd5e1;">
            <div class="card-header" style="margin-bottom: 0.75rem; padding-bottom: 0.5rem;">
              <div class="card-title">
                <span>📋</span> Invoice Items Summary
              </div>
              <span id="bill-items-count" class="badge badge-secondary">0 items</span>
            </div>

            <!-- Items Table -->
            <div style="min-height: 180px; max-height: 320px; overflow-y: auto; margin-bottom: 1rem; border-bottom: 1px solid var(--border);">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
                <thead style="background-color: #f8fafc; position: sticky; top: 0;">
                  <tr style="text-align: left; color: var(--text-muted); border-bottom: 1px solid var(--border);">
                    <th style="padding: 0.5rem;">Item Description</th>
                    <th style="padding: 0.5rem; text-align: center; width: 60px;">Qty</th>
                    <th style="padding: 0.5rem; text-align: right; width: 80px;">Rate</th>
                    <th style="padding: 0.5rem; text-align: right; width: 80px;">Total</th>
                    <th style="padding: 0.5rem; text-align: center; width: 40px;"></th>
                  </tr>
                </thead>
                <tbody id="bill-items-tbody">
                  <!-- Dynamically rendered -->
                </tbody>
              </table>
              <div id="bill-items-empty" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🛒</div>
                No services or parts added yet.
              </div>
            </div>

            <!-- Subtotals Calculation Section -->
            <div style="font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.45rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; color: var(--text-muted);">
                <span>Parts Subtotal:</span>
                <span id="bill-subtotal-parts" style="font-weight: 600; color: var(--text-main);">${cur} 0.00</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: var(--text-muted);">
                <span>Labor / Service Subtotal:</span>
                <span id="bill-subtotal-labor" style="font-weight: 600; color: var(--text-main);">${cur} 0.00</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span>Gross Subtotal:</span>
                <span id="bill-gross-subtotal">${cur} 0.00</span>
              </div>

              <!-- Discount Control -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span>Discount:</span>
                  <select id="bill-discount-type" style="padding: 0.2rem 0.4rem; font-size: 0.78rem; border-radius: 4px; border: 1px solid var(--border);" onchange="window.BillingView.onDiscountTypeChange(this.value)">
                    <option value="amount">Flat (${cur})</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                </div>
                <div style="width: 90px;">
                  <input type="number" id="bill-discount-input" class="form-control" style="padding: 0.25rem 0.5rem; text-align: right; font-size: 0.85rem;" value="0" min="0" oninput="window.BillingView.recalculateTotals()">
                </div>
              </div>

              <!-- Tax / VAT Toggle -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                  <input type="checkbox" id="bill-tax-toggle" onchange="window.BillingView.onTaxToggle(this.checked)">
                  <span>Apply VAT (13%)</span>
                </label>
                <span id="bill-tax-amount" style="font-weight: 600;">${cur} 0.00</span>
              </div>
            </div>

            <!-- Grand Total Display -->
            <div style="padding: 0.85rem 0; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Grand Total</span>
                <div id="bill-grand-total" style="font-size: 1.8rem; font-weight: 800; color: var(--primary); letter-spacing: -0.02em;">
                  ${cur} 0.00
                </div>
              </div>
              <div id="bill-payment-badge" class="badge badge-success" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                PAID IN FULL
              </div>
            </div>

            <!-- Payment Details Section -->
            <div style="background-color: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 1rem;">
              <div class="form-row" style="margin-bottom: 0.65rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem;">Amount Received (${cur})</label>
                  <input type="number" id="bill-paid-amount" class="form-control" style="font-weight: 700; font-size: 1rem;" min="0" oninput="window.BillingView.onPaidAmountChange(this.value)">
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem;">Remaining Due (${cur})</label>
                  <input type="text" id="bill-due-amount" class="form-control" style="font-weight: 700; font-size: 1rem; color: var(--danger); background-color: #fff;" readonly value="${cur} 0.00">
                </div>
              </div>

              <!-- Payment Method Selector -->
              <div>
                <label class="form-label" style="font-size: 0.78rem;">Payment Mode</label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem;">
                  <button type="button" class="pill-btn active pay-mode-btn" data-mode="CASH" onclick="window.BillingView.setPaymentMode('CASH', this)">💵 Cash</button>
                  <button type="button" class="pill-btn pay-mode-btn" data-mode="FONEPAY_QR" onclick="window.BillingView.setPaymentMode('FONEPAY_QR', this)">📱 Fonepay / QR</button>
                  <button type="button" class="pill-btn pay-mode-btn" data-mode="ESEWA" onclick="window.BillingView.setPaymentMode('ESEWA', this)">🟢 eSewa</button>
                  <button type="button" class="pill-btn pay-mode-btn" data-mode="BANK_TRANSFER" onclick="window.BillingView.setPaymentMode('BANK_TRANSFER', this)">🏦 Bank</button>
                  <button type="button" class="pill-btn pay-mode-btn" data-mode="CARD" onclick="window.BillingView.setPaymentMode('CARD', this)">💳 Card</button>
                  <button type="button" class="pill-btn pay-mode-btn" data-mode="CREDIT" onclick="window.BillingView.setPaymentMode('CREDIT', this)">📝 Credit (Udharo)</button>
                </div>
              </div>
            </div>

            <!-- Submit Action Buttons -->
            <div style="display: flex; gap: 0.75rem;">
              <button type="button" class="quick-action-btn btn-secondary" style="flex: 1;" onclick="window.BillingView.resetBill()">
                Clear
              </button>
              <button type="button" class="quick-action-btn btn-primary" style="flex: 2; padding: 0.75rem 1rem; font-size: 1rem;" onclick="window.BillingView.submitBill(true)">
                💾 Generate & Print Bill
              </button>
            </div>

          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this.updateItemsTable();
    this.recalculateTotals();
  },

  onPhoneChange(phone) {
    if (!phone) return;
    const clean = phone.trim();
    const cust = this.state.customersList.find(c => c.phone === clean);
    if (cust) {
      document.getElementById('bill-cust-name').value = cust.name || '';
      // Look up vehicle if available
      window.api.getCustomerDetail(cust.id).then(res => {
        if (res.data?.vehicles && res.data.vehicles.length > 0) {
          const veh = res.data.vehicles[0];
          document.getElementById('bill-veh-plate').value = veh.plate_number || '';
          document.getElementById('bill-veh-model').value = veh.model || '';
          if (veh.current_km) {
            document.getElementById('bill-veh-km').value = veh.current_km;
            this.onOdometerChange(veh.current_km);
          }
        }
      });
      window.showToast(`Found returning customer: ${cust.name}`, 'info');
    }
  },

  onOdometerChange(km) {
    const kmNum = parseInt(km, 10);
    if (!isNaN(kmNum) && kmNum > 0) {
      document.getElementById('bill-next-km').value = kmNum + 2000;
    }
  },

  onServiceSelect(selectEl) {
    const selected = selectEl.options[selectEl.selectedIndex];
    if (selected && selected.value) {
      const charge = selected.getAttribute('data-charge');
      document.getElementById('bill-service-charge').value = charge || 0;
    } else {
      document.getElementById('bill-service-charge').value = '';
    }
  },

  addLaborItem() {
    const selectEl = document.getElementById('bill-service-select');
    const selected = selectEl.options[selectEl.selectedIndex];
    const chargeInput = document.getElementById('bill-service-charge');

    if (!selected || !selected.value) {
      window.showToast('Please select a service from the dropdown', 'error');
      return;
    }

    const name = selected.getAttribute('data-name');
    const charge = parseFloat(chargeInput.value) || 0;

    this.state.items.push({
      id: Date.now() + Math.random(),
      item_type: 'LABOR',
      part_id: null,
      item_name: name,
      part_number: '',
      quantity: 1,
      unit_price: charge,
      total_price: charge
    });

    selectEl.selectedIndex = 0;
    chargeInput.value = '';
    this.updateItemsTable();
    this.recalculateTotals();
    window.showToast(`Added service: ${name}`, 'success');
  },

  onPartSelect(selectEl) {
    const selected = selectEl.options[selectEl.selectedIndex];
    if (selected && selected.value) {
      const price = selected.getAttribute('data-price');
      document.getElementById('bill-part-price').value = price || 0;
      document.getElementById('bill-part-qty').value = 1;
    } else {
      document.getElementById('bill-part-price').value = '';
    }
  },

  addPartItem() {
    const selectEl = document.getElementById('bill-part-select');
    const selected = selectEl.options[selectEl.selectedIndex];
    const qtyInput = document.getElementById('bill-part-qty');
    const priceInput = document.getElementById('bill-part-price');

    if (!selected || !selected.value) {
      window.showToast('Please select a spare part from inventory', 'error');
      return;
    }

    const partId = parseInt(selected.value, 10);
    const name = selected.getAttribute('data-name');
    const sku = selected.getAttribute('data-sku');
    const maxStock = parseInt(selected.getAttribute('data-stock'), 10) || 0;
    const qty = parseFloat(qtyInput.value) || 1;
    const price = parseFloat(priceInput.value) || 0;

    // Check if already in items list
    const existingIndex = this.state.items.findIndex(it => it.part_id === partId);
    let totalQty = qty;
    if (existingIndex !== -1) {
      totalQty += this.state.items[existingIndex].quantity;
    }

    if (totalQty > maxStock) {
      window.showToast(`Cannot add ${totalQty}. Only ${maxStock} in stock for '${name}'`, 'error');
      return;
    }

    if (existingIndex !== -1) {
      this.state.items[existingIndex].quantity = totalQty;
      this.state.items[existingIndex].unit_price = price;
      this.state.items[existingIndex].total_price = totalQty * price;
    } else {
      this.state.items.push({
        id: Date.now() + Math.random(),
        item_type: 'PART',
        part_id: partId,
        item_name: name,
        part_number: sku,
        quantity: qty,
        unit_price: price,
        total_price: qty * price,
        max_stock: maxStock
      });
    }

    selectEl.selectedIndex = 0;
    priceInput.value = '';
    qtyInput.value = 1;
    this.updateItemsTable();
    this.recalculateTotals();
    window.showToast(`Added spare part: ${name}`, 'success');
  },

  removeItem(index) {
    this.state.items.splice(index, 1);
    this.updateItemsTable();
    this.recalculateTotals();
  },

  updateItemsTable() {
    const tbody = document.getElementById('bill-items-tbody');
    const emptyMsg = document.getElementById('bill-items-empty');
    const countBadge = document.getElementById('bill-items-count');
    const cur = window.workshopSettings?.currency || 'Rs.';

    if (!tbody) return;

    countBadge.textContent = `${this.state.items.length} item${this.state.items.length !== 1 ? 's' : ''}`;

    if (this.state.items.length === 0) {
      tbody.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';
    tbody.innerHTML = this.state.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 0.5rem;">
          <div style="font-weight: 600;">
            ${item.item_type === 'PART' ? '📦' : '🛠️'} ${item.item_name}
          </div>
          ${item.part_number ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${item.part_number}</div>` : ''}
        </td>
        <td style="padding: 0.5rem; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 0.5rem; text-align: right;">
          ${Number(item.unit_price).toFixed(2)}
        </td>
        <td style="padding: 0.5rem; text-align: right; font-weight: 600;">
          ${cur} ${Number(item.quantity * item.unit_price).toFixed(2)}
        </td>
        <td style="padding: 0.5rem; text-align: center;">
          <button type="button" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1rem;" onclick="window.BillingView.removeItem(${idx})" title="Remove item">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  },

  onDiscountTypeChange(type) {
    this.state.discountType = type;
    this.recalculateTotals();
  },

  onTaxToggle(checked) {
    this.state.taxApplicable = checked;
    this.recalculateTotals();
  },

  onPaidAmountChange(val) {
    const paid = parseFloat(val) || 0;
    this.state.paidAmount = paid;
    this.updatePaymentBadges();
  },

  setPaymentMode(mode, btnEl) {
    this.state.paymentMethod = mode;
    document.querySelectorAll('.pay-mode-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');

    // If credit chosen, auto-set paid to 0
    if (mode === 'CREDIT') {
      document.getElementById('bill-paid-amount').value = 0;
      this.state.paidAmount = 0;
      this.updatePaymentBadges();
    }
  },

  recalculateTotals() {
    const cur = window.workshopSettings?.currency || 'Rs.';

    let partsSubtotal = 0;
    let laborSubtotal = 0;

    for (const item of this.state.items) {
      const lineTotal = item.quantity * item.unit_price;
      if (item.item_type === 'PART') {
        partsSubtotal += lineTotal;
      } else {
        laborSubtotal += lineTotal;
      }
    }

    const grossSubtotal = partsSubtotal + laborSubtotal;

    // Discount
    const discInput = document.getElementById('bill-discount-input');
    const discVal = parseFloat(discInput?.value) || 0;
    let discAmount = 0;

    if (this.state.discountType === 'percentage') {
      discAmount = (grossSubtotal * (discVal / 100));
    } else {
      discAmount = Math.min(discVal, grossSubtotal);
    }

    const taxableBase = Math.max(0, grossSubtotal - discAmount);

    // VAT
    let taxAmount = 0;
    if (this.state.taxApplicable) {
      taxAmount = taxableBase * 0.13;
    }

    const grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;

    // Update UI elements
    if (document.getElementById('bill-subtotal-parts')) {
      document.getElementById('bill-subtotal-parts').textContent = `${cur} ${partsSubtotal.toFixed(2)}`;
      document.getElementById('bill-subtotal-labor').textContent = `${cur} ${laborSubtotal.toFixed(2)}`;
      document.getElementById('bill-gross-subtotal').textContent = `${cur} ${grossSubtotal.toFixed(2)}`;
      document.getElementById('bill-tax-amount').textContent = `${cur} ${taxAmount.toFixed(2)}`;
      document.getElementById('bill-grand-total').textContent = `${cur} ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      // Default paid amount to grand total if previously untouched or matched
      const paidInput = document.getElementById('bill-paid-amount');
      if (this.state.paymentMethod !== 'CREDIT') {
        paidInput.value = grandTotal;
        this.state.paidAmount = grandTotal;
      }
    }

    this.state.grandTotal = grandTotal;
    this.updatePaymentBadges();
  },

  updatePaymentBadges() {
    const cur = window.workshopSettings?.currency || 'Rs.';
    const grand = this.state.grandTotal || 0;
    const paid = this.state.paidAmount || 0;
    const due = Math.max(0, Math.round((grand - paid) * 100) / 100);

    const dueInput = document.getElementById('bill-due-amount');
    const badge = document.getElementById('bill-payment-badge');

    if (dueInput) {
      dueInput.value = `${cur} ${due.toFixed(2)}`;
    }

    if (badge) {
      if (due <= 0 && grand > 0) {
        badge.className = 'badge badge-success';
        badge.textContent = 'PAID IN FULL';
      } else if (paid > 0 && due > 0) {
        badge.className = 'badge badge-warning';
        badge.textContent = `PARTIAL DUE: ${cur} ${due.toFixed(0)}`;
      } else if (grand > 0 && paid === 0) {
        badge.className = 'badge badge-danger';
        badge.textContent = 'CREDIT (UDHARO)';
      } else {
        badge.className = 'badge badge-secondary';
        badge.textContent = 'DRAFT';
      }
    }
  },

  async submitBill(shouldPrint = true) {
    const custName = document.getElementById('bill-cust-name').value.trim();
    const custPhone = document.getElementById('bill-cust-phone').value.trim();
    const vehPlate = document.getElementById('bill-veh-plate').value.trim();
    const vehModel = document.getElementById('bill-veh-model').value.trim();
    const vehKm = document.getElementById('bill-veh-km').value;
    const mechanic = document.getElementById('bill-mechanic').value.trim();
    const nextKm = document.getElementById('bill-next-km').value;
    const notes = document.getElementById('bill-notes').value.trim();

    if (!custName) {
      window.showToast('Please enter customer full name', 'error');
      document.getElementById('bill-cust-name').focus();
      return;
    }

    if (!vehPlate) {
      window.showToast('Please enter motorcycle number plate', 'error');
      document.getElementById('bill-veh-plate').focus();
      return;
    }

    if (this.state.items.length === 0) {
      window.showToast('Please add at least one spare part or labor service to the bill', 'error');
      return;
    }

    const discInput = document.getElementById('bill-discount-input');
    const discVal = parseFloat(discInput?.value) || 0;
    const paid = parseFloat(document.getElementById('bill-paid-amount').value) || 0;

    const payload = {
      customer_name: custName,
      customer_phone: custPhone,
      vehicle_plate: vehPlate,
      vehicle_model: vehModel,
      odometer_km: parseInt(vehKm, 10) || 0,
      mechanic_name: mechanic,
      service_notes: notes,
      next_service_km: parseInt(nextKm, 10) || 0,
      discount_type: this.state.discountType,
      discount_value: discVal,
      tax_applicable: this.state.taxApplicable ? 1 : 0,
      paid_amount: paid,
      payment_method: this.state.paymentMethod,
      items: this.state.items
    };

    try {
      const res = await window.api.createInvoice(payload);
      window.showToast(`Bill ${res.data.invoice_number} generated successfully!`, 'success');

      if (shouldPrint) {
        window.openPrintModal(res.data);
      }

      // Re-initialize billing screen for next customer
      this.render(document.getElementById('app-view-container'));
    } catch (err) {
      window.showToast(`Failed to create bill: ${err.message}`, 'error');
    }
  },

  resetBill() {
    if (confirm('Clear current bill form? All entered items will be reset.')) {
      this.render(document.getElementById('app-view-container'));
    }
  }
};

