const { db, seedDefaultData } = require('./db');

// Helper to generate next invoice number
function generateInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `KMW-${currentYear}-`;
  const row = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (row && row.invoice_number) {
    const parts = row.invoice_number.split('-');
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

const routes = {
  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------
  login(req, res, body) {
    const { username, password } = body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username and password are required' });
      return;
    }

    const user = db.prepare('SELECT id, username, password, full_name, role FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
    if (!user || user.password !== password) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    // Return safe user object (without password) and simple auth token
    const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  },

  changePassword(req, res, body) {
    const { username, current_password, new_password } = body;
    if (!username || !current_password || !new_password) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }

    const user = db.prepare('SELECT id, password FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
    if (!user || user.password !== current_password) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    if (new_password.length < 4) {
      res.status(400).json({ success: false, error: 'New password must be at least 4 characters' });
      return;
    }

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(new_password, user.id);
    res.json({ success: true, message: 'Password changed successfully' });
  },

  // ----------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------
  getSettings(req, res) {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  },

  updateSettings(req, res, body) {
    const {
      workshop_name, tagline, address, phone, email, pan_vat,
      currency, tax_rate, receipt_footer
    } = body;

    db.prepare(`
      UPDATE settings SET
        workshop_name = COALESCE(?, workshop_name),
        tagline = COALESCE(?, tagline),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        pan_vat = COALESCE(?, pan_vat),
        currency = COALESCE(?, currency),
        tax_rate = COALESCE(?, tax_rate),
        receipt_footer = COALESCE(?, receipt_footer)
      WHERE id = 1
    `).run(
      workshop_name, tagline, address, phone, email, pan_vat,
      currency, tax_rate, receipt_footer
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, message: 'Settings updated successfully', data: updated });
  },

  // ----------------------------------------------------
  // DASHBOARD
  // ----------------------------------------------------
  getDashboardStats(req, res) {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    // Today sales
    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_credit_given
      FROM invoices 
      WHERE date = ?
    `).get(today);

    // This month sales
    const monthStats = db.prepare(`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_credit_given
      FROM invoices 
      WHERE date LIKE ?
    `).get(`${thisMonth}%`);

    // Overall Dues / Credit across all unpaid bills
    const overallDues = db.prepare(`
      SELECT COALESCE(SUM(due_amount), 0) as total_due_balance,
             COUNT(*) as unpaid_bills_count
      FROM invoices
      WHERE due_amount > 0
    `).get();

    // Inventory metrics
    const inventoryStats = db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(stock_quantity), 0) as total_units,
        COALESCE(SUM(stock_quantity * cost_price), 0) as total_cost_valuation,
        COALESCE(SUM(stock_quantity * selling_price), 0) as total_retail_valuation,
        SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= min_stock_alert THEN 1 ELSE 0 END) as low_stock_count
      FROM inventory
    `).get();

    // Critical low stock items
    const lowStockItems = db.prepare(`
      SELECT id, part_number, name, category, brand, stock_quantity, min_stock_alert, unit, cost_price, selling_price, location_rack
      FROM inventory
      WHERE stock_quantity <= min_stock_alert
      ORDER BY stock_quantity ASC
      LIMIT 8
    `).all();

    // Recent 6 Invoices
    const recentInvoices = db.prepare(`
      SELECT id, invoice_number, date, customer_name, customer_phone, vehicle_plate, vehicle_model, grand_total, paid_amount, due_amount, payment_status, payment_method, created_at
      FROM invoices
      ORDER BY id DESC
      LIMIT 6
    `).all();

    // Last 7 days revenue trend
    const last7Days = db.prepare(`
      SELECT date, 
             COALESCE(SUM(grand_total), 0) as revenue,
             COALESCE(SUM(parts_subtotal), 0) as parts_revenue,
             COALESCE(SUM(labor_subtotal), 0) as labor_revenue,
             COUNT(*) as count
      FROM invoices
      WHERE date >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `).all();

    res.json({
      success: true,
      data: {
        today: todayStats,
        thisMonth: monthStats,
        overallDues,
        inventory: inventoryStats,
        lowStockItems,
        recentInvoices,
        revenueTrend: last7Days
      }
    });
  },

  // ----------------------------------------------------
  // INVENTORY
  // ----------------------------------------------------
  getInventory(req, res, url) {
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || ''; // 'all', 'low', 'out', 'in'

    let query = `SELECT * FROM inventory WHERE 1=1`;
    const params = [];

    if (search.trim()) {
      query += ` AND (part_number LIKE ? OR name LIKE ? OR brand LIKE ? OR compatible_models LIKE ? OR location_rack LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    if (category && category !== 'ALL') {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (status === 'low') {
      query += ` AND stock_quantity <= min_stock_alert AND stock_quantity > 0`;
    } else if (status === 'out') {
      query += ` AND stock_quantity <= 0`;
    } else if (status === 'in') {
      query += ` AND stock_quantity > min_stock_alert`;
    }

    query += ` ORDER BY name ASC`;

    const items = db.prepare(query).all(...params);
    res.json({ success: true, data: items });
  },

  getInventoryItem(req, res, id) {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    const transactions = db.prepare(`
      SELECT * FROM stock_transactions 
      WHERE part_id = ? 
      ORDER BY id DESC LIMIT 20
    `).all(id);

    res.json({ success: true, data: { ...item, transactions } });
  },

  createInventoryItem(req, res, body) {
    const {
      part_number, name, category, brand, compatible_models,
      unit, cost_price, selling_price, stock_quantity, min_stock_alert,
      location_rack, notes
    } = body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Item name is required' });
      return;
    }

    const finalPartNumber = (part_number && part_number.trim()) 
      ? part_number.trim().toUpperCase() 
      : 'PART-' + Date.now().toString().slice(-6);

    const existing = db.prepare('SELECT id FROM inventory WHERE part_number = ?').get(finalPartNumber);
    if (existing) {
      res.status(400).json({ success: false, error: `Part number/SKU '${finalPartNumber}' already exists` });
      return;
    }

    const initialStock = parseInt(stock_quantity, 10) || 0;
    const cost = parseFloat(cost_price) || 0;
    const sell = parseFloat(selling_price) || 0;
    const minAlert = parseInt(min_stock_alert, 10) || 5;

    db.exec('BEGIN TRANSACTION;');
    try {
      const insert = db.prepare(`
        INSERT INTO inventory (
          part_number, name, category, brand, compatible_models,
          unit, cost_price, selling_price, stock_quantity, min_stock_alert,
          location_rack, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        finalPartNumber, name.trim(), category || 'General Spares',
        brand || '', compatible_models || '', unit || 'pcs',
        cost, sell, initialStock, minAlert, location_rack || '', notes || ''
      );

      const newId = result.lastInsertRowid;

      if (initialStock > 0) {
        db.prepare(`
          INSERT INTO stock_transactions (
            part_id, type, quantity, previous_stock, new_stock,
            unit_cost, reference_id, supplier_name, notes
          ) VALUES (?, 'PURCHASE_RESTOCK', ?, 0, ?, ?, 'INITIAL-ENTRY', 'Opening Stock', 'Initial inventory registration')
        `).run(newId, initialStock, initialStock, cost);
      }

      db.exec('COMMIT;');
      const createdItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(newId);
      res.status(201).json({ success: true, message: 'Item added successfully', data: createdItem });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateInventoryItem(req, res, id, body) {
    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    const {
      part_number, name, category, brand, compatible_models,
      unit, cost_price, selling_price, min_stock_alert, location_rack, notes
    } = body;

    // Check SKU duplicate if changed
    if (part_number && part_number.trim().toUpperCase() !== existing.part_number) {
      const dup = db.prepare('SELECT id FROM inventory WHERE part_number = ? AND id != ?')
        .get(part_number.trim().toUpperCase(), id);
      if (dup) {
        res.status(400).json({ success: false, error: `Part number '${part_number}' already taken by another item` });
        return;
      }
    }

    db.prepare(`
      UPDATE inventory SET
        part_number = COALESCE(?, part_number),
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        brand = COALESCE(?, brand),
        compatible_models = COALESCE(?, compatible_models),
        unit = COALESCE(?, unit),
        cost_price = COALESCE(?, cost_price),
        selling_price = COALESCE(?, selling_price),
        min_stock_alert = COALESCE(?, min_stock_alert),
        location_rack = COALESCE(?, location_rack),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      part_number ? part_number.trim().toUpperCase() : null,
      name ? name.trim() : null,
      category, brand, compatible_models, unit,
      cost_price !== undefined ? parseFloat(cost_price) : null,
      selling_price !== undefined ? parseFloat(selling_price) : null,
      min_stock_alert !== undefined ? parseInt(min_stock_alert, 10) : null,
      location_rack, notes, id
    );

    const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    res.json({ success: true, message: 'Item updated successfully', data: updated });
  },

  restockInventoryItem(req, res, id, body) {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    const qtyToAdd = parseInt(body.quantity, 10);
    if (!qtyToAdd || qtyToAdd <= 0) {
      res.status(400).json({ success: false, error: 'Restock quantity must be greater than 0' });
      return;
    }

    const newUnitCost = body.cost_price !== undefined && body.cost_price !== '' 
      ? parseFloat(body.cost_price) 
      : item.cost_price;

    const newSellingPrice = body.selling_price !== undefined && body.selling_price !== ''
      ? parseFloat(body.selling_price)
      : item.selling_price;

    const supplier = body.supplier_name || 'Direct Supplier';
    const referenceId = body.reference_id || `PO-${Date.now().toString().slice(-6)}`;
    const notes = body.notes || 'Restock received';

    db.exec('BEGIN TRANSACTION;');
    try {
      const prevStock = item.stock_quantity;
      const newStock = prevStock + qtyToAdd;

      db.prepare(`
        UPDATE inventory SET 
          stock_quantity = ?,
          cost_price = ?,
          selling_price = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, newUnitCost, newSellingPrice, id);

      db.prepare(`
        INSERT INTO stock_transactions (
          part_id, type, quantity, previous_stock, new_stock,
          unit_cost, reference_id, supplier_name, notes
        ) VALUES (?, 'PURCHASE_RESTOCK', ?, ?, ?, ?, ?, ?, ?)
      `).run(id, qtyToAdd, prevStock, newStock, newUnitCost, referenceId, supplier, notes);

      db.exec('COMMIT;');
      const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
      res.json({ 
        success: true, 
        message: `Successfully restocked ${qtyToAdd} ${item.unit || 'units'} of ${item.name}`,
        data: updated 
      });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  },

  adjustInventoryItem(req, res, id, body) {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    const { adjustment_type, quantity, reason } = body; 
    // adjustment_type: 'ADD' or 'DEDUCT' or 'SET'
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      res.status(400).json({ success: false, error: 'Valid quantity required' });
      return;
    }

    const prevStock = item.stock_quantity;
    let newStock = prevStock;
    let delta = 0;
    let txType = 'ADJUSTMENT_ADD';

    if (adjustment_type === 'ADD') {
      newStock = prevStock + qty;
      delta = qty;
      txType = 'ADJUSTMENT_ADD';
    } else if (adjustment_type === 'DEDUCT') {
      if (qty > prevStock) {
        res.status(400).json({ success: false, error: `Cannot deduct ${qty} from current stock of ${prevStock}` });
        return;
      }
      newStock = prevStock - qty;
      delta = -qty;
      txType = 'ADJUSTMENT_DEDUCT';
    } else if (adjustment_type === 'SET') {
      delta = qty - prevStock;
      newStock = qty;
      txType = delta >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_DEDUCT';
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE inventory SET 
          stock_quantity = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, id);

      db.prepare(`
        INSERT INTO stock_transactions (
          part_id, type, quantity, previous_stock, new_stock,
          unit_cost, reference_id, supplier_name, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'STOCK-ADJUSTMENT', 'Internal Adjustment', ?)
      `).run(id, txType, delta, prevStock, newStock, item.cost_price, reason || 'Physical stock audit adjustment');

      db.exec('COMMIT;');
      const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
      res.json({ success: true, message: 'Stock adjusted successfully', data: updated });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteInventoryItem(req, res, id) {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    // Check if item has ever been billed
    const billedCount = db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE part_id = ?').get(id);
    if (billedCount.count > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete '${item.name}' because it has been used in ${billedCount.count} invoice(s). You can set its stock to 0 instead.`
      });
      return;
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM stock_transactions WHERE part_id = ?').run(id);
      db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
      db.exec('COMMIT;');
      res.json({ success: true, message: `Item '${item.name}' deleted successfully` });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getCategories(req, res) {
    const rows = db.prepare('SELECT DISTINCT category FROM inventory ORDER BY category ASC').all();
    const categories = rows.map(r => r.category).filter(Boolean);
    res.json({ success: true, data: categories });
  },

  getLowStockItems(req, res) {
    const rows = db.prepare(`
      SELECT * FROM inventory 
      WHERE stock_quantity <= min_stock_alert 
      ORDER BY stock_quantity ASC
    `).all();
    res.json({ success: true, data: rows });
  },

  // ----------------------------------------------------
  // BILLING & INVOICES
  // ----------------------------------------------------
  getNextInvoiceNumber(req, res) {
    const nextNumber = generateInvoiceNumber();
    res.json({ success: true, invoice_number: nextNumber });
  },

  getInvoices(req, res, url) {
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const fromDate = url.searchParams.get('from_date') || '';
    const toDate = url.searchParams.get('to_date') || '';

    let query = `
      SELECT id, invoice_number, date, customer_name, customer_phone,
             vehicle_plate, vehicle_model, odometer_km, mechanic_name,
             parts_subtotal, labor_subtotal, discount_amount, tax_amount,
             grand_total, paid_amount, due_amount, payment_status, payment_method,
             created_at
      FROM invoices
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      query += ` AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR vehicle_plate LIKE ? OR vehicle_model LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    if (status && status !== 'ALL') {
      query += ` AND payment_status = ?`;
      params.push(status);
    }

    if (fromDate) {
      query += ` AND date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND date <= ?`;
      params.push(toDate);
    }

    query += ` ORDER BY id DESC`;

    const invoices = db.prepare(query).all(...params);
    res.json({ success: true, data: invoices });
  },

  getInvoiceDetail(req, res, id) {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(id);
    const payments = db.prepare('SELECT * FROM payment_records WHERE invoice_id = ? ORDER BY id ASC').all(id);
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    res.json({
      success: true,
      data: {
        ...invoice,
        items,
        payments,
        workshop: settings
      }
    });
  },

  createInvoice(req, res, body) {
    const {
      customer_name, customer_phone, customer_address,
      vehicle_plate, vehicle_model, odometer_km, mechanic_name,
      service_notes, next_service_km, next_service_date,
      items, discount_type, discount_value,
      tax_applicable, tax_rate,
      paid_amount, payment_method, invoice_date
    } = body;

    if (!customer_name || !customer_name.trim()) {
      res.status(400).json({ success: false, error: 'Customer name is required' });
      return;
    }
    if (!vehicle_plate || !vehicle_plate.trim()) {
      res.status(400).json({ success: false, error: 'Motorcycle number plate is required' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'At least one service or spare part item is required on the bill' });
      return;
    }

    // Pre-validate stock availability for part items
    for (const item of items) {
      if (item.item_type === 'PART' && item.part_id) {
        const stockRow = db.prepare('SELECT id, name, stock_quantity, unit FROM inventory WHERE id = ?').get(item.part_id);
        if (!stockRow) {
          res.status(400).json({ success: false, error: `Part not found in inventory: ${item.item_name}` });
          return;
        }
        const requestedQty = parseFloat(item.quantity) || 1;
        if (stockRow.stock_quantity < requestedQty) {
          res.status(400).json({
            success: false,
            error: `Insufficient stock for '${stockRow.name}'. Available: ${stockRow.stock_quantity} ${stockRow.unit || 'pcs'}, Requested: ${requestedQty}`
          });
          return;
        }
      }
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Customer Handling (Find or create)
      let customerId = null;
      const cleanPhone = (customer_phone || '').trim();
      if (cleanPhone) {
        const existingCust = db.prepare('SELECT id FROM customers WHERE phone = ?').get(cleanPhone);
        if (existingCust) {
          customerId = existingCust.id;
          db.prepare('UPDATE customers SET name = ?, address = COALESCE(?, address) WHERE id = ?')
            .run(customer_name.trim(), customer_address || null, customerId);
        } else {
          const custRes = db.prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)')
            .run(customer_name.trim(), cleanPhone, customer_address || '');
          customerId = custRes.lastInsertRowid;
        }
      } else {
        const custRes = db.prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)')
          .run(customer_name.trim(), 'N/A-' + Date.now().toString().slice(-4), customer_address || '');
        customerId = custRes.lastInsertRowid;
      }

      // 2. Vehicle Handling (Find or create)
      let vehicleId = null;
      const cleanPlate = vehicle_plate.trim().toUpperCase();
      const existingVeh = db.prepare('SELECT id FROM vehicles WHERE plate_number = ?').get(cleanPlate);
      const currentKmNum = parseInt(odometer_km, 10) || 0;
      const todayStr = invoice_date || new Date().toISOString().slice(0, 10);

      if (existingVeh) {
        vehicleId = existingVeh.id;
        db.prepare(`
          UPDATE vehicles SET 
            customer_id = ?, 
            model = COALESCE(?, model),
            current_km = CASE WHEN ? > current_km THEN ? ELSE current_km END,
            last_service_date = ?
          WHERE id = ?
        `).run(customerId, vehicle_model || null, currentKmNum, currentKmNum, todayStr, vehicleId);
      } else {
        const vehRes = db.prepare(`
          INSERT INTO vehicles (customer_id, plate_number, model, current_km, last_service_date)
          VALUES (?, ?, ?, ?, ?)
        `).run(customerId, cleanPlate, vehicle_model || 'Motorcycle', currentKmNum, todayStr);
        vehicleId = vehRes.lastInsertRowid;
      }

      // 3. Compute Totals
      let partsSubtotal = 0;
      let laborSubtotal = 0;

      const processedItems = items.map(it => {
        const qty = parseFloat(it.quantity) || 1;
        const price = parseFloat(it.unit_price) || 0;
        const total = Math.round(qty * price * 100) / 100;
        if (it.item_type === 'PART') {
          partsSubtotal += total;
        } else {
          laborSubtotal += total;
        }
        return {
          ...it,
          quantity: qty,
          unit_price: price,
          total_price: total
        };
      });

      const subtotal = partsSubtotal + laborSubtotal;

      // Discount calculation
      let discVal = parseFloat(discount_value) || 0;
      let discAmount = 0;
      const discType = discount_type === 'percentage' ? 'percentage' : 'amount';

      if (discType === 'percentage') {
        discAmount = Math.round((subtotal * (discVal / 100)) * 100) / 100;
      } else {
        discAmount = Math.min(discVal, subtotal);
      }

      const taxableBase = Math.max(0, subtotal - discAmount);

      // Tax / VAT calculation
      const isTaxApplicable = tax_applicable ? 1 : 0;
      const rateTax = isTaxApplicable ? (parseFloat(tax_rate) || 13.0) : 0;
      const taxAmount = isTaxApplicable ? Math.round((taxableBase * (rateTax / 100)) * 100) / 100 : 0;

      const grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;
      const paid = Math.min(parseFloat(paid_amount) || 0, grandTotal);
      const due = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);

      let paymentStatus = 'PAID';
      if (due > 0 && paid > 0) {
        paymentStatus = 'PARTIAL';
      } else if (due > 0 && paid === 0) {
        paymentStatus = 'CREDIT';
      }

      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber();

      // 4. Insert Invoice
      const insertInv = db.prepare(`
        INSERT INTO invoices (
          invoice_number, date, customer_id, customer_name, customer_phone,
          vehicle_id, vehicle_plate, vehicle_model, odometer_km, mechanic_name,
          service_notes, next_service_km, next_service_date,
          parts_subtotal, labor_subtotal, subtotal,
          discount_type, discount_value, discount_amount,
          tax_applicable, tax_rate, tax_amount,
          grand_total, paid_amount, due_amount,
          payment_status, payment_method
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `);

      const invResult = insertInv.run(
        invoiceNumber, todayStr, customerId, customer_name.trim(), cleanPhone,
        vehicleId, cleanPlate, vehicle_model || '', currentKmNum, mechanic_name || '',
        service_notes || '', parseInt(next_service_km, 10) || (currentKmNum ? currentKmNum + 2000 : 0),
        next_service_date || '',
        partsSubtotal, laborSubtotal, subtotal,
        discType, discVal, discAmount,
        isTaxApplicable, rateTax, taxAmount,
        grandTotal, paid, due,
        paymentStatus, payment_method || 'CASH'
      );

      const invoiceId = invResult.lastInsertRowid;

      // 5. Insert Items & Deduct Stock
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, item_type, part_id, item_name, part_number, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE inventory SET 
          stock_quantity = stock_quantity - ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const insertTxStmt = db.prepare(`
        INSERT INTO stock_transactions (
          part_id, type, quantity, previous_stock, new_stock,
          unit_cost, reference_id, supplier_name, notes
        ) VALUES (?, 'BILL_SALE', ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        insertItemStmt.run(
          invoiceId, item.item_type, item.part_id || null,
          item.item_name, item.part_number || '', item.quantity,
          item.unit_price, item.total_price
        );

        // Deduct inventory if part
        if (item.item_type === 'PART' && item.part_id) {
          const currentPart = db.prepare('SELECT stock_quantity, cost_price FROM inventory WHERE id = ?').get(item.part_id);
          const prevQty = currentPart.stock_quantity;
          const newQty = prevQty - item.quantity;

          updateStockStmt.run(item.quantity, item.part_id);
          insertTxStmt.run(
            item.part_id,
            -item.quantity,
            prevQty,
            newQty,
            currentPart.cost_price,
            invoiceNumber,
            customer_name.trim(),
            `Billed on invoice ${invoiceNumber} for bike ${cleanPlate}`
          );
        }
      }

      // 6. Record Initial Payment
      if (paid > 0) {
        db.prepare(`
          INSERT INTO payment_records (
            invoice_id, customer_id, amount, payment_method, reference_note, payment_date
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(invoiceId, customerId, paid, payment_method || 'CASH', `Initial payment on bill creation`, todayStr);
      }

      db.exec('COMMIT;');

      const fullCreatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
      const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
      const workshopSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

      res.status(201).json({
        success: true,
        message: `Invoice ${invoiceNumber} created successfully`,
        data: {
          ...fullCreatedInvoice,
          items: invoiceItems,
          workshop: workshopSettings
        }
      });

    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('Invoice creation failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  recordInvoicePayment(req, res, id, body) {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const payAmount = parseFloat(body.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      res.status(400).json({ success: false, error: 'Payment amount must be greater than 0' });
      return;
    }

    if (payAmount > invoice.due_amount) {
      res.status(400).json({
        success: false,
        error: `Payment amount (${payAmount}) cannot exceed outstanding due balance (${invoice.due_amount})`
      });
      return;
    }

    const paymentMethod = body.payment_method || 'CASH';
    const paymentDate = body.payment_date || new Date().toISOString().slice(0, 10);
    const referenceNote = body.reference_note || 'Credit settlement payment';

    db.exec('BEGIN TRANSACTION;');
    try {
      const newPaid = Math.round((invoice.paid_amount + payAmount) * 100) / 100;
      const newDue = Math.max(0, Math.round((invoice.grand_total - newPaid) * 100) / 100);
      const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

      db.prepare(`
        UPDATE invoices SET
          paid_amount = ?,
          due_amount = ?,
          payment_status = ?,
          payment_method = ?
        WHERE id = ?
      `).run(newPaid, newDue, newStatus, paymentMethod, id);

      db.prepare(`
        INSERT INTO payment_records (
          invoice_id, customer_id, amount, payment_method, reference_note, payment_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, invoice.customer_id, payAmount, paymentMethod, referenceNote, paymentDate);

      db.exec('COMMIT;');

      const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
      res.json({
        success: true,
        message: `Payment of ${payAmount} recorded successfully. Remaining balance: ${newDue}`,
        data: updated
      });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  },

  voidInvoice(req, res, id) {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // Find all part items to restore stock
      const items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ? AND item_type = 'PART'").all(id);

      for (const item of items) {
        if (item.part_id) {
          const currentPart = db.prepare('SELECT stock_quantity, cost_price FROM inventory WHERE id = ?').get(item.part_id);
          if (currentPart) {
            const prevStock = currentPart.stock_quantity;
            const newStock = prevStock + item.quantity;

            db.prepare('UPDATE inventory SET stock_quantity = ? WHERE id = ?').run(newStock, item.part_id);
            db.prepare(`
              INSERT INTO stock_transactions (
                part_id, type, quantity, previous_stock, new_stock,
                unit_cost, reference_id, supplier_name, notes
              ) VALUES (?, 'RETURN', ?, ?, ?, ?, ?, 'VOIDED_INVOICE', 'Stock restored due to voided invoice')
            `).run(item.part_id, item.quantity, prevStock, newStock, currentPart.cost_price, invoice.invoice_number);
          }
        }
      }

      db.prepare('DELETE FROM payment_records WHERE invoice_id = ?').run(id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
      db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

      db.exec('COMMIT;');
      res.json({ success: true, message: `Invoice ${invoice.invoice_number} voided and stock restored` });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ----------------------------------------------------
  // SERVICES CATALOG
  // ----------------------------------------------------
  getServices(req, res) {
    const services = db.prepare('SELECT * FROM services ORDER BY name ASC').all();
    res.json({ success: true, data: services });
  },

  createService(req, res, body) {
    const { name, category, standard_charge, description } = body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Service name is required' });
      return;
    }
    const charge = parseFloat(standard_charge) || 0;
    const result = db.prepare(`
      INSERT INTO services (name, category, standard_charge, description)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), category || 'General', charge, description || '');

    const created = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Service added successfully', data: created });
  },

  updateService(req, res, id, body) {
    const { name, category, standard_charge, description } = body;
    db.prepare(`
      UPDATE services SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        standard_charge = COALESCE(?, standard_charge),
        description = COALESCE(?, description)
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      category,
      standard_charge !== undefined ? parseFloat(standard_charge) : null,
      description,
      id
    );

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json({ success: true, message: 'Service updated', data: updated });
  },

  deleteService(req, res, id) {
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
    res.json({ success: true, message: 'Service deleted' });
  },

  // ----------------------------------------------------
  // CUSTOMERS & VEHICLES
  // ----------------------------------------------------
  getCustomers(req, res, url) {
    const search = url.searchParams.get('search') || '';
    let query = `
      SELECT c.*, 
             COUNT(DISTINCT v.id) as vehicle_count,
             COUNT(DISTINCT i.id) as invoice_count,
             COALESCE(SUM(i.due_amount), 0) as total_due_amount
      FROM customers c
      LEFT JOIN vehicles v ON v.customer_id = c.id
      LEFT JOIN invoices i ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` GROUP BY c.id ORDER BY c.name ASC`;
    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  },

  getCustomerDetail(req, res, id) {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    const vehicles = db.prepare('SELECT * FROM vehicles WHERE customer_id = ?').all(id);
    const invoices = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY id DESC').all(id);

    res.json({
      success: true,
      data: {
        ...customer,
        vehicles,
        invoices
      }
    });
  },

  getVehicleHistory(req, res, plate) {
    const cleanPlate = decodeURIComponent(plate).trim().toUpperCase();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE plate_number = ?').get(cleanPlate);

    const invoices = db.prepare(`
      SELECT * FROM invoices 
      WHERE vehicle_plate = ? 
      ORDER BY id DESC
    `).all(cleanPlate);

    // Get item breakdown for each invoice
    const fullHistory = invoices.map(inv => {
      const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
      return { ...inv, items };
    });

    res.json({
      success: true,
      data: {
        vehicle: vehicle || { plate_number: cleanPlate, model: 'Unknown' },
        serviceHistory: fullHistory
      }
    });
  },

  // ----------------------------------------------------
  // REPORTS
  // ----------------------------------------------------
  getSalesReport(req, res, url) {
    const days = parseInt(url.searchParams.get('days'), 10) || 30;

    const dailySummary = db.prepare(`
      SELECT 
        date,
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_revenue,
        COALESCE(SUM(parts_subtotal), 0) as parts_revenue,
        COALESCE(SUM(labor_subtotal), 0) as labor_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_credit
      FROM invoices
      WHERE date >= date('now', '-' || ? || ' days')
      GROUP BY date
      ORDER BY date DESC
    `).all(days);

    // Top selling parts
    const topParts = db.prepare(`
      SELECT 
        ii.item_name,
        ii.part_number,
        SUM(ii.quantity) as total_qty_sold,
        SUM(ii.total_price) as total_amount
      FROM invoice_items ii
      WHERE ii.item_type = 'PART'
      GROUP BY ii.item_name
      ORDER BY total_qty_sold DESC
      LIMIT 10
    `).all();

    // Top services rendered
    const topServices = db.prepare(`
      SELECT 
        ii.item_name,
        COUNT(*) as times_performed,
        SUM(ii.total_price) as total_earned
      FROM invoice_items ii
      WHERE ii.item_type = 'LABOR'
      GROUP BY ii.item_name
      ORDER BY times_performed DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        dailySummary,
        topParts,
        topServices
      }
    });
  },

  getStockLedger(req, res, url) {
    const partId = url.searchParams.get('part_id');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit'), 10) || 100;

    let query = `
      SELECT st.*, inv.name as part_name, inv.part_number, inv.unit
      FROM stock_transactions st
      JOIN inventory inv ON inv.id = st.part_id
      WHERE 1=1
    `;
    const params = [];

    if (partId) {
      query += ` AND st.part_id = ?`;
      params.push(partId);
    }

    if (type && type !== 'ALL') {
      query += ` AND st.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY st.id DESC LIMIT ?`;
    params.push(limit);

    const ledger = db.prepare(query).all(...params);
    res.json({ success: true, data: ledger });
  },

  getStockValuation(req, res) {
    const summary = db.prepare(`
      SELECT 
        category,
        COUNT(*) as item_count,
        SUM(stock_quantity) as total_quantity,
        SUM(stock_quantity * cost_price) as total_cost_value,
        SUM(stock_quantity * selling_price) as total_retail_value,
        SUM(stock_quantity * (selling_price - cost_price)) as potential_profit
      FROM inventory
      GROUP BY category
      ORDER BY total_cost_value DESC
    `).all();

    const grand = db.prepare(`
      SELECT 
        COUNT(*) as total_distinct_items,
        SUM(stock_quantity) as total_units,
        SUM(stock_quantity * cost_price) as grand_cost_value,
        SUM(stock_quantity * selling_price) as grand_retail_value,
        SUM(stock_quantity * (selling_price - cost_price)) as grand_potential_profit
      FROM inventory
    `).get();

    res.json({
      success: true,
      data: {
        categoryBreakdown: summary,
        totals: grand
      }
    });
  },

  // ----------------------------------------------------
  // BACKUP & DEMO RESET
  // ----------------------------------------------------
  exportBackup(req, res) {
    const settings = db.prepare('SELECT * FROM settings').all();
    const inventory = db.prepare('SELECT * FROM inventory').all();
    const services = db.prepare('SELECT * FROM services').all();
    const customers = db.prepare('SELECT * FROM customers').all();
    const vehicles = db.prepare('SELECT * FROM vehicles').all();
    const invoices = db.prepare('SELECT * FROM invoices').all();
    const invoiceItems = db.prepare('SELECT * FROM invoice_items').all();
    const stockTransactions = db.prepare('SELECT * FROM stock_transactions').all();
    const payments = db.prepare('SELECT * FROM payment_records').all();

    const backupData = {
      exported_at: new Date().toISOString(),
      workshop: 'Koshi Motorcycle Workshop',
      version: '1.0.0',
      data: {
        settings,
        inventory,
        services,
        customers,
        vehicles,
        invoices,
        invoiceItems,
        stockTransactions,
        payments
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="koshi_workshop_backup_${Date.now()}.json"`);
    res.json(backupData);
  },

  resetDemoData(req, res) {
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM payment_records').run();
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM stock_transactions').run();
      db.prepare('DELETE FROM vehicles').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM services').run();
      db.prepare('DELETE FROM inventory').run();

      db.exec('COMMIT;');

      seedDefaultData();

      res.json({ success: true, message: 'Database reset and re-seeded with demo data successfully' });
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = routes;

