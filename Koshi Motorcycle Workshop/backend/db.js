const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'workshop.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      workshop_name TEXT NOT NULL DEFAULT 'Koshi Motorcycle Workshop',
      tagline TEXT DEFAULT 'Two-Wheeler Servicing & Genuine Spare Parts',
      address TEXT DEFAULT 'Main Road, Biratnagar, Koshi Province, Nepal',
      phone TEXT DEFAULT '+977-9800000000 / 021-500000',
      email TEXT DEFAULT 'koshimotorcycles@gmail.com',
      pan_vat TEXT DEFAULT 'PAN: 601234567',
      currency TEXT DEFAULT 'Rs.',
      tax_rate REAL DEFAULT 13.0,
      receipt_footer TEXT DEFAULT 'Thank you for choosing Koshi Motorcycle Workshop! Drive safely. Recommended servicing interval: 2,000 KM or 3 months.'
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      compatible_models TEXT,
      unit TEXT DEFAULT 'pcs',
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 5,
      location_rack TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- 'PURCHASE_RESTOCK', 'BILL_SALE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_DEDUCT', 'RETURN'
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      unit_cost REAL,
      reference_id TEXT, -- Invoice # or Purchase Bill #
      supplier_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      standard_charge REAL NOT NULL DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      plate_number TEXT NOT NULL UNIQUE,
      model TEXT NOT NULL,
      chassis_number TEXT,
      engine_number TEXT,
      color TEXT,
      current_km INTEGER DEFAULT 0,
      last_service_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      vehicle_plate TEXT NOT NULL,
      vehicle_model TEXT,
      odometer_km INTEGER DEFAULT 0,
      mechanic_name TEXT,
      service_notes TEXT,
      next_service_km INTEGER DEFAULT 0,
      next_service_date TEXT,
      parts_subtotal REAL DEFAULT 0,
      labor_subtotal REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'amount', -- 'amount' or 'percentage'
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_applicable INTEGER DEFAULT 0, -- 0 = No VAT, 1 = VAT Applied
      tax_rate REAL DEFAULT 13.0,
      tax_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'CREDIT'
      payment_method TEXT DEFAULT 'CASH', -- 'CASH', 'FONEPAY_QR', 'ESEWA', 'BANK_TRANSFER', 'CARD', 'CREDIT'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL, -- 'PART' or 'LABOR'
      part_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
      item_name TEXT NOT NULL,
      part_number TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_note TEXT,
      payment_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure default settings row exists
    INSERT OR IGNORE INTO settings (id) VALUES (1);

    -- Ensure default admin user exists (Username: admin / Password: admin123)
    INSERT OR IGNORE INTO users (id, username, password, full_name, role)
    VALUES (1, 'admin', 'admin123', 'Workshop Owner / Manager', 'admin');
  `);

  // Check if inventory has any items; if empty, seed rich sample data
  const countRow = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
  if (countRow.count === 0) {
    seedDefaultData();
  }
}

function seedDefaultData() {
  const seedParts = [
    // Engine Oil & Lubricants
    { part_number: 'OIL-CAS-20W40', name: 'Castrol Activ 20W-40 4T (1L)', category: 'Engine Oil & Lubricants', brand: 'Castrol', compatible_models: 'Universal 4T Bikes', unit: 'bottle', cost_price: 520, selling_price: 650, stock_quantity: 24, min_stock_alert: 6, location_rack: 'Oil Rack A1' },
    { part_number: 'OIL-MOT-10W40', name: 'Motul 7100 4T 10W-40 Synthetic (1L)', category: 'Engine Oil & Lubricants', brand: 'Motul', compatible_models: 'Pulsar NS200, Duke, FZ, MT-15', unit: 'bottle', cost_price: 1150, selling_price: 1450, stock_quantity: 12, min_stock_alert: 4, location_rack: 'Oil Rack A2' },
    { part_number: 'OIL-BAJ-20W50', name: 'Bajaj Genuine DTS-i 20W-50 Oil (1.15L)', category: 'Engine Oil & Lubricants', brand: 'Bajaj Genuine', compatible_models: 'Pulsar 150/180/220, Avenger', unit: 'bottle', cost_price: 640, selling_price: 780, stock_quantity: 18, min_stock_alert: 5, location_rack: 'Oil Rack A1' },
    { part_number: 'OIL-HON-10W30', name: 'Honda Genuine 4T 10W-30 (800ml)', category: 'Engine Oil & Lubricants', brand: 'Honda Genuine', compatible_models: 'Honda Dio, Activa, Aviator, Grazia', unit: 'bottle', cost_price: 430, selling_price: 540, stock_quantity: 15, min_stock_alert: 5, location_rack: 'Oil Rack A3' },
    { part_number: 'LUB-CHN-SPRY', name: 'Motul Chain Lube C2 Spray (400ml)', category: 'Engine Oil & Lubricants', brand: 'Motul', compatible_models: 'All O-Ring/X-Ring Chains', unit: 'can', cost_price: 580, selling_price: 750, stock_quantity: 10, min_stock_alert: 3, location_rack: 'Rack B1' },
    { part_number: 'LUB-FORK-350', name: 'Front Fork Suspension Oil (350ml)', category: 'Engine Oil & Lubricants', brand: 'Endurance', compatible_models: 'Universal', unit: 'bottle', cost_price: 160, selling_price: 240, stock_quantity: 14, min_stock_alert: 4, location_rack: 'Rack B1' },

    // Braking System
    { part_number: 'BRK-SHOE-HON', name: 'Brake Shoe Set Rear (Honda Shine/Dio)', category: 'Braking System', brand: 'Honda Genuine', compatible_models: 'Shine, Unicorn, Dio, Activa', unit: 'set', cost_price: 260, selling_price: 380, stock_quantity: 20, min_stock_alert: 5, location_rack: 'Brake Shelf 1' },
    { part_number: 'BRK-PAD-PLS-F', name: 'Front Disc Brake Pad (Pulsar 150/220)', category: 'Braking System', brand: 'Bajaj Genuine', compatible_models: 'Pulsar 150/180/220, Discover', unit: 'set', cost_price: 220, selling_price: 340, stock_quantity: 16, min_stock_alert: 4, location_rack: 'Brake Shelf 2' },
    { part_number: 'BRK-PAD-FZS-F', name: 'Front Disc Brake Pad (Yamaha FZ/FZS)', category: 'Braking System', brand: 'Yamaha Genuine', compatible_models: 'FZ, FZS V2/V3, RayZR', unit: 'set', cost_price: 340, selling_price: 490, stock_quantity: 8, min_stock_alert: 3, location_rack: 'Brake Shelf 2' },
    { part_number: 'BRK-OIL-DOT4', name: 'Hydraulic Brake Fluid DOT-4 (250ml)', category: 'Braking System', brand: 'Bosch', compatible_models: 'All Disc Brake Motorcycles', unit: 'bottle', cost_price: 180, selling_price: 260, stock_quantity: 15, min_stock_alert: 5, location_rack: 'Brake Shelf 3' },
    { part_number: 'BRK-LEVR-BAJ', name: 'Front Brake Lever (Bajaj Black)', category: 'Braking System', brand: 'Swiss', compatible_models: 'Pulsar / Discover / Platina', unit: 'pcs', cost_price: 110, selling_price: 190, stock_quantity: 12, min_stock_alert: 3, location_rack: 'Lever Bin' },

    // Engine & Transmission
    { part_number: 'SPK-NGK-CPR8', name: 'NGK Spark Plug CPR8EA-9 Resistor', category: 'Engine & Transmission', brand: 'NGK', compatible_models: 'FZ, Pulsar, Apache, R15', unit: 'pcs', cost_price: 190, selling_price: 280, stock_quantity: 30, min_stock_alert: 8, location_rack: 'Electrical Box 1' },
    { part_number: 'SPK-CHAMP-BAJ', name: 'Champion Spark Plug RG6HCC', category: 'Engine & Transmission', brand: 'Champion', compatible_models: 'Bajaj Pulsar 150/180 Twin Spark', unit: 'pcs', cost_price: 140, selling_price: 220, stock_quantity: 25, min_stock_alert: 6, location_rack: 'Electrical Box 1' },
    { part_number: 'CLT-PLT-PLS150', name: 'Clutch Plate Friction Disk Set (Pulsar 150)', category: 'Engine & Transmission', brand: 'Bajaj Genuine', compatible_models: 'Pulsar 150 / 180', unit: 'set', cost_price: 780, selling_price: 1100, stock_quantity: 6, min_stock_alert: 2, location_rack: 'Clutch Rack C1' },
    { part_number: 'CLT-PLT-SPLND', name: 'Clutch Plate Set (Hero Splendor / Deluxe)', category: 'Engine & Transmission', brand: 'Hero Genuine', compatible_models: 'Splendor, Passion, HF Deluxe', unit: 'set', cost_price: 490, selling_price: 720, stock_quantity: 7, min_stock_alert: 3, location_rack: 'Clutch Rack C1' },
    { part_number: 'CHN-SPRK-PLS150', name: 'Chain Sprocket Kit 428-120L (Pulsar 150)', category: 'Engine & Transmission', brand: 'Rolon', compatible_models: 'Pulsar 150 UG4/UG5', unit: 'set', cost_price: 1450, selling_price: 1950, stock_quantity: 4, min_stock_alert: 2, location_rack: 'Chain Rack D1' },
    { part_number: 'CHN-SPRK-FZS', name: 'Drive Chain Sprocket Set (Yamaha FZ/FZS)', category: 'Engine & Transmission', brand: 'Rolon', compatible_models: 'Yamaha FZ V1/V2/V3', unit: 'set', cost_price: 1650, selling_price: 2200, stock_quantity: 3, min_stock_alert: 2, location_rack: 'Chain Rack D1' },

    // Filters & Consumables
    { part_number: 'FLT-AIR-PLS', name: 'Air Filter Sponge Element (Pulsar 150/180)', category: 'Filters & Consumables', brand: 'Bajaj Genuine', compatible_models: 'Pulsar 150/180/220', unit: 'pcs', cost_price: 90, selling_price: 160, stock_quantity: 22, min_stock_alert: 5, location_rack: 'Filter Bin 1' },
    { part_number: 'FLT-AIR-HON-SHN', name: 'Paper Air Filter Cartridge (Honda Shine)', category: 'Filters & Consumables', brand: 'Honda Genuine', compatible_models: 'Honda Shine 125, SP125', unit: 'pcs', cost_price: 180, selling_price: 280, stock_quantity: 14, min_stock_alert: 4, location_rack: 'Filter Bin 2' },
    { part_number: 'FLT-OIL-PULSAR', name: 'Engine Oil Strainer / Filter Paper (Pulsar/Apache)', category: 'Filters & Consumables', brand: 'Uno Minda', compatible_models: 'Pulsar 200NS, TVS Apache RTR', unit: 'pcs', cost_price: 65, selling_price: 120, stock_quantity: 18, min_stock_alert: 5, location_rack: 'Filter Bin 3' },
    { part_number: 'GSK-CLT-PLS', name: 'Clutch Cover Gasket (Bajaj Pulsar)', category: 'Filters & Consumables', brand: 'Apex', compatible_models: 'Pulsar 150/180', unit: 'pcs', cost_price: 45, selling_price: 90, stock_quantity: 15, min_stock_alert: 5, location_rack: 'Gasket Drawer' },

    // Cables & Controls
    { part_number: 'CBL-CLT-PLS', name: 'Clutch Cable Wire Assembly (Pulsar 150)', category: 'Cables & Controls', brand: 'Suprajit', compatible_models: 'Pulsar 150 UG4', unit: 'pcs', cost_price: 130, selling_price: 220, stock_quantity: 10, min_stock_alert: 3, location_rack: 'Cable Hook 1' },
    { part_number: 'CBL-ACC-FZS', name: 'Accelerator / Throttle Cable (Yamaha FZ)', category: 'Cables & Controls', brand: 'Suprajit', compatible_models: 'Yamaha FZ / FZS', unit: 'pcs', cost_price: 150, selling_price: 250, stock_quantity: 8, min_stock_alert: 2, location_rack: 'Cable Hook 2' },
    { part_number: 'CBL-SPD-HON', name: 'Speedometer Cable (Honda Shine)', category: 'Cables & Controls', brand: 'Suprajit', compatible_models: 'Honda Shine / Unicorn', unit: 'pcs', cost_price: 110, selling_price: 190, stock_quantity: 9, min_stock_alert: 3, location_rack: 'Cable Hook 3' },

    // Electrical & Lighting
    { part_number: 'ELC-BAT-12V4AH', name: '12V 4Ah Maintenance Free VRLA Battery', category: 'Electrical & Lighting', brand: 'Exide Xtreme', compatible_models: 'Hero, Honda, Bajaj Self Start', unit: 'pcs', cost_price: 1750, selling_price: 2350, stock_quantity: 5, min_stock_alert: 2, location_rack: 'Battery Rack' },
    { part_number: 'ELC-BAT-12V5AH', name: '12V 5Ah VRLA Motorcycle Battery', category: 'Electrical & Lighting', brand: 'Amaron Pro Bike', compatible_models: 'Pulsar 150/220, Yamaha FZ', unit: 'pcs', cost_price: 2100, selling_price: 2800, stock_quantity: 4, min_stock_alert: 2, location_rack: 'Battery Rack' },
    { part_number: 'ELC-BLB-H4-12V', name: 'Halogen Headlight Bulb H4 12V 35/35W', category: 'Electrical & Lighting', brand: 'Osram Original', compatible_models: 'Universal 35W Bikes', unit: 'pcs', cost_price: 120, selling_price: 200, stock_quantity: 16, min_stock_alert: 4, location_rack: 'Bulb Box' },
    { part_number: 'ELC-LED-H4', name: 'High-Power White LED Headlight Bulb H4', category: 'Electrical & Lighting', brand: 'NightEye', compatible_models: 'Universal H4 Socket', unit: 'pcs', cost_price: 450, selling_price: 750, stock_quantity: 6, min_stock_alert: 2, location_rack: 'Bulb Box' },
    { part_number: 'ELC-INDC-BLB', name: 'Indicator Bulb Amber 12V 10W (Set of 4)', category: 'Electrical & Lighting', brand: 'Lucas TVS', compatible_models: 'Universal', unit: 'set', cost_price: 80, selling_price: 150, stock_quantity: 20, min_stock_alert: 5, location_rack: 'Bulb Box' },
    { part_number: 'ELC-REL-STRT', name: 'Self Starter Relay Solenoid (Bajaj/TVS)', category: 'Electrical & Lighting', brand: 'Varroc', compatible_models: 'Pulsar, Apache, Discover', unit: 'pcs', cost_price: 280, selling_price: 420, stock_quantity: 7, min_stock_alert: 2, location_rack: 'Electrical Box 2' },

    // Suspension & Bearings
    { part_number: 'SUS-SEAL-FORK', name: 'Front Fork Oil Seal Pair (31mm/33mm)', category: 'Suspension & Steering', brand: 'Endurance', compatible_models: 'Pulsar, FZ, Shine, Apache', unit: 'pair', cost_price: 140, selling_price: 250, stock_quantity: 11, min_stock_alert: 3, location_rack: 'Seal Box' },
    { part_number: 'BRG-WHL-6202', name: 'Wheel Ball Bearing 6202-2RS', category: 'Suspension & Steering', brand: 'SKF Original', compatible_models: 'Universal Front/Rear Hubs', unit: 'pcs', cost_price: 120, selling_price: 200, stock_quantity: 15, min_stock_alert: 4, location_rack: 'Bearing Drawer' },
    { part_number: 'BRG-CONE-SET', name: 'Handle Steering Cone Bearing Set', category: 'Suspension & Steering', brand: 'Rolon / Endurance', compatible_models: 'Pulsar 150/180/220', unit: 'set', cost_price: 360, selling_price: 550, stock_quantity: 5, min_stock_alert: 2, location_rack: 'Bearing Drawer' },

    // Tires & Tubes
    { part_number: 'TYR-TUB-MRF-17', name: 'Motorcycle Butyl Inner Tube 3.00-17 / 100/90-17', category: 'Tires & Tubes', brand: 'MRF Original', compatible_models: 'Pulsar, FZ, Apache Rear 17-inch', unit: 'pcs', cost_price: 340, selling_price: 480, stock_quantity: 12, min_stock_alert: 4, location_rack: 'Tire Area' },
    { part_number: 'TYR-CEAT-GRIPP', name: 'Tubeless Tire CEAT Gripp F 90/90-17', category: 'Tires & Tubes', brand: 'CEAT', compatible_models: 'Pulsar 150/180/220 Front', unit: 'pcs', cost_price: 2600, selling_price: 3300, stock_quantity: 3, min_stock_alert: 2, location_rack: 'Tire Area' }
  ];

  const insertPart = db.prepare(`
    INSERT INTO inventory (part_number, name, category, brand, compatible_models, unit, cost_price, selling_price, stock_quantity, min_stock_alert, location_rack)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTx = db.prepare(`
    INSERT INTO stock_transactions (part_id, type, quantity, previous_stock, new_stock, unit_cost, reference_id, supplier_name, notes)
    VALUES (?, 'PURCHASE_RESTOCK', ?, 0, ?, ?, 'INIT-OPENING-STOCK', 'Primary Distributor Biratnagar', 'Initial Opening Stock Setup')
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const part of seedParts) {
      const res = insertPart.run(
        part.part_number, part.name, part.category, part.brand, part.compatible_models,
        part.unit, part.cost_price, part.selling_price, part.stock_quantity, part.min_stock_alert, part.location_rack
      );
      insertTx.run(res.lastInsertRowid, part.stock_quantity, part.stock_quantity, part.cost_price);
    }

    // Seed Standard Workshop Services
    const seedServices = [
      { name: 'Full Periodic Servicing (Tuning, Washing, Filter Clean, Chain Tightening, Brakes)', category: 'General Servicing', charge: 500, desc: 'Complete 25-point inspection & standard service' },
      { name: 'Bike Washing & High-Pressure Foam Clean', category: 'Cleaning & Detailing', charge: 150, desc: 'Thorough foam shampoo wash & polish' },
      { name: 'Engine Oil & Filter Change Service', category: 'Periodic Care', charge: 100, desc: 'Drain, replace filter, refill new engine oil' },
      { name: 'Front & Rear Brake Servicing (Pad/Shoe cleaning & adjustment)', category: 'Braking', charge: 250, desc: 'Clean drum/caliper, grease pins, adjust free play' },
      { name: 'Disc Brake Bleeding & Hydraulic Oil Flush', category: 'Braking', charge: 200, desc: 'Flush old DOT fluid, refill and bleed air bubbles' },
      { name: 'Drive Chain Slack Adjustment & Chain Lube', category: 'Transmission', charge: 100, desc: 'Adjust chain tension and lubricate with Motul spray' },
      { name: 'Clutch Cable / Accelerator Cable Replacement Labor', category: 'Cables & Controls', charge: 120, desc: 'Install new cable and route properly' },
      { name: 'Clutch Plate Replacement Labor', category: 'Engine & Transmission', charge: 450, desc: 'Open clutch cover, inspect hub, install friction discs' },
      { name: 'Chain Sprocket Set Installation Labor', category: 'Engine & Transmission', charge: 400, desc: 'Replace front and rear sprockets and drive chain' },
      { name: 'Carburetor Ultrasonic Clean & Idle Air Tuning', category: 'Fuel System', charge: 350, desc: 'Dismantle, clean jets, adjust fuel-air mixture' },
      { name: 'Front Fork Suspension Overhaul & Oil Seal Change', category: 'Suspension', charge: 550, desc: 'Dismantle both forks, clean internals, replace seals and fork oil' },
      { name: 'Electrical Wiring Troubleshooting & Battery Check', category: 'Electrical', charge: 300, desc: 'Inspect stator coil, rectifier, fuse, horn & starter wiring' },
      { name: 'Tire Replacement & Puncture Fix (Tubeless/Tube)', category: 'Tires', charge: 150, desc: 'Mount new tire, balance bead and inflate' },
      { name: 'Half Engine Overhaul (Valves, Piston Rings, Cylinder Bore)', category: 'Major Engine Work', charge: 2500, desc: 'Top-end engine rebuild with new rings, valve lapping, gaskets' }
    ];

    const insertService = db.prepare(`
      INSERT INTO services (name, category, standard_charge, description)
      VALUES (?, ?, ?, ?)
    `);

    for (const s of seedServices) {
      insertService.run(s.name, s.category, s.charge, s.desc);
    }

    // Seed Sample Customers & Vehicles
    const seedCustomers = [
      { name: 'Ramesh Adhikari', phone: '9842011223', address: 'Bargachhi, Biratnagar-3', plate: 'Ko 1 Pa 4521', model: 'Bajaj Pulsar 150 UG4' },
      { name: 'Sunil Kumar Chaudhary', phone: '9819324567', address: 'Dharan Road, Itahari', plate: 'Pradesh 1-02-001 Pa 8890', model: 'Honda CB Shine 125' },
      { name: 'Bikash Shrestha', phone: '9804055667', address: 'Traffic Chowk, Biratnagar', plate: 'Ba 2 Pa 3345', model: 'Yamaha FZS V3 FI' },
      { name: 'Deepak Thapa', phone: '9842199880', address: 'Inaruwa, Sunsari', plate: 'Ko 2 Pa 9122', model: 'TVS Apache RTR 160 4V' }
    ];

    const insertCust = db.prepare(`INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`);
    const insertVeh = db.prepare(`INSERT INTO vehicles (customer_id, plate_number, model, current_km) VALUES (?, ?, ?, ?)`);

    for (const c of seedCustomers) {
      const cRes = insertCust.run(c.name, c.phone, c.address);
      insertVeh.run(cRes.lastInsertRowid, c.plate, c.model, 18500);
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Failed to seed default data:', err);
  }
}

// Initialize on load
initializeDatabase();

module.exports = {
  db,
  initializeDatabase,
  seedDefaultData
};

