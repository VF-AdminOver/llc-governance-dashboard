import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';

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

// Dashboard redirect for OAuth
app.get('/dashboard', (req, res) => {
  res.redirect('/');
});

// Session middleware
app.use(session({
  secret: 'llc-governance-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: 'http://localhost:3000/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Find or create user
    db.get('SELECT * FROM users WHERE provider = ? AND provider_id = ?', ['google', profile.id], (err, user) => {
      if (err) return done(err);
      if (user) {
        return done(null, user);
      } else {
        // Create new user
        db.run('INSERT INTO users (username, provider, provider_id, role) VALUES (?, ?, ?, ?)',
          [profile.displayName, 'google', profile.id, 'member'], function(err) {
          if (err) return done(err);
          db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
            done(err, newUser);
          });
        });
      }
    });
  }
));

// Database setup
const dbPath = path.join(__dirname, 'governance.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table for authentication
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    provider TEXT,
    provider_id TEXT,
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

  // Assets table
  db.run(`CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    name TEXT NOT NULL,
    type TEXT,
    value REAL,
    documents TEXT,
    status TEXT DEFAULT 'active',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households (id)
  )`);

  // Asset transactions table
  db.run(`CREATE TABLE IF NOT EXISTS asset_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    type TEXT, -- income, expense, valuation
    amount REAL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets (id)
  )`);

  // Disputes table
  db.run(`CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER,
    raised_by INTEGER,
    objection TEXT NOT NULL,
    amendment_proposed TEXT,
    status TEXT DEFAULT 'open',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals (id),
    FOREIGN KEY (raised_by) REFERENCES users (id)
  )`);

  // Tasks table
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER,
    assigned_to INTEGER,
    description TEXT NOT NULL,
    due_date DATETIME,
    status TEXT DEFAULT 'pending',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals (id),
    FOREIGN KEY (assigned_to) REFERENCES users (id)
  )`);

  // Governance rules table
  db.run(`CREATE TABLE IF NOT EXISTS governance_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    rule_name TEXT NOT NULL,
    rule_type TEXT,
    conditions TEXT,
    actions TEXT,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (household_id) REFERENCES households (id)
  )`);

  // Ownership history table for cap table time machine
  db.run(`CREATE TABLE IF NOT EXISTS ownership_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    member_id INTEGER,
    units REAL,
    ownership_percentage REAL,
    change_reason TEXT,
    change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households (id),
    FOREIGN KEY (member_id) REFERENCES members (id)
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

// OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to dashboard
    res.redirect('/dashboard');
  }
);

// Auth routes
app.post('/api/register', async (req, res) => {
  const { username, password, role = 'member' } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    let query, params;
    if (password) {
      // Password registration
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
      params = [username, hashedPassword, role];
    } else {
      // OAuth registration (handled by Passport)
      return res.status(400).json({ error: 'Use OAuth for registration without password' });
    }

    db.run(query, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, username, role });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if OAuth user (no password) or password user
    if (user.provider) {
      // OAuth user, allow login without password
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.householdId = user.household_id;
      res.json({ id: user.id, username: user.username, role: user.role, provider: user.provider });
    } else if (password) {
      // Password user
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.householdId = user.household_id;
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      return res.status(400).json({ error: 'Password required' });
    }
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

// Assets routes
app.get('/api/assets', requireAuth, (req, res) => {
  db.all('SELECT * FROM assets WHERE household_id = ?', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/assets', requireAuth, requireRole('admin'), (req, res) => {
  const { name, type, value, documents } = req.body;
  db.run('INSERT INTO assets (household_id, name, type, value, documents) VALUES (?, ?, ?, ?, ?)',
    [req.session.householdId, name, type, value, JSON.stringify(documents || [])], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, type, value });
  });
});

app.get('/api/assets/:id/transactions', requireAuth, (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM asset_transactions WHERE asset_id = ? ORDER BY date DESC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Disputes routes
app.post('/api/proposals/:id/dispute', requireAuth, (req, res) => {
  const { id } = req.params;
  const { objection, amendment } = req.body;
  db.run('INSERT INTO disputes (proposal_id, raised_by, objection, amendment_proposed) VALUES (?, ?, ?, ?)',
    [id, req.session.userId, objection, amendment], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, objection });
  });
});

app.get('/api/disputes', requireAuth, (req, res) => {
  db.all('SELECT d.*, u.username, p.title FROM disputes d JOIN users u ON d.raised_by = u.id JOIN proposals p ON d.proposal_id = p.id WHERE u.household_id = ?', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Tasks routes
app.post('/api/tasks', requireAuth, requireRole('admin'), (req, res) => {
  const { proposalId, assignedTo, description, dueDate } = req.body;
  db.run('INSERT INTO tasks (proposal_id, assigned_to, description, due_date) VALUES (?, ?, ?, ?)',
    [proposalId, assignedTo, description, dueDate], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, description });
  });
});

app.get('/api/tasks', requireAuth, (req, res) => {
  db.all('SELECT t.*, u.username as assigned_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.assigned_to = ? OR ? = (SELECT role FROM users WHERE id = ?)',
    [req.session.userId, 'admin', req.session.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Governance rules routes
app.get('/api/governance-rules', requireAuth, (req, res) => {
  db.all('SELECT * FROM governance_rules WHERE household_id = ?', [req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/governance-rules', requireAuth, requireRole('admin'), (req, res) => {
  const { ruleName, ruleType, conditions, actions } = req.body;
  db.run('INSERT INTO governance_rules (household_id, rule_name, rule_type, conditions, actions) VALUES (?, ?, ?, ?, ?)',
    [req.session.householdId, ruleName, ruleType, JSON.stringify(conditions), JSON.stringify(actions)], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ruleName });
  });
});

// Cap table time machine
app.get('/api/cap-table/:date', requireAuth, (req, res) => {
  const { date } = req.params;
  // Get ownership at specific date
  db.all(`
    SELECT m.id, m.name, oh.units, oh.ownership_percentage, oh.change_reason, oh.change_date
    FROM members m
    LEFT JOIN ownership_history oh ON m.id = oh.member_id AND oh.change_date <= ?
    WHERE m.household_id = ?
    GROUP BY m.id
    HAVING MAX(oh.change_date) OR oh.change_date IS NULL
  `, [date, req.session.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Proposal templates
app.get('/api/proposal-templates', (req, res) => {
  const templates = [
    {
      name: 'Sell Asset',
      fields: ['asset_id', 'valuation', 'buyer', 'closing_date'],
      checks: ['valuation_required', 'debt_impact_assessment']
    },
    {
      name: 'Add Member',
      fields: ['name', 'contribution', 'units', 'role'],
      checks: ['onboarding_required', 'category_selection']
    },
    {
      name: 'Transfer Units',
      fields: ['from_member', 'to_member', 'units', 'price'],
      checks: ['right_of_first_refusal', 'waiting_period']
    },
    {
      name: 'Reinvestment Decision',
      fields: ['amount', 'options', 'timeline'],
      checks: ['member_elections', 'allocation_calculation']
    },
    {
      name: 'Emergency Fund Draw',
      fields: ['amount', 'purpose', 'repayment_plan'],
      checks: ['reserve_policy_check', 'vote_gate']
    }
  ];
  res.json(templates);
});

app.listen(PORT, () => {
  console.log(`🚀 LLC Governance Dashboard server running on port ${PORT}`);
});