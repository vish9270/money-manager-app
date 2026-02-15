import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, TrendingUp, TrendingDown, Wallet, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { formatFullCurrency, formatCurrency } from '@/utils/helpers';
import { Account, AccountType } from '@/types';
import AccountCard from '@/components/AccountCard';

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'savings', label: 'Savings' },
  { value: 'checking', label: 'Checking' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
];

const accountTypeIconMap: Record<AccountType, string> = {
  savings: 'Building2',
  checking: 'Landmark',
  cash: 'Banknote',
  wallet: 'Wallet',
  credit_card: 'CreditCard',
  investment: 'PiggyBank',
  loan: 'Landmark',
};

const accountColors = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

/**
 * =========================
 * HELPERS (Single Source of Truth)
 * =========================
 */
function isDebtAccountType(type: AccountType) {
  return type === 'credit_card' || type === 'loan';
}

/**
 * User enters a positive number always.
 * We store credit_card + loan balances as NEGATIVE.
 */
function normalizeStoredBalance(type: AccountType, inputValue: number) {
  const n = Number.isFinite(inputValue) ? inputValue : 0;
  return isDebtAccountType(type) ? -Math.abs(n) : n;
}

/**
 * When editing, show positive value for credit_card + loan.
 */
function getDisplayBalance(type: AccountType, storedBalance: number) {
  const n = Number.isFinite(storedBalance) ? storedBalance : 0;
  return isDebtAccountType(type) ? Math.abs(n) : n;
}

/**
 * Safe numeric parsing for text input.
 */
function parseNumberOrZero(text: string) {
  const cleaned = text.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function AccountsScreen() {
  const router = useRouter();

  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    checkAccountHasTransactions,
    getTotalNetWorth,
  } = useMoney();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('savings');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState(accountColors[0]);

  /**
   * If user changes type away from credit_card,
   * clear credit limit so you don't accidentally store it.
   */
  useEffect(() => {
    if (type !== 'credit_card') {
      setCreditLimit('');
    }
  }, [type]);

  const groupedAccounts = useMemo(() => {
    return {
      bank: accounts.filter(a => a.type === 'savings' || a.type === 'checking'),
      cash: accounts.filter(a => a.type === 'cash' || a.type === 'wallet'),
      credit: accounts.filter(a => a.type === 'credit_card'),
      investment: accounts.filter(a => a.type === 'investment'),
      loan: accounts.filter(a => a.type === 'loan'),
    };
  }, [accounts]);

  const totalAssets = useMemo(() => {
    return accounts.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  const totalLiabilities = useMemo(() => {
    return accounts
      .filter(a => a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  }, [accounts]);

  const resetForm = useCallback(() => {
    setName('');
    setType('savings');
    setBalance('');
    setCreditLimit('');
    setSelectedColor(accountColors[0]);
    setEditingAccount(null);
    setIsEditing(false);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, [resetForm]);

  const openEditModal = useCallback((account: Account) => {
    setEditingAccount(account);
    setIsEditing(true);

    setName(account.name);
    setType(account.type);

    // show positive for debt accounts
    const displayBal = getDisplayBalance(account.type, account.balance);
    setBalance(displayBal.toString());

    setCreditLimit(account.creditLimit?.toString() || '');
    setSelectedColor(account.color);

    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    const balanceNum = parseNumberOrZero(balance);
    const storedBalance = normalizeStoredBalance(type, balanceNum);

    const creditLimitNum =
      type === 'credit_card' ? parseNumberOrZero(creditLimit) : undefined;

    if (type === 'credit_card' && creditLimitNum !== undefined && creditLimitNum < 0) {
      Alert.alert('Error', 'Credit limit cannot be negative.');
      return;
    }

    // Production: icon is derived from type
    const icon = accountTypeIconMap[type] || 'Wallet';

    const accountData = {
      name: trimmedName,
      type,
      balance: storedBalance,
      creditLimit: type === 'credit_card' ? creditLimitNum : undefined,
      icon,
      color: selectedColor,
      isActive: true,
    };

    if (isEditing && editingAccount) {
      updateAccount({
        ...editingAccount,
        ...accountData,
      });
    } else {
      addAccount(accountData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  }, [
    name,
    type,
    balance,
    creditLimit,
    selectedColor,
    isEditing,
    editingAccount,
    addAccount,
    updateAccount,
    closeModal,
  ]);

  const handleDelete = useCallback(
    (account: Account) => {
      const hasTransactions = checkAccountHasTransactions(account.id);

      if (hasTransactions) {
        Alert.alert(
          'Cannot Delete',
          'This account has transactions associated with it. Please delete or reassign those transactions first.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert('Delete Account', `Are you sure you want to delete "${account.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAccount(account.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]);
    },
    [deleteAccount, checkAccountHasTransactions]
  );

  const handleAccountPress = useCallback(
    (account: Account) => {
      Alert.alert(account.name, 'What would you like to do?', [
        { text: 'Edit', onPress: () => openEditModal(account) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(account) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [openEditModal, handleDelete]
  );

  const renderAccountGroup = useCallback(
    (title: string, accountsList: Account[]) => {
      if (accountsList.length === 0) return null;

      const groupTotal = accountsList.reduce((sum, a) => sum + a.balance, 0);

      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={[styles.sectionTotal, groupTotal < 0 && styles.negativeTotalText]}>
              {groupTotal < 0 ? '-' : ''}
              {formatCurrency(Math.abs(groupTotal))}
            </Text>
          </View>

          <View style={styles.accountsList}>
            {accountsList.map(account => (
              <TouchableOpacity key={account.id} onPress={() => handleAccountPress(account)}>
                <AccountCard account={account} onPress={() => handleAccountPress(account)} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    },
    [handleAccountPress]
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summarySection}>
          <View style={styles.netWorthCard}>
            <Wallet size={20} color={Colors.accent} />
            <Text style={styles.netWorthLabel}>Net Worth</Text>
            <Text style={[styles.netWorthValue, getTotalNetWorth < 0 && styles.negativeValue]}>
              {formatFullCurrency(getTotalNetWorth)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <TrendingUp size={16} color={Colors.income} />
              <Text style={styles.summaryLabel}>Assets</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalAssets)}</Text>
            </View>

            <View style={styles.summaryCard}>
              <TrendingDown size={16} color={Colors.expense} />
              <Text style={styles.summaryLabel}>Liabilities</Text>
              <Text style={[styles.summaryValue, styles.liabilityValue]}>
                {formatCurrency(totalLiabilities)}
              </Text>
            </View>
          </View>
        </View>

        {renderAccountGroup('Bank Accounts', groupedAccounts.bank)}
        {renderAccountGroup('Cash & Wallets', groupedAccounts.cash)}
        {renderAccountGroup('Credit Cards', groupedAccounts.credit)}
        {renderAccountGroup('Investment Accounts', groupedAccounts.investment)}
        {renderAccountGroup('Loans', groupedAccounts.loan)}

        <Text style={styles.hintText}>Tap on an account to edit or delete</Text>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowModal(true);
        }}
      >
        <Plus size={24} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Account' : 'Add Account'}</Text>

                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., HDFC Savings"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.typeGrid}>
                {accountTypes.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeChip, type === t.value && styles.typeChipActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                {isDebtAccountType(type) ? 'Outstanding Amount (₹)' : 'Current Balance (₹)'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={balance}
                onChangeText={setBalance}
              />

              {type === 'credit_card' && (
                <Text style={styles.hintInputText}>
                  Enter the amount you currently owe (we’ll store it correctly).
                </Text>
              )}

              {type === 'loan' && (
                <Text style={styles.hintInputText}>
                  Enter the outstanding loan amount (we’ll store it correctly).
                </Text>
              )}

              {type === 'credit_card' && (
                <>
                  <Text style={styles.inputLabel}>Credit Limit (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="200000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {accountColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorChip,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorChipSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Save Changes' : 'Add Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  summarySection: { padding: 16, gap: 12 },

  netWorthCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  netWorthLabel: { fontSize: 13, color: Colors.textSecondary },
  netWorthValue: { fontSize: 32, fontWeight: '700' as const, color: Colors.text },
  negativeValue: { color: Colors.expense },

  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase' },
  summaryValue: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  liabilityValue: { color: Colors.expense },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  sectionTotal: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  negativeTotalText: { color: Colors.expense },
  accountsList: { gap: 10 },

  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bottomPadding: { height: 100 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flex: 1, marginTop: 80 },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 500,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },

  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },
  hintInputText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  typeChipActive: { backgroundColor: Colors.accent },
  typeChipText: { fontSize: 13, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.textInverse, fontWeight: '500' as const },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorChip: { width: 36, height: 36, borderRadius: 18 },
  colorChipSelected: { borderWidth: 3, borderColor: Colors.text },

  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textInverse },
});