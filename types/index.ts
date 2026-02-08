export type AccountType = 'savings' | 'checking' | 'cash' | 'credit_card' | 'loan' | 'investment' | 'wallet';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type BudgetStatus = 'draft' | 'active' | 'closed';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export type DebtType = 'loan' | 'credit_card' | 'mortgage' | 'personal';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  parentId?: string;
  isSystem: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: string;
  fromAccountId?: string;
  toAccountId?: string;
  notes?: string;
  goalId?: string;
  debtId?: string;
  investmentId?: string;
  recurringId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  month: string;
  status: BudgetStatus;
  lines: BudgetLine[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLine {
  id: string;
  categoryId: string;
  planned: number;
  alertThreshold: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  icon: string;
  color: string;
  priority: number;
  status: GoalStatus;
  accountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  name: string;
  type: 'mutual_fund' | 'stocks' | 'nps' | 'ppf' | 'fd' | 'gold' | 'real_estate' | 'other';
  accountId?: string;
  totalInvested: number;
  currentValue: number;
  monthlyTarget?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  principalAmount: number;
  outstandingAmount: number;
  interestRate: number;
  emiAmount?: number;
  emiDay?: number;
  startDate: string;
  endDate?: string;
  accountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recurring {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  categoryId: string;
  fromAccountId?: string;
  toAccountId?: string;
  isActive: boolean;
  nextRunDate: string;
  lastRunDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRun {
  id: string;
  recurringId: string;
  runDate: string;
  status: 'success' | 'failed' | 'skipped';
  transactionId?: string;
  reason?: string;
}

export interface Rule {
  id: string;
  name: string;
  matchField: 'notes' | 'amount' | 'account';
  operator: 'contains' | 'equals' | 'startsWith' | 'regex' | 'greaterThan' | 'lessThan';
  matchValue: string;
  setCategoryId: string;
  priority: number;
  isActive: boolean;
}

export interface Alert {
  id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'recurring_due' | 'goal_milestone' | 'debt_due';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface UserSettings {
  currency: string;
  monthStartDay: number;
  userName: string;
  isOnboarded: boolean;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpense: number;
  totalTransfers: number;
  surplus: number;
  categoryBreakdown: { categoryId: string; amount: number }[];
}
