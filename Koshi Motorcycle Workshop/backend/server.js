const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const routes = require('./routes');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Safeguard max body size (5MB)
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => reject(err));
  });
}

function serveStatic(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  // If path doesn't exist, try serving index.html for SPA client-side routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${err.message}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Enhance res with helper
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    sendJson(this, this.statusCode || 200, data);
  };

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // API Routing
  if (pathname.startsWith('/api/')) {
    try {
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          body = await parseBody(req);
        } catch (err) {
          res.status(400).json({ success: false, error: err.message });
          return;
        }
      }

      // Auth
      if (pathname === '/api/auth/login' && method === 'POST') {
        return routes.login(req, res, body);
      }
      if (pathname === '/api/auth/change-password' && method === 'POST') {
        return routes.changePassword(req, res, body);
      }

      // Settings
      if (pathname === '/api/settings' && method === 'GET') {
        return routes.getSettings(req, res);
      }
      if (pathname === '/api/settings' && method === 'PUT') {
        return routes.updateSettings(req, res, body);
      }

      // Dashboard
      if (pathname === '/api/dashboard/stats' && method === 'GET') {
        return routes.getDashboardStats(req, res);
      }

      // Inventory
      if (pathname === '/api/inventory' && method === 'GET') {
        return routes.getInventory(req, res, parsedUrl);
      }
      if (pathname === '/api/inventory' && method === 'POST') {
        return routes.createInventoryItem(req, res, body);
      }
      if (pathname === '/api/inventory/categories' && method === 'GET') {
        return routes.getCategories(req, res);
      }
      if (pathname === '/api/inventory/low-stock' && method === 'GET') {
        return routes.getLowStockItems(req, res);
      }

      // Inventory Item specific routes
      const invMatch = pathname.match(/^\/api\/inventory\/(\d+)$/);
      if (invMatch) {
        const id = parseInt(invMatch[1], 10);
        if (method === 'GET') return routes.getInventoryItem(req, res, id);
        if (method === 'PUT') return routes.updateInventoryItem(req, res, id, body);
        if (method === 'DELETE') return routes.deleteInventoryItem(req, res, id);
      }

      const invRestockMatch = pathname.match(/^\/api\/inventory\/(\d+)\/restock$/);
      if (invRestockMatch && method === 'POST') {
        return routes.restockInventoryItem(req, res, parseInt(invRestockMatch[1], 10), body);
      }

      const invAdjustMatch = pathname.match(/^\/api\/inventory\/(\d+)\/adjust$/);
      if (invAdjustMatch && method === 'POST') {
        return routes.adjustInventoryItem(req, res, parseInt(invAdjustMatch[1], 10), body);
      }

      // Billing & Invoices
      if (pathname === '/api/billing/next-number' && method === 'GET') {
        return routes.getNextInvoiceNumber(req, res);
      }
      if (pathname === '/api/billing/invoices' && method === 'GET') {
        return routes.getInvoices(req, res, parsedUrl);
      }
      if (pathname === '/api/billing/invoices' && method === 'POST') {
        return routes.createInvoice(req, res, body);
      }

      const invDetailMatch = pathname.match(/^\/api\/billing\/invoices\/(\d+)$/);
      if (invDetailMatch) {
        const id = parseInt(invDetailMatch[1], 10);
        if (method === 'GET') return routes.getInvoiceDetail(req, res, id);
        if (method === 'DELETE') return routes.voidInvoice(req, res, id);
      }

      const invPayMatch = pathname.match(/^\/api\/billing\/invoices\/(\d+)\/payment$/);
      if (invPayMatch && method === 'POST') {
        return routes.recordInvoicePayment(req, res, parseInt(invPayMatch[1], 10), body);
      }

      // Services Catalog
      if (pathname === '/api/services' && method === 'GET') {
        return routes.getServices(req, res);
      }
      if (pathname === '/api/services' && method === 'POST') {
        return routes.createService(req, res, body);
      }
      const servMatch = pathname.match(/^\/api\/services\/(\d+)$/);
      if (servMatch) {
        const id = parseInt(servMatch[1], 10);
        if (method === 'PUT') return routes.updateService(req, res, id, body);
        if (method === 'DELETE') return routes.deleteService(req, res, id);
      }

      // Customers & Vehicles
      if (pathname === '/api/customers' && method === 'GET') {
        return routes.getCustomers(req, res, parsedUrl);
      }
      const custMatch = pathname.match(/^\/api\/customers\/(\d+)$/);
      if (custMatch && method === 'GET') {
        return routes.getCustomerDetail(req, res, parseInt(custMatch[1], 10));
      }

      const vehHistoryMatch = pathname.match(/^\/api\/vehicles\/([^/]+)\/history$/);
      if (vehHistoryMatch && method === 'GET') {
        return routes.getVehicleHistory(req, res, vehHistoryMatch[1]);
      }

      // Reports
      if (pathname === '/api/reports/sales' && method === 'GET') {
        return routes.getSalesReport(req, res, parsedUrl);
      }
      if (pathname === '/api/reports/stock-ledger' && method === 'GET') {
        return routes.getStockLedger(req, res, parsedUrl);
      }
      if (pathname === '/api/reports/valuation' && method === 'GET') {
        return routes.getStockValuation(req, res);
      }

      // Backup & Demo
      if (pathname === '/api/backup/export' && method === 'GET') {
        return routes.exportBackup(req, res);
      }
      if (pathname === '/api/backup/reset-demo' && method === 'POST') {
        return routes.resetDemoData(req, res);
      }

      // Route not found
      res.status(404).json({ success: false, error: `API route not found: ${method} ${pathname}` });
    } catch (err) {
      console.error('Server internal error:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
    return;
  }

  // Serve static UI files
  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🏍️  KOSHI MOTORCYCLE WORKSHOP SOFTWARE STARTED    `);
  console.log(`  📍 Local: http://localhost:${PORT}                 `);
  console.log(`  ⚡ Network: http://0.0.0.0:${PORT}                 `);
  console.log(`====================================================`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    process.exit(0);
  });
});

