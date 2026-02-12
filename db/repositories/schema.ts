export const DB_NAME = 'money_manager.db';
export const DB_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance REAL DEFAULT 0,
  credit_limit REAL,
  icon TEXT,
  color TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT NOT NULL,
  parent_id TEXT,
  is_system INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  category_id TEXT NOT NULL,
  from_account_id TEXT,
  to_account_id TEXT,
  notes TEXT,
  goal_id TEXT,
  debt_id TEXT,
  investment_id TEXT,
  recurring_id TEXT,
  tags TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (from_account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id),
  FOREIGN KEY (goal_id) REFERENCES goals(id),
  FOREIGN KEY (debt_id) REFERENCES debts(id),
  FOREIGN KEY (investment_id) REFERENCES investments(id),
  FOREIGN KEY (recurring_id) REFERENCES recurring(id)
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Budget lines table
CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  planned REAL NOT NULL,
  alert_threshold REAL DEFAULT 80,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  saved_amount REAL DEFAULT 0,
  target_date TEXT,
  icon TEXT,
  color TEXT,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  account_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  account_id TEXT,
  total_invested REAL DEFAULT 0,
  current_value REAL DEFAULT 0,
  monthly_target REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  principal_amount REAL NOT NULL,
  outstanding_amount REAL NOT NULL,
  interest_rate REAL,
  emi_amount REAL,
  emi_day INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  account_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Recurring table
CREATE TABLE IF NOT EXISTS recurring (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL,
  day_of_month INTEGER,
  day_of_week INTEGER,
  category_id TEXT NOT NULL,
  from_account_id TEXT,
  to_account_id TEXT,
  is_active INTEGER DEFAULT 1,
  next_run_date TEXT,
  last_run_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (from_account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id)
);

-- Recurring runs table
CREATE TABLE IF NOT EXISTS recurring_runs (
  id TEXT PRIMARY KEY,
  recurring_id TEXT NOT NULL,
  run_date TEXT NOT NULL,
  status TEXT NOT NULL,
  transaction_id TEXT,
  reason TEXT,
  FOREIGN KEY (recurring_id) REFERENCES recurring(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recurring_runs
ON recurring_runs(recurring_id, run_date);

CREATE INDEX IF NOT EXISTS idx_recurring_next_run_date
ON recurring(next_run_date);


-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  match_field TEXT NOT NULL,
  operator TEXT NOT NULL,
  match_value TEXT NOT NULL,
  set_category_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (set_category_id) REFERENCES categories(id)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  data TEXT,
  created_at TEXT NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_recurring_runs_recurring ON recurring_runs(recurring_id);
`;

export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS recurring_runs;
DROP TABLE IF EXISTS recurring;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS rules;
DROP TABLE IF EXISTS budget_lines;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS investments;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS settings;
`;
