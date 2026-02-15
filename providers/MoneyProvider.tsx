import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  Account,
  Transaction,
  Category,
  Budget,
  Goal,
  Recurring,
  Debt,
  Investment,
  MonthlyStats,
  Alert,
  UserSettings,
  AccountType,
} from '@/types';

import { defaultCategories } from '@/mocks/sampleData';

import { generateId, getMonthKey, getStartOfMonth, getEndOfMonth } from '@/utils/helpers';

import { initializeDatabase, runTransaction, resetDatabase } from '@/db/repositories/database';

import * as accountRepo from '@/db/repositories/accountRepository';
import * as categoryRepo from '@/db/repositories/categoryRepository';
import * as transactionRepo from '@/db/repositories/transactionRepository';
import * as budgetRepo from '@/db/repositories/budgetRepository';
import * as goalRepo from '@/db/repositories/goalRepository';
import * as investmentRepo from '@/db/repositories/investmentRepository';
import * as recurringRepo from '@/db/repositories/recurringRepository';
import * as debtRepo from '@/db/repositories/debtRepository';
import * as alertRepo from '@/db/repositories/alertRepository';
import * as recurringRunRepo from '@/db/repositories/recurringRunRepository';

const TRANSFER_CATEGORY_ID = 'cat_transfer';

const defaultSettings: UserSettings = {
  currency: '₹',
  monthStartDay: 1,
  userName: 'User',
  isOnboarded: true,
};

// ---------------------------
// DATE HELPERS
// ---------------------------
function startOfDayISO(dateStr: string) {
  return new Date(dateStr + 'T00:00:00.000Z').toISOString();
}
function endOfDayISO(dateStr: string) {
  return new Date(dateStr + 'T23:59:59.999Z').toISOString();
}
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---------------------------
// CREDIT CARD HELPERS
// ---------------------------
function isLiabilityAccountType(type: AccountType) {
  return type === 'credit_card' || type === 'loan';
}

function isCreditCardAccount(account?: Account | null) {
  return account?.type === 'credit_card';
}

/**
 * Stored rule:
 * - credit cards store outstanding as NEGATIVE
 * - loans store outstanding as NEGATIVE
 */
function getOutstandingFromBalance(balance: number) {
  return Math.abs(Math.min(balance, 0));
}

function getAvailableCredit(limit: number, balance: number) {
  return Math.max(0, limit - getOutstandingFromBalance(balance));
}

/**
 * Rule:
 * - For credit cards, limit must always exist (>0)
 * - Spending cannot exceed available credit
 * - Paying cannot exceed outstanding due
 */
function assertCreditCardRules(params: {
  txn: Transaction;
  fromAccount?: Account | null;
  toAccount?: Account | null;
}) {
  const { txn, fromAccount, toAccount } = params;

  // 1) Spending on credit card (expense)
  if (txn.type === 'expense' && isCreditCardAccount(fromAccount)) {
    if (!fromAccount) return;

    const limit = fromAccount.creditLimit ?? 0;

    if (limit <= 0) {
      throw new Error('Credit card limit is required.');
    }

    const currentOutstanding = getOutstandingFromBalance(fromAccount.balance);
    const available = getAvailableCredit(limit, fromAccount.balance);

    if (txn.amount > available) {
      throw new Error(
        `Credit limit exceeded. Available: ₹${available.toFixed(
          0
        )}, trying to spend: ₹${txn.amount.toFixed(0)}`
      );
    }

    const newOutstanding = currentOutstanding + txn.amount;
    if (newOutstanding > limit) {
      throw new Error(
        `Credit limit exceeded. Outstanding would become ₹${newOutstanding.toFixed(
          0
        )} (limit ₹${limit.toFixed(0)})`
      );
    }
  }

  // 2) Paying credit card (transfer into credit card)
  // Savings -> Credit Card
  if (txn.type === 'transfer' && isCreditCardAccount(toAccount)) {
    if (!toAccount) return;

    const outstanding = getOutstandingFromBalance(toAccount.balance);

    if (outstanding <= 0) {
      throw new Error('This credit card has no outstanding due to pay.');
    }

    if (txn.amount > outstanding) {
      throw new Error(
        `Payment exceeds outstanding due. Due: ₹${outstanding.toFixed(
          0
        )}, trying to pay: ₹${txn.amount.toFixed(0)}`
      );
    }
  }
}

// ---------------------------
// RECURRING NEXT RUN
// ---------------------------
function computeNextRunDate(rec: Recurring, currentRunDate: string): string {
  const current = parseDateKey(currentRunDate);
  const next = new Date(current);

  switch (rec.frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;

    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;

    case 'monthly': {
      if (rec.dayOfMonth) {
        const y = next.getFullYear();
        const m = next.getMonth() + 1;

        const maxDay = new Date(y, m + 1, 0).getDate();
        const day = Math.min(rec.dayOfMonth, maxDay);

        return toDateKey(new Date(y, m, day));
      }

      next.setMonth(next.getMonth() + 1);
      break;
    }

    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;

    default:
      next.setMonth(next.getMonth() + 1);
  }

  return toDateKey(next);
}

export const [MoneyProvider, useMoney] = createContextHook(() => {
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [dateFilter, setDateFilter] = useState<{ startDate?: string; endDate?: string }>({});
  const [dbReady, setDbReady] = useState(false);

  // ---------------------------
  // RESET APP DATA
  // ---------------------------
  const resetAppData = useCallback(async () => {
    try {
      await resetDatabase();
      await initializeDatabase();
      await categoryRepo.insertCategories(defaultCategories);

      setSelectedMonth(getMonthKey());
      setDateFilter({});

      queryClient.clear();
      await queryClient.invalidateQueries();
    } catch (e) {
      console.error('Reset App Data failed:', e);
      throw e;
    }
  }, [queryClient]);

  // ---------------------------
  // DB INIT + SEED
  // ---------------------------
  const seedDatabase = async () => {
    try {
      await runTransaction(async () => {
        await categoryRepo.insertCategories(defaultCategories);
      });

      console.log('Database seeded successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  };

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();

        const categories = await categoryRepo.getAllCategories();
        if (categories.length === 0) {
          await seedDatabase();
        }

        setDbReady(true);
      } catch (error) {
        console.error('Error initializing database:', error);
        setDbReady(true);
      }
    };

    initDb();
  }, []);

  // ---------------------------
  // QUERIES
  // ---------------------------
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => defaultSettings,
    enabled: dbReady,
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => await accountRepo.getAllAccounts(),
    enabled: dbReady,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => await transactionRepo.getAllTransactions(),
    enabled: dbReady,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => await categoryRepo.getAllCategories(),
    enabled: dbReady,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => await budgetRepo.getAllBudgets(),
    enabled: dbReady,
  });

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: async () => await goalRepo.getAllGoals(),
    enabled: dbReady,
  });

  const recurringQuery = useQuery({
    queryKey: ['recurring'],
    queryFn: async () => await recurringRepo.getAllRecurring(),
    enabled: dbReady,
  });

  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: async () => await debtRepo.getAllDebts(),
    enabled: dbReady,
  });

  const investmentsQuery = useQuery({
    queryKey: ['investments'],
    queryFn: async () => await investmentRepo.getAllInvestments(),
    enabled: dbReady,
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => await alertRepo.getAllAlerts(),
    enabled: dbReady,
  });

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const budgets = budgetsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const recurring = recurringQuery.data ?? [];
  const debts = debtsQuery.data ?? [];
  const investments = investmentsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const settings = settingsQuery.data ?? defaultSettings;

  // ---------------------------
  // HELPERS
  // ---------------------------
  const normalizeTransactionInput = useCallback(
    (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (t.type === 'transfer') {
        return { ...t, categoryId: TRANSFER_CATEGORY_ID };
      }
      return t;
    },
    []
  );

  /**
   * SINGLE SOURCE OF TRUTH:
   * Applies or reverses account balance updates.
   */
  const applyTransactionBalances = useCallback(
    async (txn: Transaction, direction: 'apply' | 'reverse') => {
      const multiplier = direction === 'apply' ? 1 : -1;

      if (txn.type === 'expense' && txn.fromAccountId) {
        await accountRepo.updateAccountBalance(txn.fromAccountId, multiplier * -txn.amount);
      }

      if (txn.type === 'income' && txn.toAccountId) {
        await accountRepo.updateAccountBalance(txn.toAccountId, multiplier * txn.amount);
      }

      if (txn.type === 'transfer' && txn.fromAccountId && txn.toAccountId) {
        await accountRepo.updateAccountBalance(txn.fromAccountId, multiplier * -txn.amount);
        await accountRepo.updateAccountBalance(txn.toAccountId, multiplier * txn.amount);
      }
    },
    []
  );

  const isContributionTransaction = useCallback((t: Transaction) => t.type === 'income', []);

  const recalcGoalAndInvestmentAfterTxnChange = useCallback(
    async (oldTxn?: Transaction, newTxn?: Transaction) => {
      const affectedGoalIds = new Set<string>();
      const affectedInvestmentIds = new Set<string>();

      if (oldTxn?.goalId) affectedGoalIds.add(oldTxn.goalId);
      if (newTxn?.goalId) affectedGoalIds.add(newTxn.goalId);

      if (oldTxn?.investmentId) affectedInvestmentIds.add(oldTxn.investmentId);
      if (newTxn?.investmentId) affectedInvestmentIds.add(newTxn.investmentId);

      for (const goalId of affectedGoalIds) {
        await goalRepo.recalculateGoalTotals(goalId);
      }

      for (const invId of affectedInvestmentIds) {
        await investmentRepo.recalculateInvestmentTotals(invId);
      }
    },
    []
  );

  // ---------------------------
  // RECURRING PROCESSOR
  // ---------------------------
  const processRecurringTransactions = useCallback(async () => {
    const todayKey = toDateKey(new Date());

    const dueRecurring = await recurringRepo.getDueRecurring(todayKey);
    if (dueRecurring.length === 0) return;

    await runTransaction(async () => {
      for (const rec of dueRecurring) {
        let runDate = rec.nextRunDate;
        if (!runDate) continue;

        while (runDate <= todayKey) {
          const alreadyRan = await recurringRunRepo.hasRunForDate(rec.id, runDate);
          if (alreadyRan) {
            runDate = computeNextRunDate(rec, runDate);
            continue;
          }

          try {
            const txnId = generateId();

            const newTxn: Transaction = {
              id: txnId,
              type: rec.type,
              amount: rec.amount,
              date: new Date(runDate + 'T12:00:00.000Z').toISOString(),

              categoryId: rec.type === 'transfer' ? TRANSFER_CATEGORY_ID : rec.categoryId,
              fromAccountId: rec.type !== 'income' ? rec.fromAccountId : undefined,
              toAccountId: rec.type !== 'expense' ? rec.toAccountId : undefined,

              notes: rec.notes || rec.name,
              goalId: undefined,
              debtId: undefined,
              investmentId: undefined,
              recurringId: rec.id,
              tags: undefined,

              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // ✅ CREDIT RULES VALIDATION
            const fromAcc = newTxn.fromAccountId
              ? await accountRepo.getAccountById(newTxn.fromAccountId)
              : null;

            const toAcc = newTxn.toAccountId
              ? await accountRepo.getAccountById(newTxn.toAccountId)
              : null;

            assertCreditCardRules({ txn: newTxn, fromAccount: fromAcc, toAccount: toAcc });

            await transactionRepo.createTransaction(newTxn);
            await applyTransactionBalances(newTxn, 'apply');

            await recurringRunRepo.createRecurringRun({
              id: generateId(),
              recurringId: rec.id,
              runDate,
              status: 'success',
              transactionId: txnId,
            });

            const nextRunDate = computeNextRunDate(rec, runDate);
            await recurringRepo.markRecurringRun(rec.id, runDate, nextRunDate);

            runDate = nextRunDate;
          } catch (e) {
            console.error('Recurring run failed:', rec.id, runDate, e);

            await recurringRunRepo.createRecurringRun({
              id: generateId(),
              recurringId: rec.id,
              runDate,
              status: 'failed',
              reason: e instanceof Error ? e.message : 'Failed to generate transaction',
            });

            break;
          }
        }
      }
    });

    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    await queryClient.invalidateQueries({ queryKey: ['recurring'] });
  }, [applyTransactionBalances, queryClient]);

  useEffect(() => {
    if (!dbReady) return;

    processRecurringTransactions().catch(err => {
      console.error('Recurring processor failed:', err);
    });
  }, [dbReady, processRecurringTransactions]);

  // ---------------------------
  // BUDGET ALERTS
  // ---------------------------
  const checkBudgetAlertsForExpense = useCallback(
    async (txn: Transaction) => {
      if (txn.type !== 'expense') return;

      const month = txn.date.slice(0, 7);
      const budget = budgets.find(b => b.month === month);
      if (!budget) return;

      const line = budget.lines.find(l => l.categoryId === txn.categoryId);
      if (!line) return;

      const start = getStartOfMonth(month);
      const end = getEndOfMonth(month);

      const spent = transactions
        .filter(t => {
          if (t.type !== 'expense') return false;
          if (t.categoryId !== txn.categoryId) return false;
          const d = new Date(t.date);
          return d >= start && d <= end;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = line.planned > 0 ? Math.round((spent / line.planned) * 100) : 0;
      if (percent < (line.alertThreshold ?? 80)) return;

      const category = categories.find(c => c.id === txn.categoryId);
      const alertType: Alert['type'] = percent >= 100 ? 'budget_exceeded' : 'budget_warning';

      const title = `Budget Alert: ${category?.name ?? 'Category'}`;
      const message =
        percent >= 100
          ? `Budget exceeded! You’ve used ${percent}% of your ${month} budget.`
          : `Warning: You’ve used ${percent}% of your ${month} budget.`;

      await alertRepo.createAlert({
        id: generateId(),
        type: alertType,
        title,
        message,
        isRead: false,
        data: {
          month,
          categoryId: txn.categoryId,
          spent,
          planned: line.planned,
          percent,
        },
        createdAt: new Date().toISOString(),
      });
    },
    [budgets, transactions, categories]
  );

  // ---------------------------
  // TRANSACTION MUTATIONS
  // ---------------------------
  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const normalized = normalizeTransactionInput(transaction);

      const newTransaction: Transaction = {
        ...normalized,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await runTransaction(async () => {
        // ✅ CREDIT RULES VALIDATION (INSIDE TRANSACTION)
        const fromAcc = newTransaction.fromAccountId
          ? await accountRepo.getAccountById(newTransaction.fromAccountId)
          : null;

        const toAcc = newTransaction.toAccountId
          ? await accountRepo.getAccountById(newTransaction.toAccountId)
          : null;

        assertCreditCardRules({ txn: newTransaction, fromAccount: fromAcc, toAccount: toAcc });

        await transactionRepo.createTransaction(newTransaction);
        await applyTransactionBalances(newTransaction, 'apply');

        if (isContributionTransaction(newTransaction)) {
          await recalcGoalAndInvestmentAfterTxnChange(undefined, newTransaction);
        }
      });

      return newTransaction;
    },
    onSuccess: async (newTxn) => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });

      await checkBudgetAlertsForExpense(newTxn);
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (updatedTxn: Transaction) => {
      const oldTxn = await transactionRepo.getTransactionById(updatedTxn.id);
      if (!oldTxn) throw new Error('Transaction not found');

      const normalized = normalizeTransactionInput({
        type: updatedTxn.type,
        amount: updatedTxn.amount,
        date: updatedTxn.date,
        categoryId: updatedTxn.categoryId,
        fromAccountId: updatedTxn.fromAccountId,
        toAccountId: updatedTxn.toAccountId,
        notes: updatedTxn.notes,
        goalId: updatedTxn.goalId,
        debtId: updatedTxn.debtId,
        investmentId: updatedTxn.investmentId,
        recurringId: updatedTxn.recurringId,
        tags: updatedTxn.tags,
      });

      const txn: Transaction = {
        ...updatedTxn,
        ...normalized,
        updatedAt: new Date().toISOString(),
      };

      await runTransaction(async () => {
        // Reverse old first
        await applyTransactionBalances(oldTxn, 'reverse');

        // Validate against NEW balances after reverse
        const fromAcc = txn.fromAccountId ? await accountRepo.getAccountById(txn.fromAccountId) : null;
        const toAcc = txn.toAccountId ? await accountRepo.getAccountById(txn.toAccountId) : null;

        assertCreditCardRules({ txn, fromAccount: fromAcc, toAccount: toAcc });

        // Apply new
        await applyTransactionBalances(txn, 'apply');

        await transactionRepo.updateTransaction(txn);

        if (isContributionTransaction(oldTxn) || isContributionTransaction(txn)) {
          await recalcGoalAndInvestmentAfterTxnChange(oldTxn, txn);
        }
      });

      return txn;
    },
    onSuccess: async (txn) => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });

      await checkBudgetAlertsForExpense(txn);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const transaction = await transactionRepo.getTransactionById(transactionId);
      if (!transaction) throw new Error('Transaction not found');

      await runTransaction(async () => {
        await applyTransactionBalances(transaction, 'reverse');
        await transactionRepo.deleteTransaction(transactionId);

        if (isContributionTransaction(transaction)) {
          await recalcGoalAndInvestmentAfterTxnChange(transaction, undefined);
        }
      });

      return transaction;
    },
    onSuccess: async (deletedTxn) => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });

      if (deletedTxn.type === 'expense') {
        await checkBudgetAlertsForExpense(deletedTxn);
      }
    },
  });

  // ---------------------------
  // ACCOUNT MUTATIONS
  // ---------------------------
  const addAccountMutation = useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
      // ✅ CREDIT CARD MUST HAVE LIMIT ALWAYS
      if (account.type === 'credit_card') {
        const limit = account.creditLimit ?? 0;
        if (limit <= 0) {
          throw new Error('Credit card limit is required.');
        }
      }

      const newAccount: Account = {
        ...account,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await accountRepo.createAccount(newAccount);
      return newAccount;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async (account: Account) => {
      // ✅ CREDIT CARD MUST HAVE LIMIT ALWAYS
      if (account.type === 'credit_card') {
        const limit = account.creditLimit ?? 0;
        if (limit <= 0) {
          throw new Error('Credit card limit is required.');
        }
      }

      const updatedAccount = { ...account, updatedAt: new Date().toISOString() };
      await accountRepo.updateAccount(updatedAccount);
      return updatedAccount;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const hasTxns = await accountRepo.hasTransactions(accountId);
      if (hasTxns) throw new Error('Cannot delete account with transactions');

      await accountRepo.deleteAccount(accountId);
      return accountId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  // ---------------------------
  // CATEGORY MUTATIONS
  // ---------------------------
  const addCategoryMutation = useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      const newCategory: Category = { ...category, id: generateId() };
      await categoryRepo.createCategory(newCategory);
      return newCategory;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      await categoryRepo.updateCategory(category);
      return category;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const hasTxns = await categoryRepo.hasTransactions(categoryId);
      if (hasTxns) throw new Error('Cannot delete category with transactions');

      await categoryRepo.deleteCategory(categoryId);
      return categoryId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // ---------------------------
  // BUDGET MUTATIONS
  // ---------------------------
  const addBudgetMutation = useMutation({
    mutationFn: async (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
      const existing = budgets.find(b => b.month === budget.month);

      const newBudget: Budget = {
        ...budget,
        id: existing?.id || generateId(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await budgetRepo.createBudget(newBudget);
      return newBudget;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: Budget) => {
      const updatedBudget = { ...budget, updatedAt: new Date().toISOString() };
      await budgetRepo.updateBudget(updatedBudget);
      return updatedBudget;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const deleteBudgetLineMutation = useMutation({
    mutationFn: async ({ budgetId, lineId }: { budgetId: string; lineId: string }) => {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget) throw new Error('Budget not found');

      const updatedBudget: Budget = {
        ...budget,
        lines: budget.lines.filter(l => l.id !== lineId),
        updatedAt: new Date().toISOString(),
      };

      await budgetRepo.updateBudget(updatedBudget);
      return updatedBudget;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  // ---------------------------
  // GOAL MUTATIONS
  // ---------------------------
  const addGoalMutation = useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newGoal: Goal = {
        ...goal,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await goalRepo.createGoal(newGoal);
      return newGoal;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (goal: Goal) => {
      const updatedGoal = { ...goal, updatedAt: new Date().toISOString() };
      await goalRepo.updateGoal(updatedGoal);
      return updatedGoal;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await goalRepo.deleteGoal(goalId);
      return goalId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  // ---------------------------
  // RECURRING MUTATIONS
  // ---------------------------
  const addRecurringMutation = useMutation({
    mutationFn: async (item: Omit<Recurring, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newItem: Recurring = {
        ...item,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await recurringRepo.createRecurring(newItem);
      return newItem;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });

  const updateRecurringMutation = useMutation({
    mutationFn: async (item: Recurring) => {
      const updatedItem = { ...item, updatedAt: new Date().toISOString() };
      await recurringRepo.updateRecurring(updatedItem);
      return updatedItem;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async (id: string) => {
      await recurringRepo.deleteRecurring(id);
      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });

  // ---------------------------
  // INVESTMENT MUTATIONS
  // ---------------------------
  const addInvestmentMutation = useMutation({
    mutationFn: async (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newInvestment: Investment = {
        ...investment,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await investmentRepo.createInvestment(newInvestment);
      return newInvestment;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });

  const updateInvestmentMutation = useMutation({
    mutationFn: async (investment: Investment) => {
      const updatedInvestment = { ...investment, updatedAt: new Date().toISOString() };
      await investmentRepo.updateInvestment(updatedInvestment);
      return updatedInvestment;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await investmentRepo.deleteInvestment(id);
      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });

  // ---------------------------
  // DEBT MUTATIONS
  // ---------------------------
  const addDebtMutation = useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newDebt: Debt = {
        ...debt,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await debtRepo.createDebt(newDebt);
      return newDebt;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });

  const updateDebtMutation = useMutation({
    mutationFn: async (debt: Debt) => {
      const updatedDebt = { ...debt, updatedAt: new Date().toISOString() };
      await debtRepo.updateDebt(updatedDebt);
      return updatedDebt;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: async (id: string) => {
      await debtRepo.deleteDebt(id);
      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });

  // ---------------------------
  // STATS + HELPERS
  // ---------------------------
  const getMonthlyStats = useCallback(
    (month: string): MonthlyStats => {
      const startDate = getStartOfMonth(month);
      const endDate = getEndOfMonth(month);

      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
      });

      const totalIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalTransfers = monthTransactions
        .filter(t => t.type === 'transfer')
        .reduce((sum, t) => sum + t.amount, 0);

      const categoryBreakdown = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const existing = acc.find(item => item.categoryId === t.categoryId);
          if (existing) existing.amount += t.amount;
          else acc.push({ categoryId: t.categoryId, amount: t.amount });
          return acc;
        }, [] as { categoryId: string; amount: number }[])
        .sort((a, b) => b.amount - a.amount);

      return {
        totalIncome,
        totalExpense,
        totalTransfers,
        surplus: totalIncome - totalExpense,
        categoryBreakdown,
      };
    },
    [transactions]
  );

  const getDateRangeStats = useCallback(
    (startDate: string, endDate: string): MonthlyStats => {
      const startISO = startOfDayISO(startDate);
      const endISO = endOfDayISO(endDate);

      const filteredTransactions = transactions.filter(t => t.date >= startISO && t.date <= endISO);

      const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalTransfers = filteredTransactions
        .filter(t => t.type === 'transfer')
        .reduce((sum, t) => sum + t.amount, 0);

      const categoryBreakdown = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const existing = acc.find(item => item.categoryId === t.categoryId);
          if (existing) existing.amount += t.amount;
          else acc.push({ categoryId: t.categoryId, amount: t.amount });
          return acc;
        }, [] as { categoryId: string; amount: number }[])
        .sort((a, b) => b.amount - a.amount);

      return {
        totalIncome,
        totalExpense,
        totalTransfers,
        surplus: totalIncome - totalExpense,
        categoryBreakdown,
      };
    },
    [transactions]
  );

  const getCurrentBudget = useCallback(() => {
    return budgets.find(b => b.month === selectedMonth);
  }, [budgets, selectedMonth]);

  const getTotalNetWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  const getTotalCreditDue = useMemo(() => {
    return accounts
      .filter(acc => acc.type === 'credit_card')
      .reduce((sum, acc) => sum + Math.abs(Math.min(acc.balance, 0)), 0);
  }, [accounts]);

  const getTotalDebtOutstanding = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.outstandingAmount, 0);
  }, [debts]);

  const getTotalInvestmentValue = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  }, [investments]);

  const getCategoryById = useCallback((id: string) => categories.find(c => c.id === id), [categories]);
  const getAccountById = useCallback((id: string) => accounts.find(a => a.id === id), [accounts]);
  const getTransactionById = useCallback((id: string) => transactions.find(t => t.id === id), [transactions]);

  const checkAccountHasTransactions = useCallback(
    (accountId: string) =>
      transactions.some(t => t.fromAccountId === accountId || t.toAccountId === accountId),
    [transactions]
  );

  const checkCategoryHasTransactions = useCallback(
    (categoryId: string) => transactions.some(t => t.categoryId === categoryId),
    [transactions]
  );

  // ---------------------------
  // RETURN PROVIDER
  // ---------------------------
  return {
    accounts,
    transactions,
    categories,
    budgets,
    goals,
    recurring,
    debts,
    investments,
    alerts,
    settings,
    resetAppData,

    selectedMonth,
    setSelectedMonth,

    dateFilter,
    setDateFilter,

    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading || !dbReady,

    // Transaction operations
    addTransaction: addTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,

    addTransactionAsync: addTransactionMutation.mutateAsync,
    updateTransactionAsync: updateTransactionMutation.mutateAsync,
    deleteTransactionAsync: deleteTransactionMutation.mutateAsync,

    // Account operations
    addAccount: addAccountMutation.mutate,
    updateAccount: updateAccountMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,

    // Category operations
    addCategory: addCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,

    // Budget operations
    addBudget: addBudgetMutation.mutate,
    updateBudget: updateBudgetMutation.mutate,
    deleteBudgetLine: deleteBudgetLineMutation.mutate,

    // Goal operations
    addGoal: addGoalMutation.mutate,
    updateGoal: updateGoalMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,

    // Recurring operations
    addRecurring: addRecurringMutation.mutate,
    updateRecurring: updateRecurringMutation.mutate,
    deleteRecurring: deleteRecurringMutation.mutate,

    // Investment operations
    addInvestment: addInvestmentMutation.mutate,
    updateInvestment: updateInvestmentMutation.mutate,
    deleteInvestment: deleteInvestmentMutation.mutate,

    // Debt operations
    addDebt: addDebtMutation.mutate,
    updateDebt: updateDebtMutation.mutate,
    deleteDebt: deleteDebtMutation.mutate,

    // Stats + helpers
    getMonthlyStats,
    getDateRangeStats,
    getCurrentBudget,

    getTotalNetWorth,
    getTotalCreditDue,
    getTotalDebtOutstanding,
    getTotalInvestmentValue,

    getCategoryById,
    getAccountById,
    getTransactionById,

    checkAccountHasTransactions,
    checkCategoryHasTransactions,

    isAddingTransaction: addTransactionMutation.isPending,
    isUpdatingTransaction: updateTransactionMutation.isPending,
    isDeletingTransaction: deleteTransactionMutation.isPending,
  };
});