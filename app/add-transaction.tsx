import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { TransactionType, Transaction, Account } from '@/types';

import SearchablePicker from '@/components/SearchablePicker';
import DatePicker from '@/components/DatePicker';

const TRANSFER_CATEGORY_ID = 'cat_transfer';

// ---------------------------
// AMOUNT HELPERS
// ---------------------------
function sanitizeAmountInput(value: string) {
  let v = value.replace(/[^0-9.]/g, '');

  const parts = v.split('.');
  if (parts.length > 2) {
    v = parts[0] + '.' + parts.slice(1).join('');
  }

  const [intPart, decPart] = v.split('.');
  if (decPart && decPart.length > 2) {
    v = intPart + '.' + decPart.slice(0, 2);
  }

  return v;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed === '.') return null;

  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;

  return n;
}

// ---------------------------
// CREDIT CARD HELPERS (UI)
// ---------------------------
function isCreditCard(account?: Account | null) {
  return account?.type === 'credit_card';
}

function getOutstanding(balance: number) {
  // credit card stored negative when due
  return Math.abs(Math.min(balance, 0));
}

function getAvailable(limit: number, balance: number) {
  return Math.max(0, limit - getOutstanding(balance));
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; id?: string }>();

  const {
    categories,
    accounts,
    goals,
    investments,

    addTransactionAsync,
    updateTransactionAsync,

    getTransactionById,
    isAddingTransaction,
    isUpdatingTransaction,
  } = useMoney();

  const isEditing = !!params.id;
  const existingTransaction = isEditing && params.id ? getTransactionById(params.id) : null;

  // IMPORTANT:
  // - When editing, always take type from existing txn
  // - When adding, allow params.type override
  const [type, setType] = useState<TransactionType>(() => {
    if (isEditing && existingTransaction?.type) return existingTransaction.type;
    if (params.type) return params.type as TransactionType;
    return 'expense';
  });

  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedFromAccountId, setSelectedFromAccountId] = useState('');
  const [selectedToAccountId, setSelectedToAccountId] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());

  const isPending = isAddingTransaction || isUpdatingTransaction;

  // =========================
  // Populate form on edit
  // =========================
  useEffect(() => {
    if (!isEditing) return;
    if (!existingTransaction) return;

    setType(existingTransaction.type);
    setAmount(existingTransaction.amount?.toString() || '');
    setSelectedCategoryId(existingTransaction.categoryId || '');
    setSelectedFromAccountId(existingTransaction.fromAccountId || '');
    setSelectedToAccountId(existingTransaction.toAccountId || '');
    setSelectedGoalId(existingTransaction.goalId || '');
    setSelectedInvestmentId(existingTransaction.investmentId || '');
    setNotes(existingTransaction.notes || '');
    setDate(new Date(existingTransaction.date));
  }, [isEditing, existingTransaction]);

  // =========================
  // Filter categories
  // =========================
  const filteredCategories = useMemo(() => {
    if (type === 'income') return categories.filter(c => c.type === 'income' || c.type === 'both');
    if (type === 'expense') return categories.filter(c => c.type === 'expense' || c.type === 'both');

    return categories.filter(c => c.id === TRANSFER_CATEGORY_ID);
  }, [type, categories]);

  const categoryItems = useMemo(
    () => filteredCategories.map(c => ({ id: c.id, name: c.name, color: c.color })),
    [filteredCategories]
  );

  // =========================
  // Account pickers
  // =========================
  const accountItems = useMemo(
    () => accounts.map(a => ({ id: a.id, name: a.name, color: a.color })),
    [accounts]
  );

  const goalItems = useMemo(
    () => [
      { id: '', name: 'None', color: Colors.textMuted },
      ...goals
        .filter(g => g.status === 'active')
        .map(g => ({ id: g.id, name: g.name, color: g.color })),
    ],
    [goals]
  );

  const investmentItems = useMemo(
    () => [
      { id: '', name: 'None', color: Colors.textMuted },
      ...investments.map(i => ({ id: i.id, name: i.name, color: Colors.income })),
    ],
    [investments]
  );

  // =========================
  // Reset fields when switching type
  // =========================
  useEffect(() => {
    if (isEditing) return;

    setSelectedFromAccountId('');
    setSelectedToAccountId('');

    if (type === 'transfer') {
      setSelectedCategoryId(TRANSFER_CATEGORY_ID);
    } else {
      setSelectedCategoryId('');
    }

    setSelectedGoalId('');
    setSelectedInvestmentId('');
  }, [type, isEditing]);

  // =========================
  // Enforce: Goal OR Investment (not both)
  // =========================
  useEffect(() => {
    if (!selectedGoalId) return;
    if (!selectedInvestmentId) return;

    // goal wins
    setSelectedInvestmentId('');
  }, [selectedGoalId, selectedInvestmentId]);

  useEffect(() => {
    if (!selectedInvestmentId) return;
    if (!selectedGoalId) return;

    // investment wins
    setSelectedGoalId('');
  }, [selectedGoalId, selectedInvestmentId]);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {
    if (isPending) return;

    const parsedAmount = parseAmount(amount);
    if (!parsedAmount) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Category rules
    if (type !== 'transfer' && !selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Account rules
    if (type === 'expense' && !selectedFromAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    if (type === 'income' && !selectedToAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    if (type === 'transfer') {
      if (!selectedFromAccountId || !selectedToAccountId) {
        Alert.alert('Error', 'Please select both from and to accounts');
        return;
      }
      if (selectedFromAccountId === selectedToAccountId) {
        Alert.alert('Error', 'From and To accounts cannot be the same');
        return;
      }
    }

    // Prevent goal+investment together (extra safety)
    if (selectedGoalId && selectedInvestmentId) {
      Alert.alert('Error', 'Please link this transaction to either a Goal or an Investment, not both.');
      return;
    }

    // ---------------------------
    // UI CREDIT CARD VALIDATION
    // (fast feedback before provider throws)
    // ---------------------------
    const fromAccount = accounts.find(a => a.id === selectedFromAccountId) ?? null;
    const toAccount = accounts.find(a => a.id === selectedToAccountId) ?? null;

    // 1) Spending on credit card
    if (type === 'expense' && isCreditCard(fromAccount)) {
      const limit = fromAccount?.creditLimit ?? 0;

      if (limit <= 0) {
        Alert.alert('Error', 'This credit card has no limit set.');
        return;
      }

      const available = getAvailable(limit, fromAccount!.balance);

      if (parsedAmount > available) {
        Alert.alert(
          'Credit Limit Exceeded',
          `Available: ₹${available.toFixed(0)}\nTrying to spend: ₹${parsedAmount.toFixed(0)}`
        );
        return;
      }
    }

    // 2) Paying credit card (transfer INTO credit card)
    if (type === 'transfer' && isCreditCard(toAccount)) {
      const outstanding = getOutstanding(toAccount!.balance);

      if (outstanding <= 0) {
        Alert.alert('Error', 'This credit card has no outstanding due to pay.');
        return;
      }

      if (parsedAmount > outstanding) {
        Alert.alert(
          'Payment Too High',
          `Outstanding Due: ₹${outstanding.toFixed(0)}\nTrying to pay: ₹${parsedAmount.toFixed(0)}`
        );
        return;
      }
    }

    // ---------------------------
    // Build transaction payload
    // ---------------------------
    const transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
      type,
      amount: parsedAmount,
      date: date.toISOString(),

      categoryId: type === 'transfer' ? TRANSFER_CATEGORY_ID : selectedCategoryId,

      fromAccountId: type !== 'income' ? selectedFromAccountId : undefined,
      toAccountId: type !== 'expense' ? selectedToAccountId : undefined,

      notes: notes.trim() || undefined,

      goalId: selectedGoalId || undefined,
      investmentId: selectedInvestmentId || undefined,

      debtId: undefined,
      recurringId: undefined,
      tags: undefined,
    };

    try {
      if (isEditing && existingTransaction) {
        await updateTransactionAsync({
          ...existingTransaction,
          ...transactionData,
        } as Transaction);
      } else {
        await addTransactionAsync(transactionData);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
  } catch (e) {
  console.error('Transaction save failed', e);

  const message =
    e instanceof Error ? e.message : 'Failed to save transaction. Please try again.';

      Alert.alert('Error', message);
  } 
};

  const typeButtons: { type: TransactionType; label: string; icon: React.ReactNode; color: string }[] = [
    {
      type: 'expense',
      label: 'Expense',
      icon: (
        <Ionicons
          name="arrow-up-outline"
          size={18}
          color={type === 'expense' ? Colors.textInverse : Colors.expense}
        />
      ),
      color: Colors.expense,
    },
    {
      type: 'income',
      label: 'Income',
      icon: (
        <Ionicons
          name="arrow-down-outline"
          size={18}
          color={type === 'income' ? Colors.textInverse : Colors.income}
        />
      ),
      color: Colors.income,
    },
    {
      type: 'transfer',
      label: 'Transfer',
      icon: (
        <Ionicons
          name="swap-horizontal-outline"
          size={18}
          color={type === 'transfer' ? Colors.textInverse : Colors.transfer}
        />
      ),
      color: Colors.transfer,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Transaction' : 'Add Transaction',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} disabled={isPending}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
              <Ionicons
                name="checkmark"
                size={24}
                color={isPending ? Colors.textMuted : Colors.accent}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.typeSelector}>
          {typeButtons.map(btn => (
            <TouchableOpacity
              key={btn.type}
              style={[styles.typeButton, type === btn.type && { backgroundColor: btn.color }]}
              onPress={() => {
                if (isPending) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setType(btn.type);
              }}
              disabled={isPending}
            >
              {btn.icon}
              <Text style={[styles.typeButtonText, type === btn.type && styles.typeButtonTextActive]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(v) => setAmount(sanitizeAmountInput(v))}
            autoFocus={!isEditing}
            editable={!isPending}
          />
        </View>

        <View style={styles.section}>
          <DatePicker date={date} onDateChange={setDate} label="Date" maximumDate={new Date()} />
        </View>

        {type !== 'transfer' && (
          <View style={styles.section}>
            <SearchablePicker
              items={categoryItems}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              label="Category"
              placeholder="Select a category"
              searchPlaceholder="Search categories..."
            />
          </View>
        )}

        {type !== 'income' && (
          <View style={styles.section}>
            <SearchablePicker
              items={accountItems}
              selectedId={selectedFromAccountId}
              onSelect={setSelectedFromAccountId}
              label={type === 'transfer' ? 'From Account' : 'Account'}
              placeholder="Select account"
              searchPlaceholder="Search accounts..."
            />
          </View>
        )}

        {type !== 'expense' && (
          <View style={styles.section}>
            <SearchablePicker
              items={accountItems}
              selectedId={selectedToAccountId}
              onSelect={setSelectedToAccountId}
              label={type === 'transfer' ? 'To Account' : 'Account'}
              placeholder="Select account"
              searchPlaceholder="Search accounts..."
            />
          </View>
        )}

        <View style={styles.section}>
          <SearchablePicker
            items={goalItems}
            selectedId={selectedGoalId}
            onSelect={(id) => {
              setSelectedGoalId(id);
              if (id) setSelectedInvestmentId('');
            }}
            label="Link to Goal (Optional)"
            placeholder="None"
            searchPlaceholder="Search goals..."
          />
        </View>

        <View style={styles.section}>
          <SearchablePicker
            items={investmentItems}
            selectedId={selectedInvestmentId}
            onSelect={(id) => {
              setSelectedInvestmentId(id);
              if (id) setSelectedGoalId('');
            }}
            label="Link to Investment (Optional)"
            placeholder="None"
            searchPlaceholder="Search investments..."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add a note..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            editable={!isPending}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          <Text style={styles.submitButtonText}>
            {isPending
              ? isEditing
                ? 'Saving...'
                : 'Adding...'
              : isEditing
                ? 'Save Changes'
                : 'Add Transaction'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: Colors.textInverse,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '300' as const,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  bottomPadding: {
    height: 40,
  },
});