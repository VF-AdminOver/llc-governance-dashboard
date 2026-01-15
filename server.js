import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcrypt';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Session middleware
app.use(session({
  secret: 'llc-governance-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Database setup
const dbPath = path.join(__dirname, 'governance.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table for authentication
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    household_id INTEGER,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households (id)
  )`);

  // Households table
  db.run(`CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Members table
  db.run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    household_id INTEGER,
    name TEXT NOT NULL,
    units INTEGER DEFAULT 1,
    ownership_percentage REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (household_id) REFERENCES households (id)
  )`);

  // Expenses table
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_by INTEGER,
    FOREIGN KEY (household_id) REFERENCES households (id),
    FOREIGN KEY (paid_by) REFERENCES members (id)
  )`);

  // Proposals table
  db.run(`CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    options TEXT,
    quorum_percentage INTEGER DEFAULT 50,
    threshold_percentage INTEGER DEFAULT 51,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Votes table
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER,
    user_id INTEGER,
    vote TEXT NOT NULL,
    voted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(proposal_id, user_id)
  )`);

  // Dividends table
  db.run(`CREATE TABLE IF NOT EXISTS dividends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    amount REAL NOT NULL,
    distribution_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
  )`);

  // Dividend distributions table
  db.run(`CREATE TABLE IF NOT EXISTS dividend_distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dividend_id INTEGER,
    member_id INTEGER,
    amount REAL NOT NULL,
    reinvested REAL DEFAULT 0,
    FOREIGN KEY (dividend_id) REFERENCES dividends (id),
    FOREIGN KEY (member_id) REFERENCES members (id)
  )`);

  // Documents table
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT,
    data BLOB,
    uploaded_by INTEGER,
    uploaded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households (id),
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
  )`);

  // Contributions table for ownership ledger
  db.run(`CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL DEFAULT 0,
    hours REAL DEFAULT 0,
    evidence TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    converted_units REAL DEFAULT 0,
    FOREIGN KEY (member_id) REFERENCES members (id)
  )`);

  // Audit log table
  db.run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  console.log('LLC Governance Dashboard database initialized');
});

// Middleware for auth
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

function requireRole(role) {
  return function(req, res, next) {
    if (req.session.role === role || req.session.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
}

// Auth routes
app.post('/api/register', async (req, res) => {
  const { username, password, role = 'member' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, username, role });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.householdId = user.household_id;
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/me', (req, res) => {
  if (req.session.userId) {
    db.get('SELECT id, username, role, household_id FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(user);
    });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Household routes
app.get('/api/households', requireAuth, (req, res) => {
  if (!req.session.householdId) return res.status(404).json({ error: 'No household assigned' });
  db.get('SELECT * FROM households WHERE id = ?', [req.session.householdId], (err, household) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!household) return res.status(404).json({ error: 'Household not found' });
    res.json([household]);
  });
});

app.post('/api/households', requireAuth, requireRole('admin'), (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO households (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

// Members routes
app.post('/api/households/:id/members', requireAuth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { name, units, userId } = req.body;
  db.run('INSERT INTO members (user_id, household_id, name, units) VALUES (?, ?, ?, ?)', [userId, id, name, units || 1], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, units: units || 1 });
  });
});

// Proposals routes
app.get('/api/proposals', requireAuth, (req, res) => {
  db.all('SELECT * FROM proposals WHERE household_id = ? ORDER BY created_date DESC', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/proposals', requireAuth, requireRole('member'), (req, res) => {
  const { title, description, options, quorum_percentage, threshold_percentage } = req.body;
  db.run('INSERT INTO proposals (household_id, title, description, options, quorum_percentage, threshold_percentage, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.session.householdId, title, description, JSON.stringify(options), quorum_percentage || 50, threshold_percentage || 51, req.session.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, title, description });
  });
});

app.get('/api/proposals/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM proposals WHERE id = ? AND household_id = ?', [id, req.session.householdId], (err, proposal) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    proposal.options = JSON.parse(proposal.options);
    db.all('SELECT v.*, u.username FROM votes v JOIN users u ON v.user_id = u.id WHERE v.proposal_id = ?', [id], (err, votes) => {
      if (err) return res.status(500).json({ error: err.message });
      proposal.votes = votes;
      // Calculate results
      const totalMembers = votes.length;
      const quorum = Math.ceil(totalMembers * (proposal.quorum_percentage / 100));
      const threshold = Math.ceil(totalMembers * (proposal.threshold_percentage / 100));
      const voteCounts = {};
      proposal.options.forEach(option => voteCounts[option] = 0);
      votes.forEach(v => voteCounts[v.vote]++);
      const winningOption = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
      const passed = totalMembers >= quorum && voteCounts[winningOption] >= threshold;
      proposal.results = {
        totalVotes: totalMembers,
        quorumRequired: quorum,
        thresholdRequired: threshold,
        quorumMet: totalMembers >= quorum,
        thresholdMet: voteCounts[winningOption] >= threshold,
        passed,
        winningOption,
        voteCounts
      };
      res.json(proposal);
    });
  });
});

app.post('/api/proposals/:id/vote', requireAuth, (req, res) => {
  const { id } = req.params;
  const { vote } = req.body;
  db.run('INSERT OR REPLACE INTO votes (proposal_id, user_id, vote) VALUES (?, ?, ?)', [id, req.session.userId, vote], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Vote recorded' });
  });
});

// Dividends routes
app.get('/api/dividends', requireAuth, (req, res) => {
  db.all('SELECT * FROM dividends WHERE household_id = ? ORDER BY distribution_date DESC', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/dividends', requireAuth, requireRole('admin'), (req, res) => {
  const { amount, description } = req.body;
  db.run('INSERT INTO dividends (household_id, amount, description) VALUES (?, ?, ?)', [req.session.householdId, amount, description], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, amount, description });
  });
});

// Contributions routes (for ownership ledger)
app.get('/api/contributions', requireAuth, (req, res) => {
  db.all('SELECT c.*, m.name as member_name FROM contributions c JOIN members m ON c.member_id = m.id WHERE m.household_id = ?', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/contributions', requireAuth, requireRole('member'), (req, res) => {
  const { type, description, amount, hours, evidence } = req.body;
  // Find member's id
  db.get('SELECT id FROM members WHERE user_id = ? AND household_id = ?', [req.session.userId, req.session.householdId], (err, member) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!member) return res.status(403).json({ error: 'Member not found' });

    db.run('INSERT INTO contributions (member_id, type, description, amount, hours, evidence) VALUES (?, ?, ?, ?, ?, ?)',
      [member.id, type, description, amount || 0, hours || 0, JSON.stringify(evidence || [])], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, type, description });
    });
  });
});

// Audit log
app.get('/api/audit', requireAuth, requireRole('admin'), (req, res) => {
  db.all('SELECT a.*, u.username FROM audit_log a JOIN users u ON a.user_id = u.id WHERE u.household_id = ? ORDER BY timestamp DESC', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Monthly close binder
app.get('/api/monthly-close', requireAuth, requireRole('admin'), (req, res) => {
  const { month, year } = req.query;
  // Generate monthly report
  const report = {
    month: month || new Date().getMonth() + 1,
    year: year || new Date().getFullYear(),
    sections: {
      minutes: [],
      voteLog: [],
      distributionReport: [],
      ledgerSnapshot: {},
      exports: ['minutes.pdf', 'ledger.csv', 'distributions.csv']
    }
  };
  res.json(report);
});

// Exports
app.get('/api/export/:type', requireAuth, (req, res) => {
  const { type } = req.params;
  if (type === 'ledger') {
    // Export contributions as CSV
    db.all('SELECT c.*, m.name FROM contributions c JOIN members m ON c.member_id = m.id WHERE m.household_id = ?', [req.session.householdId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      let csv = 'Date,Member,Type,Description,Amount,Hours,Status\n';
      rows.forEach(row => {
        csv += `${row.date},${row.name},${row.type},${row.description},${row.amount},${row.hours},${row.status}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ledger.csv"');
      res.send(csv);
    });
  } else {
    res.status(400).json({ error: 'Unknown export type' });
  }
});

// Backup
app.get('/api/backup', requireAuth, requireRole('admin'), (req, res) => {
  // Simple backup of database
  const fs = require('fs');
  const backupPath = path.join(__dirname, `backup-${Date.now()}.db`);
  fs.copyFile(dbPath, backupPath, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.download(backupPath, 'governance-backup.db', (err) => {
      if (err) console.error('Download error:', err);
      fs.unlink(backupPath, () => {}); // Clean up
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LLC Governance Dashboard server running on port ${PORT}`);
});