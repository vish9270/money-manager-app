import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Building2, PiggyBank, Banknote, CreditCard, Landmark, Wallet, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { AccountType } from '@/types';
import { formatCurrency } from '@/utils/helpers';

const accountTypeOptions: { type: AccountType; label: string; icon: string }[] = [
  { type: 'savings', label: 'Savings', icon: 'Building2' },
  { type: 'checking', label: 'Checking', icon: 'Landmark' },
  { type: 'cash', label: 'Cash', icon: 'Banknote' },
  { type: 'wallet', label: 'Wallet', icon: 'Wallet' },
  { type: 'credit_card', label: 'Credit Card', icon: 'CreditCard' },
  { type: 'investment', label: 'Investment', icon: 'PiggyBank' },
  { type: 'loan', label: 'Loan', icon: 'Landmark' },
];

const iconComponents: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Building2,
  PiggyBank,
  Banknote,
  CreditCard,
  Landmark,
  Wallet,
};

const accountTypeIconMap: Record<AccountType, string> = {
  savings: 'Building2',
  checking: 'Landmark',
  cash: 'Banknote',
  wallet: 'Wallet',
  credit_card: 'CreditCard',
  investment: 'PiggyBank',
  loan: 'Landmark',
};

const colorOptions = [
  Colors.chart.blue,
  Colors.chart.green,
  Colors.chart.purple,
  Colors.chart.orange,
  Colors.chart.red,
  Colors.chart.pink,
  Colors.chart.teal,
  Colors.chart.yellow,
];

function isDebtAccountType(type: AccountType) {
  return type === 'credit_card' || type === 'loan';
}

function parseNumberOrZero(text: string) {
  const cleaned = text.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStoredBalance(type: AccountType, inputValue: number) {
  const n = Number.isFinite(inputValue) ? inputValue : 0;
  return isDebtAccountType(type) ? -Math.abs(n) : n;
}

export default function AddAccountScreen() {
  const router = useRouter();
  const { addAccount } = useMoney();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('savings');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState(Colors.chart.blue);

  const selectedTypeInfo = useMemo(() => {
    return accountTypeOptions.find(t => t.type === type);
  }, [type]);

  const isDebtType = isDebtAccountType(type);

  const outstandingInput = useMemo(() => parseNumberOrZero(balance), [balance]);
  const creditLimitInput = useMemo(() => parseNumberOrZero(creditLimit), [creditLimit]);

  const derivedCreditSummary = useMemo(() => {
    if (type !== 'credit_card') return null;

    const outstanding = Math.max(0, outstandingInput);
    const limit = Math.max(0, creditLimitInput);
    const available = Math.max(0, limit - outstanding);

    return { outstanding, limit, available };
  }, [type, outstandingInput, creditLimitInput]);

  useEffect(() => {
    if (type !== 'credit_card') {
      setCreditLimit('');
    }
  }, [type]);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    const balanceNum = parseNumberOrZero(balance);

    if (balanceNum < 0) {
      Alert.alert('Error', 'Please enter a positive amount.');
      return;
    }

    const storedBalance = normalizeStoredBalance(type, balanceNum);

    const creditLimitNum = type === 'credit_card' ? parseNumberOrZero(creditLimit) : undefined;

    // Strong validation for credit card
    if (type === 'credit_card') {
      if (!creditLimit.trim()) {
        Alert.alert('Error', 'Please enter the credit limit.');
        return;
      }

      if ((creditLimitNum ?? 0) <= 0) {
        Alert.alert('Error', 'Credit limit must be greater than 0.');
        return;
      }

      if (balanceNum > (creditLimitNum ?? 0)) {
        Alert.alert(
          'Outstanding is higher than limit',
          'Your outstanding amount is greater than your credit limit. Are you sure you want to save?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save Anyway',
              onPress: () => {
                addAccount({
                  name: trimmedName,
                  type,
                  balance: storedBalance,
                  creditLimit: creditLimitNum,
                  icon: accountTypeIconMap[type] || 'Wallet',
                  color: selectedColor,
                  isActive: true,
                });

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              },
            },
          ]
        );
        return;
      }
    }

    addAccount({
      name: trimmedName,
      type,
      balance: storedBalance,
      creditLimit: type === 'credit_card' ? creditLimitNum : undefined,
      icon: accountTypeIconMap[type] || selectedTypeInfo?.icon || 'Wallet',
      color: selectedColor,
      isActive: true,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, type, balance, creditLimit, selectedColor, addAccount, router, selectedTypeInfo]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Add Account',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit}>
              <Check size={24} color={Colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Type</Text>
          <View style={styles.typeGrid}>
            {accountTypeOptions.map(opt => {
              const IconComp = iconComponents[opt.icon];
              const isSelected = type === opt.type;

              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.typeOption,
                    isSelected && {
                      backgroundColor: selectedColor + '20',
                      borderColor: selectedColor,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setType(opt.type);
                  }}
                >
                  {IconComp && (
                    <IconComp size={24} color={isSelected ? selectedColor : Colors.textSecondary} />
                  )}

                  <Text style={[styles.typeOptionText, isSelected && { color: selectedColor }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., HDFC Savings"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isDebtType ? 'Outstanding Amount (₹)' : 'Current Balance (₹)'}
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
            <Text style={styles.helperText}>
              Outstanding = how much you currently owe on this card.
            </Text>
          )}

          {type === 'loan' && (
            <Text style={styles.helperText}>
              Outstanding = remaining amount you still need to pay.
            </Text>
          )}
        </View>

        {type === 'credit_card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Limit (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="200000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />
          </View>
        )}

        {/* ✅ CREDIT CARD LIVE SUMMARY */}
        {type === 'credit_card' && derivedCreditSummary && (
          <View style={styles.section}>
            <View style={styles.creditSummaryCard}>
              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>Total Limit</Text>
                <Text style={styles.creditValue}>{formatCurrency(derivedCreditSummary.limit)}</Text>
              </View>

              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>Outstanding Due</Text>
                <Text style={[styles.creditValue, { color: Colors.expense }]}>
                  {formatCurrency(derivedCreditSummary.outstanding)}
                </Text>
              </View>

              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>Available Limit</Text>
                <Text style={[styles.creditValue, { color: Colors.income }]}>
                  {formatCurrency(derivedCreditSummary.available)}
                </Text>
              </View>
            </View>

            <Text style={styles.helperText}>
              We store credit card outstanding internally as a negative balance so net worth stays correct.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color</Text>
          <View style={styles.colorGrid}>
            {colorOptions.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Account</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  section: { marginTop: 24, paddingHorizontal: 16 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  typeOption: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  typeOptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
  },

  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 16,
  },

  colorGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

  colorOption: { width: 40, height: 40, borderRadius: 20 },

  colorOptionSelected: { borderWidth: 3, borderColor: Colors.text },

  submitButton: {
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },

  bottomPadding: { height: 40 },

  creditSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },

  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  creditLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },

  creditValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700' as const,
  },
});
