import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { TransactionType, Transaction } from '@/types';
import SearchablePicker from '@/components/SearchablePicker';
import DatePicker from '@/components/DatePicker';

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const { 
    categories, accounts, goals, investments,
    addTransaction, updateTransaction, getTransactionById,
    isAddingTransaction, isUpdatingTransaction 
  } = useMoney();
  
  const isEditing = !!params.id;
  const existingTransaction = isEditing && params.id ? getTransactionById(params.id) : null;
  
  const [type, setType] = useState<TransactionType>((params.type as TransactionType) || existingTransaction?.type || 'expense');
  const [amount, setAmount] = useState(existingTransaction?.amount?.toString() || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(existingTransaction?.categoryId || '');
  const [selectedFromAccountId, setSelectedFromAccountId] = useState(existingTransaction?.fromAccountId || '');
  const [selectedToAccountId, setSelectedToAccountId] = useState(existingTransaction?.toAccountId || '');
  const [selectedGoalId, setSelectedGoalId] = useState(existingTransaction?.goalId || '');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(existingTransaction?.investmentId || '');
  const [notes, setNotes] = useState(existingTransaction?.notes || '');
  const [date, setDate] = useState(existingTransaction ? new Date(existingTransaction.date) : new Date());

  const filteredCategories = useMemo(() => {
    if (type === 'income') return categories.filter(c => c.type === 'income' || c.type === 'both');
    if (type === 'expense') return categories.filter(c => c.type === 'expense' || c.type === 'both');
    return categories.filter(c => c.type === 'both');
  }, [type, categories]);

  const categoryItems = useMemo(() => 
    filteredCategories.map(c => ({ id: c.id, name: c.name, color: c.color })),
    [filteredCategories]
  );

  const accountItems = useMemo(() => 
    accounts.map(a => ({ id: a.id, name: a.name, color: a.color })),
    [accounts]
  );

  const goalItems = useMemo(() => [
    { id: '', name: 'None', color: Colors.textMuted },
    ...goals.filter(g => g.status === 'active').map(g => ({ id: g.id, name: g.name, color: g.color }))
  ], [goals]);

  const investmentItems = useMemo(() => [
    { id: '', name: 'None', color: Colors.textMuted },
    ...investments.map(i => ({ id: i.id, name: i.name, color: Colors.income }))
  ], [investments]);

  useEffect(() => {
    if (!isEditing) {
      setSelectedCategoryId('');
      setSelectedFromAccountId('');
      setSelectedToAccountId('');
    }
  }, [type, isEditing]);

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (type === 'expense' && !selectedFromAccountId) {
      Alert.alert('Error', 'Please select a from account');
      return;
    }

    if (type === 'income' && !selectedToAccountId) {
      Alert.alert('Error', 'Please select a to account');
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

    const transactionData = {
      type,
      amount: parseFloat(amount),
      date: date.toISOString(),
      categoryId: selectedCategoryId,
      fromAccountId: type !== 'income' ? selectedFromAccountId : undefined,
      toAccountId: type !== 'expense' ? selectedToAccountId : undefined,
      notes: notes.trim() || undefined,
      goalId: selectedGoalId || undefined,
      investmentId: selectedInvestmentId || undefined,
    };

    if (isEditing && existingTransaction) {
      updateTransaction({
        ...existingTransaction,
        ...transactionData,
      } as Transaction);
    } else {
      addTransaction(transactionData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const typeButtons: { type: TransactionType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'expense', label: 'Expense', icon: <ArrowUpRight size={18} color={type === 'expense' ? Colors.textInverse : Colors.expense} />, color: Colors.expense },
    { type: 'income', label: 'Income', icon: <ArrowDownLeft size={18} color={type === 'income' ? Colors.textInverse : Colors.income} />, color: Colors.income },
    { type: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={18} color={type === 'transfer' ? Colors.textInverse : Colors.transfer} />, color: Colors.transfer },
  ];

  const isPending = isAddingTransaction || isUpdatingTransaction;

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
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
              <Check size={24} color={Colors.accent} />
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
              style={[
                styles.typeButton,
                type === btn.type && { backgroundColor: btn.color }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setType(btn.type);
              }}
            >
              {btn.icon}
              <Text style={[
                styles.typeButtonText,
                type === btn.type && styles.typeButtonTextActive
              ]}>
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
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus={!isEditing}
          />
        </View>

        <View style={styles.section}>
          <DatePicker
            date={date}
            onDateChange={setDate}
            label="Date"
            maximumDate={new Date()}
          />
        </View>

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

        {type !== 'income' && (
          <View style={styles.section}>
            <SearchablePicker
              items={accountItems}
              selectedId={selectedFromAccountId}
              onSelect={setSelectedFromAccountId}
              label="From Account"
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
              label="To Account"
              placeholder="Select account"
              searchPlaceholder="Search accounts..."
            />
          </View>
        )}

        <View style={styles.section}>
          <SearchablePicker
            items={goalItems}
            selectedId={selectedGoalId}
            onSelect={setSelectedGoalId}
            label="Link to Goal (Optional)"
            placeholder="None"
            searchPlaceholder="Search goals..."
          />
        </View>

        <View style={styles.section}>
          <SearchablePicker
            items={investmentItems}
            selectedId={selectedInvestmentId}
            onSelect={setSelectedInvestmentId}
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
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          <Text style={styles.submitButtonText}>
            {isPending ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Transaction')}
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
