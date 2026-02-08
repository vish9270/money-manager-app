import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { 
  Account, Transaction, Category, Budget, Goal, Recurring, Debt, Investment, 
  UserSettings, MonthlyStats, Alert, BudgetLine
} from '@/types';
import { 
  defaultCategories, sampleAccounts, sampleTransactions, sampleBudget, 
  sampleGoals, sampleRecurring, sampleDebts, sampleInvestments 
} from '@/mocks/sampleData';
import { generateId, getMonthKey, getStartOfMonth, getEndOfMonth } from '@/utils/helpers';
import { initializeDatabase } from '@/db/database';
import * as accountRepo from '@/db/repositories/accountRepository';
import * as categoryRepo from '@/db/repositories/categoryRepository';
import * as transactionRepo from '@/db/repositories/transactionRepository';
import * as budgetRepo from '@/db/repositories/budgetRepository';
import * as goalRepo from '@/db/repositories/goalRepository';
import * as investmentRepo from '@/db/repositories/investmentRepository';
import * as recurringRepo from '@/db/repositories/recurringRepository';
import * as debtRepo from '@/db/repositories/debtRepository';

const STORAGE_KEYS = {
  ACCOUNTS: 'money_accounts',
  TRANSACTIONS: 'money_transactions',
  CATEGORIES: 'money_categories',
  BUDGETS: 'money_budgets',
  GOALS: 'money_goals',
  RECURRING: 'money_recurring',
  DEBTS: 'money_debts',
  INVESTMENTS: 'money_investments',
  SETTINGS: 'money_settings',
  ALERTS: 'money_alerts',
  INITIALIZED: 'money_initialized',
  DB_INITIALIZED: 'money_db_initialized',
};

const defaultSettings: UserSettings = {
  currency: '₹',
  monthStartDay: 1,
  userName: 'User',
  isOnboarded: false,
};

const isWeb = Platform.OS === 'web';

export const [MoneyProvider, useMoney] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [dateFilter, setDateFilter] = useState<{ startDate?: string; endDate?: string }>({});
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      if (!isWeb) {
        try {
          await initializeDatabase();
          const dbInitialized = await AsyncStorage.getItem(STORAGE_KEYS.DB_INITIALIZED);
          if (!dbInitialized) {
            console.log('First time DB initialization, seeding data...');
            await seedDatabase();
            await AsyncStorage.setItem(STORAGE_KEYS.DB_INITIALIZED, 'true');
          }
          setDbReady(true);
          console.log('Database ready');
        } catch (error) {
          console.error('Error initializing database:', error);
          setDbReady(true);
        }
      } else {
        setDbReady(true);
      }
    };
    initDb();
  }, []);

  const seedDatabase = async () => {
    try {
      await categoryRepo.insertCategories(defaultCategories);
      await accountRepo.insertAccounts(sampleAccounts);
      await transactionRepo.insertTransactions(sampleTransactions);
      await budgetRepo.insertBudgets([sampleBudget]);
      await goalRepo.insertGoals(sampleGoals);
      await recurringRepo.insertRecurring(sampleRecurring);
      await debtRepo.insertDebts(sampleDebts);
      await investmentRepo.insertInvestments(sampleInvestments);
      console.log('Database seeded successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  };

  const loadFromStorage = async <T,>(key: string, defaultValue: T): Promise<T> => {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.log(`Error loading ${key}:`, error);
      return defaultValue;
    }
  };

  const saveToStorage = async <T,>(key: string, data: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.log(`Error saving ${key}:`, error);
    }
  };

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => loadFromStorage(STORAGE_KEYS.SETTINGS, { ...defaultSettings, isOnboarded: true }),
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const accounts = await accountRepo.getAllAccounts();
        if (accounts.length > 0) return accounts;
      }
      return loadFromStorage<Account[]>(STORAGE_KEYS.ACCOUNTS, sampleAccounts);
    },
    enabled: dbReady,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const transactions = await transactionRepo.getAllTransactions();
        if (transactions.length > 0) return transactions;
      }
      return loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, sampleTransactions);
    },
    enabled: dbReady,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const categories = await categoryRepo.getAllCategories();
        if (categories.length > 0) return categories;
      }
      return loadFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, defaultCategories);
    },
    enabled: dbReady,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const budgets = await budgetRepo.getAllBudgets();
        if (budgets.length > 0) return budgets;
      }
      return loadFromStorage<Budget[]>(STORAGE_KEYS.BUDGETS, [sampleBudget]);
    },
    enabled: dbReady,
  });

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const goals = await goalRepo.getAllGoals();
        if (goals.length > 0) return goals;
      }
      return loadFromStorage<Goal[]>(STORAGE_KEYS.GOALS, sampleGoals);
    },
    enabled: dbReady,
  });

  const recurringQuery = useQuery({
    queryKey: ['recurring'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const items = await recurringRepo.getAllRecurring();
        if (items.length > 0) return items;
      }
      return loadFromStorage<Recurring[]>(STORAGE_KEYS.RECURRING, sampleRecurring);
    },
    enabled: dbReady,
  });

  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const debts = await debtRepo.getAllDebts();
        if (debts.length > 0) return debts;
      }
      return loadFromStorage<Debt[]>(STORAGE_KEYS.DEBTS, sampleDebts);
    },
    enabled: dbReady,
  });

  const investmentsQuery = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      if (!isWeb && dbReady) {
        const investments = await investmentRepo.getAllInvestments();
        if (investments.length > 0) return investments;
      }
      return loadFromStorage<Investment[]>(STORAGE_KEYS.INVESTMENTS, sampleInvestments);
    },
    enabled: dbReady,
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: () => loadFromStorage<Alert[]>(STORAGE_KEYS.ALERTS, []),
  });

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? defaultCategories;
  const budgets = budgetsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const recurring = recurringQuery.data ?? [];
  const debts = debtsQuery.data ?? [];
  const investments = investmentsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const settings = settingsQuery.data ?? defaultSettings;

  // Transaction mutations
  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (!isWeb) {
        await transactionRepo.createTransaction(newTransaction);
        
        if (transaction.type === 'expense' && transaction.fromAccountId) {
          await accountRepo.updateAccountBalance(transaction.fromAccountId, -transaction.amount);
        } else if (transaction.type === 'income' && transaction.toAccountId) {
          await accountRepo.updateAccountBalance(transaction.toAccountId, transaction.amount);
        } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
          await accountRepo.updateAccountBalance(transaction.fromAccountId, -transaction.amount);
          await accountRepo.updateAccountBalance(transaction.toAccountId, transaction.amount);
        }

        if (transaction.goalId) {
          await goalRepo.updateGoalSavedAmount(transaction.goalId, transaction.amount);
        }

        if (transaction.investmentId) {
          const inv = await investmentRepo.getInvestmentById(transaction.investmentId);
          if (inv) {
            await investmentRepo.updateInvestmentValue(transaction.investmentId, transaction.amount, inv.currentValue + transaction.amount);
          }
        }
      }
      
      const updatedTransactions = [...transactions, newTransaction];
      await saveToStorage(STORAGE_KEYS.TRANSACTIONS, updatedTransactions);
      
      let updatedAccounts = [...accounts];
      if (transaction.type === 'expense' && transaction.fromAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === transaction.fromAccountId 
            ? { ...acc, balance: acc.balance - transaction.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (transaction.type === 'income' && transaction.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === transaction.toAccountId 
            ? { ...acc, balance: acc.balance + transaction.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === transaction.fromAccountId) {
            return { ...acc, balance: acc.balance - transaction.amount, updatedAt: new Date().toISOString() };
          }
          if (acc.id === transaction.toAccountId) {
            return { ...acc, balance: acc.balance + transaction.amount, updatedAt: new Date().toISOString() };
          }
          return acc;
        });
      }
      await saveToStorage(STORAGE_KEYS.ACCOUNTS, updatedAccounts);
      
      return { transactions: updatedTransactions, accounts: updatedAccounts };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['transactions'], data.transactions);
      queryClient.setQueryData(['accounts'], data.accounts);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (updatedTxn: Transaction) => {
      const oldTxn = transactions.find(t => t.id === updatedTxn.id);
      if (!oldTxn) throw new Error('Transaction not found');

      const txn: Transaction = {
        ...updatedTxn,
        updatedAt: new Date().toISOString(),
      };

      if (!isWeb) {
        // Reverse old transaction
        if (oldTxn.type === 'expense' && oldTxn.fromAccountId) {
          await accountRepo.updateAccountBalance(oldTxn.fromAccountId, oldTxn.amount);
        } else if (oldTxn.type === 'income' && oldTxn.toAccountId) {
          await accountRepo.updateAccountBalance(oldTxn.toAccountId, -oldTxn.amount);
        } else if (oldTxn.type === 'transfer' && oldTxn.fromAccountId && oldTxn.toAccountId) {
          await accountRepo.updateAccountBalance(oldTxn.fromAccountId, oldTxn.amount);
          await accountRepo.updateAccountBalance(oldTxn.toAccountId, -oldTxn.amount);
        }

        // Apply new transaction
        if (txn.type === 'expense' && txn.fromAccountId) {
          await accountRepo.updateAccountBalance(txn.fromAccountId, -txn.amount);
        } else if (txn.type === 'income' && txn.toAccountId) {
          await accountRepo.updateAccountBalance(txn.toAccountId, txn.amount);
        } else if (txn.type === 'transfer' && txn.fromAccountId && txn.toAccountId) {
          await accountRepo.updateAccountBalance(txn.fromAccountId, -txn.amount);
          await accountRepo.updateAccountBalance(txn.toAccountId, txn.amount);
        }

        await transactionRepo.updateTransaction(txn);
      }

      let updatedAccounts = [...accounts];
      // Reverse old
      if (oldTxn.type === 'expense' && oldTxn.fromAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === oldTxn.fromAccountId 
            ? { ...acc, balance: acc.balance + oldTxn.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (oldTxn.type === 'income' && oldTxn.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === oldTxn.toAccountId 
            ? { ...acc, balance: acc.balance - oldTxn.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (oldTxn.type === 'transfer' && oldTxn.fromAccountId && oldTxn.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === oldTxn.fromAccountId) return { ...acc, balance: acc.balance + oldTxn.amount };
          if (acc.id === oldTxn.toAccountId) return { ...acc, balance: acc.balance - oldTxn.amount };
          return acc;
        });
      }

      // Apply new
      if (txn.type === 'expense' && txn.fromAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === txn.fromAccountId 
            ? { ...acc, balance: acc.balance - txn.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (txn.type === 'income' && txn.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === txn.toAccountId 
            ? { ...acc, balance: acc.balance + txn.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (txn.type === 'transfer' && txn.fromAccountId && txn.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === txn.fromAccountId) return { ...acc, balance: acc.balance - txn.amount };
          if (acc.id === txn.toAccountId) return { ...acc, balance: acc.balance + txn.amount };
          return acc;
        });
      }

      const updatedTransactions = transactions.map(t => t.id === txn.id ? txn : t);
      await saveToStorage(STORAGE_KEYS.TRANSACTIONS, updatedTransactions);
      await saveToStorage(STORAGE_KEYS.ACCOUNTS, updatedAccounts);

      return { transactions: updatedTransactions, accounts: updatedAccounts };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['transactions'], data.transactions);
      queryClient.setQueryData(['accounts'], data.accounts);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');
      
      if (!isWeb) {
        if (transaction.type === 'expense' && transaction.fromAccountId) {
          await accountRepo.updateAccountBalance(transaction.fromAccountId, transaction.amount);
        } else if (transaction.type === 'income' && transaction.toAccountId) {
          await accountRepo.updateAccountBalance(transaction.toAccountId, -transaction.amount);
        } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
          await accountRepo.updateAccountBalance(transaction.fromAccountId, transaction.amount);
          await accountRepo.updateAccountBalance(transaction.toAccountId, -transaction.amount);
        }
        await transactionRepo.deleteTransaction(transactionId);
      }
      
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      await saveToStorage(STORAGE_KEYS.TRANSACTIONS, updatedTransactions);
      
      let updatedAccounts = [...accounts];
      if (transaction.type === 'expense' && transaction.fromAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === transaction.fromAccountId 
            ? { ...acc, balance: acc.balance + transaction.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (transaction.type === 'income' && transaction.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => 
          acc.id === transaction.toAccountId 
            ? { ...acc, balance: acc.balance - transaction.amount, updatedAt: new Date().toISOString() }
            : acc
        );
      } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === transaction.fromAccountId) {
            return { ...acc, balance: acc.balance + transaction.amount, updatedAt: new Date().toISOString() };
          }
          if (acc.id === transaction.toAccountId) {
            return { ...acc, balance: acc.balance - transaction.amount, updatedAt: new Date().toISOString() };
          }
          return acc;
        });
      }
      await saveToStorage(STORAGE_KEYS.ACCOUNTS, updatedAccounts);
      
      return { transactions: updatedTransactions, accounts: updatedAccounts };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['transactions'], data.transactions);
      queryClient.setQueryData(['accounts'], data.accounts);
    },
  });

  // Account mutations
  const addAccountMutation = useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newAccount: Account = {
        ...account,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isWeb) await accountRepo.createAccount(newAccount);
      const updated = [...accounts, newAccount];
      await saveToStorage(STORAGE_KEYS.ACCOUNTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['accounts'], data),
  });

  const updateAccountMutation = useMutation({
    mutationFn: async (account: Account) => {
      const updated = accounts.map(a => a.id === account.id ? { ...account, updatedAt: new Date().toISOString() } : a);
      if (!isWeb) await accountRepo.updateAccount({ ...account, updatedAt: new Date().toISOString() });
      await saveToStorage(STORAGE_KEYS.ACCOUNTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['accounts'], data),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      if (!isWeb) {
        const hasTxns = await accountRepo.hasTransactions(accountId);
        if (hasTxns) throw new Error('Cannot delete account with transactions');
        await accountRepo.deleteAccount(accountId);
      }
      const updated = accounts.filter(a => a.id !== accountId);
      await saveToStorage(STORAGE_KEYS.ACCOUNTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['accounts'], data),
  });

  // Category mutations
  const addCategoryMutation = useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      const newCategory: Category = { ...category, id: generateId() };
      if (!isWeb) await categoryRepo.createCategory(newCategory);
      const updated = [...categories, newCategory];
      await saveToStorage(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['categories'], data),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      const updated = categories.map(c => c.id === category.id ? category : c);
      if (!isWeb) await categoryRepo.updateCategory(category);
      await saveToStorage(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['categories'], data),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!isWeb) {
        const hasTxns = await categoryRepo.hasTransactions(categoryId);
        if (hasTxns) throw new Error('Cannot delete category with transactions');
        await categoryRepo.deleteCategory(categoryId);
      }
      const updated = categories.filter(c => c.id !== categoryId);
      await saveToStorage(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['categories'], data),
  });

  // Budget mutations
  const addBudgetMutation = useMutation({
    mutationFn: async (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
      const existing = budgets.find(b => b.month === budget.month);
      const newBudget: Budget = {
        ...budget,
        id: existing?.id || generateId(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isWeb) await budgetRepo.createBudget(newBudget);
      const updated = [...budgets.filter(b => b.month !== budget.month), newBudget];
      await saveToStorage(STORAGE_KEYS.BUDGETS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['budgets'], data),
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: Budget) => {
      const updatedBudget = { ...budget, updatedAt: new Date().toISOString() };
      if (!isWeb) await budgetRepo.updateBudget(updatedBudget);
      const updated = budgets.map(b => b.id === budget.id ? updatedBudget : b);
      await saveToStorage(STORAGE_KEYS.BUDGETS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['budgets'], data),
  });

  const deleteBudgetLineMutation = useMutation({
    mutationFn: async ({ budgetId, lineId }: { budgetId: string; lineId: string }) => {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget) throw new Error('Budget not found');
      
      const updatedBudget = {
        ...budget,
        lines: budget.lines.filter(l => l.id !== lineId),
        updatedAt: new Date().toISOString(),
      };
      
      if (!isWeb) await budgetRepo.updateBudget(updatedBudget);
      const updated = budgets.map(b => b.id === budgetId ? updatedBudget : b);
      await saveToStorage(STORAGE_KEYS.BUDGETS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['budgets'], data),
  });

  // Goal mutations
  const addGoalMutation = useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newGoal: Goal = {
        ...goal,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isWeb) await goalRepo.createGoal(newGoal);
      const updated = [...goals, newGoal];
      await saveToStorage(STORAGE_KEYS.GOALS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['goals'], data),
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (goal: Goal) => {
      const updatedGoal = { ...goal, updatedAt: new Date().toISOString() };
      if (!isWeb) await goalRepo.updateGoal(updatedGoal);
      const updated = goals.map(g => g.id === goal.id ? updatedGoal : g);
      await saveToStorage(STORAGE_KEYS.GOALS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['goals'], data),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      if (!isWeb) await goalRepo.deleteGoal(goalId);
      const updated = goals.filter(g => g.id !== goalId);
      await saveToStorage(STORAGE_KEYS.GOALS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['goals'], data),
  });

  // Recurring mutations
  const addRecurringMutation = useMutation({
    mutationFn: async (item: Omit<Recurring, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newItem: Recurring = {
        ...item,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isWeb) await recurringRepo.createRecurring(newItem);
      const updated = [...recurring, newItem];
      await saveToStorage(STORAGE_KEYS.RECURRING, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['recurring'], data),
  });

  const updateRecurringMutation = useMutation({
    mutationFn: async (item: Recurring) => {
      const updatedItem = { ...item, updatedAt: new Date().toISOString() };
      if (!isWeb) await recurringRepo.updateRecurring(updatedItem);
      const updated = recurring.map(r => r.id === item.id ? updatedItem : r);
      await saveToStorage(STORAGE_KEYS.RECURRING, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['recurring'], data),
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isWeb) await recurringRepo.deleteRecurring(id);
      const updated = recurring.filter(r => r.id !== id);
      await saveToStorage(STORAGE_KEYS.RECURRING, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['recurring'], data),
  });

  // Investment mutations
  const addInvestmentMutation = useMutation({
    mutationFn: async (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newInvestment: Investment = {
        ...investment,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isWeb) await investmentRepo.createInvestment(newInvestment);
      const updated = [...investments, newInvestment];
      await saveToStorage(STORAGE_KEYS.INVESTMENTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['investments'], data),
  });

  const updateInvestmentMutation = useMutation({
    mutationFn: async (investment: Investment) => {
      const updatedInvestment = { ...investment, updatedAt: new Date().toISOString() };
      if (!isWeb) await investmentRepo.updateInvestment(updatedInvestment);
      const updated = investments.map(i => i.id === investment.id ? updatedInvestment : i);
      await saveToStorage(STORAGE_KEYS.INVESTMENTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['investments'], data),
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isWeb) await investmentRepo.deleteInvestment(id);
      const updated = investments.filter(i => i.id !== id);
      await saveToStorage(STORAGE_KEYS.INVESTMENTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['investments'], data),
  });

  // Debt mutations
  const addDebtMutation = useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newDebt: Debt = {
        ...debt,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isWeb) await debtRepo.createDebt(newDebt);
      const updated = [...debts, newDebt];
      await saveToStorage(STORAGE_KEYS.DEBTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['debts'], data),
  });

  const updateDebtMutation = useMutation({
    mutationFn: async (debt: Debt) => {
      const updatedDebt = { ...debt, updatedAt: new Date().toISOString() };
      if (!isWeb) await debtRepo.updateDebt(updatedDebt);
      const updated = debts.map(d => d.id === debt.id ? updatedDebt : d);
      await saveToStorage(STORAGE_KEYS.DEBTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['debts'], data),
  });

  const deleteDebtMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isWeb) await debtRepo.deleteDebt(id);
      const updated = debts.filter(d => d.id !== id);
      await saveToStorage(STORAGE_KEYS.DEBTS, updated);
      return updated;
    },
    onSuccess: (data) => queryClient.setQueryData(['debts'], data),
  });

  const getMonthlyStats = useCallback((month: string): MonthlyStats => {
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
        if (existing) {
          existing.amount += t.amount;
        } else {
          acc.push({ categoryId: t.categoryId, amount: t.amount });
        }
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
  }, [transactions]);

  const getDateRangeStats = useCallback((startDate: string, endDate: string): MonthlyStats => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const filteredTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });

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
        if (existing) {
          existing.amount += t.amount;
        } else {
          acc.push({ categoryId: t.categoryId, amount: t.amount });
        }
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
  }, [transactions]);

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

  const getCategoryById = useCallback((id: string) => {
    return categories.find(c => c.id === id);
  }, [categories]);

  const getAccountById = useCallback((id: string) => {
    return accounts.find(a => a.id === id);
  }, [accounts]);

  const getTransactionById = useCallback((id: string) => {
    return transactions.find(t => t.id === id);
  }, [transactions]);

  const checkAccountHasTransactions = useCallback((accountId: string) => {
    return transactions.some(t => t.fromAccountId === accountId || t.toAccountId === accountId);
  }, [transactions]);

  const checkCategoryHasTransactions = useCallback((categoryId: string) => {
    return transactions.some(t => t.categoryId === categoryId);
  }, [transactions]);

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
    selectedMonth,
    setSelectedMonth,
    dateFilter,
    setDateFilter,
    
    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading || !dbReady,
    
    // Transaction operations
    addTransaction: addTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    
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
    
    // Stats and helpers
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
  };
});
