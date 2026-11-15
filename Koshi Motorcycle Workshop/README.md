# 🏍️ Koshi Motorcycle Workshop Management System
### Complete Billing & Stock Management Inventory Software

A robust, ultra-fast, and modern management software crafted specifically for **Koshi Motorcycle Workshop** (Biratnagar, Koshi Province, Nepal). Built with pure Node.js and native SQLite, requiring **zero external dependencies** and providing instant offline/online capabilities.

---

## 🚀 Quick Start (One-Click Launch)

### On Windows:
Simply **double-click** the file:
```
start.bat
```
*This will automatically launch the backend server and open the software in your default web browser at `http://localhost:5000`.*

### Or via Terminal / Command Prompt:
```bash
npm start
```
Then open your web browser and navigate to:
```
http://localhost:5000
```

---

## 🌟 Key Functional Features

### 1. 🧾 Point of Sale (POS) & Billing System
- **Customer Details**: Auto-suggests returning customers by mobile phone number or name; remembers addresses.
- **Motorcycle Specification**: Record number plate (e.g. `KO 1 PA 4521`), bike model (e.g. *Bajaj Pulsar 150*, *Honda CB Shine*, *Yamaha FZS*, *TVS Apache*), and current odometer reading (KM).
- **Automated Next Service Reminder**: Automatically calculates next service mileage (+2,000 KM) and prints it on the receipt.
- **Spare Parts Integration**:
  - Live search from warehouse stock with real-time in-stock badge.
  - Automatically loads retail selling price.
  - Validates stock availability to prevent overselling.
  - **Instantly deducts stock quantities** upon finalizing the bill with atomic transaction durability.
- **Labor & Service Charges**:
  - Quick-select from standard workshop services (Full Servicing, Oil Change, Brake Overhaul, Carburetor Ultrasonic Clean, Chain Slack Adjustment, Fork Oil Seal Change, etc.).
  - Add custom labor charges on the fly.
- **Financial Calculations**:
  - Subtotals separated by Spare Parts and Labor.
  - Discount calculation (Flat Amount in Rs. or Percentage %).
  - Optional 13% Tax/VAT toggle (for non-VAT cash estimates or official tax invoices).
  - Prominent Grand Total display.
- **Payment Modes & Credit (Udharo) Tracking**:
  - Support for **Cash**, **Fonepay / QR Code**, **eSewa Mobile Wallet**, **Bank Transfer**, **Card Swipe**, and **Credit (Udharo)**.
  - Supports partial payments: automatically computes and tracks remaining due balance.
- **Printable Invoices & Receipts**:
  - **📄 Standard A4 Workshop Invoice**: Official bill with workshop header, PAN/VAT, customer specs, vehicle specs, itemized table of parts and labor, notes, and dual signature blocks (Customer & Authorized Workshop Seal).
  - **🖨️ 80mm POS Thermal Receipt**: Compact slip layout optimized for thermal receipt printers.
  - One-click print (`Ctrl+P` / Print button) with clean vector formatting.

---

### 2. 📦 Stock Management & Spare Parts Inventory
- **Comprehensive Parts Catalog**:
  - Pre-seeded with 35+ realistic motorcycle spare parts and lubricants (Castrol, Motul, Bajaj Genuine, Honda Genuine, Yamaha, TVS, Hero, Rolon, NGK, Bosch, Amaron, MRF, CEAT).
  - Categorized under:
    - *Engine Oil & Lubricants*
    - *Braking System*
    - *Engine & Transmission*
    - *Filters & Consumables*
    - *Cables & Controls*
    - *Electrical & Lighting*
    - *Suspension & Steering*
    - *Tires & Tubes*
    - *General Spares*
- **Cost vs. Selling Price & Margins**:
  - Track purchase cost price, retail selling price, and profit margin percentage.
- **Stock Status Badges**:
  - 🟢 **In Stock** (Safe stock level)
  - 🟡 **Low Stock Alert** (At or below minimum alert threshold)
  - 🔴 **Out of Stock** (Zero inventory)
- **Warehouse Storage Tracking**:
  - Shelf and rack location tracking (e.g. `Rack A1`, `Brake Shelf 2`, `Battery Rack`).
- **Quick Restock (Stock-In)**:
  - Fast dialog to receive new stock from distributors, enter quantity, update cost/selling prices, and record supplier purchase bill references.
- **Physical Stock Audit & Adjustments**:
  - Ability to adjust stock for physical audit counts, damage, or returns with audit notes.
- **Complete Stock Movement Ledger**:
  - Immutable audit trail recording every inventory change: bill sales, supplier restocks, void returns, and manual adjustments with timestamps and references.

---

### 3. 🏍️ Vehicle Service History & Customer Ledger
- **Motorcycle Lifetime Maintenance Timeline**:
  - Enter any vehicle number plate to view its entire historical record: past visit dates, odometer readings, assigned mechanic, diagnosis notes, and an itemized breakdown of every spare part replaced!
- **Customer Dues Management**:
  - Track total outstanding credit per customer.
  - One-click **"Pay Due"** modal to record debt settlements with cash, eSewa, or Fonepay references.

---

### 4. 📈 Reports, Analytics & Valuation
- **Inventory Valuation**:
  - Total purchase investment value vs. total potential retail turnover.
  - Expected unrealized profit margin by category.
- **Sales Trends**:
  - 30-day daily breakdown of total revenue, parts revenue, labor revenue, and collections.
  - Top 10 fast-moving spare parts.
  - Top 10 most requested workshop services.

---

### 5. ⚙️ Workshop Settings & Data Security
- **Customizable Business Profile**:
  - Workshop Name (default: *Koshi Motorcycle Workshop*)
  - Address (default: *Main Road, Biratnagar, Koshi Province, Nepal*)
  - Contact Numbers & Email
  - PAN / VAT Number
  - Currency Symbol (default: *Rs.*)
  - Receipt footer note & terms
- **Standard Labor Charges Catalog**:
  - Add, edit, or remove standard workshop labor fees.
- **One-Click Database Backup**:
  - Download full SQLite database snapshot as a single `.json` backup file.
- **Reset / Reload Demo Data**:
  - Easily reset and re-populate the sample 35 parts, customers, and services at any time.

---

## 📁 Project Architecture

```
Koshi Motorcycle Workshop/
├── backend/
│   ├── db.js             # Native SQLite database setup, schema & sample seed data
│   ├── routes.js         # Complete REST API handlers & transactional business logic
│   └── server.js         # Zero-dependency HTTP server with CORS & static file server
├── public/
│   ├── css/
│   │   └── style.css     # Clean design system, UI components, and @media print rules
│   ├── js/
│   │   ├── api.js        # Client fetch wrapper
│   │   ├── app.js        # Main UI orchestrator, modals & print receipt renderer
│   │   └── views/
│   │       ├── dashboard.js  # Dashboard overview & low stock alerts
│   │       ├── billing.js    # POS billing & invoice generator
│   │       ├── inventory.js  # Inventory table, filters, restock & edit
│   │       ├── invoices.js   # Invoices history & credit settlement
│   │       ├── customers.js  # Customer directory & vehicle service history
│   │       ├── reports.js    # Stock movement ledger & sales analytics
│   │       └── settings.js   # Workshop settings & backup download
│   └── index.html        # Single-Page Application interface
├── data/
│   └── workshop.db       # Persistent SQLite Database
├── start.bat             # One-click Windows starter script
├── package.json          # Node scripts
└── README.md             # Documentation
```

---

## 🛠️ Technology Stack
- **Backend**: Node.js (`node:http`, `node:sqlite`, `node:fs`, `node:path`)
- **Database**: SQLite (ACID compliant, zero installation, synchronous transactions, WAL mode)
- **Frontend**: Pure HTML5, Modern CSS3 with custom variables, and Vanilla JavaScript (ES6+ modular views)
- **External Dependencies**: **0** (Runs completely offline, instant boot in ~50ms)

---

Developed for **Koshi Motorcycle Workshop**.
Drive Safely! 🏍️

