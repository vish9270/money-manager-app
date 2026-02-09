import React, { useState, useMemo, useCallback } from 'react';
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
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { formatCurrency } from '@/utils/helpers';
import { TransactionType, RecurringFrequency, Recurring } from '@/types';
import RecurringItem from '@/components/RecurringItem';
import SearchablePicker from '@/components/SearchablePicker';

export default function RecurringScreen() {
  const {
    recurring,
    categories,
    accounts,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    getCategoryById,
  } = useMoney();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Recurring | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedFromAccountId, setSelectedFromAccountId] = useState('');
  const [selectedToAccountId, setSelectedToAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const activeRecurring = useMemo(
    () => recurring.filter((r) => r.isActive),
    [recurring]
  );
  const inactiveRecurring = useMemo(
    () => recurring.filter((r) => !r.isActive),
    [recurring]
  );

  const monthlyTotal = useMemo(() => {
    return activeRecurring
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => {
        let monthlyAmount = r.amount;
        if (r.frequency === 'quarterly') monthlyAmount /= 3;
        if (r.frequency === 'yearly') monthlyAmount /= 12;
        if (r.frequency === 'weekly') monthlyAmount *= 4;
        return sum + monthlyAmount;
      }, 0);
  }, [activeRecurring]);

  const filteredCategories = useMemo(() => {
    if (type === 'income')
      return categories.filter((c) => c.type === 'income' || c.type === 'both');
    if (type === 'expense')
      return categories.filter((c) => c.type === 'expense' || c.type === 'both');
    return categories;
  }, [type, categories]);

  const categoryItems = useMemo(
    () => filteredCategories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    [filteredCategories]
  );

  const accountItems = useMemo(
    () => accounts.map((a) => ({ id: a.id, name: a.name, color: a.color })),
    [accounts]
  );

  const resetForm = () => {
    setName('');
    setAmount('');
    setType('expense');
    setFrequency('monthly');
    setDayOfMonth('1');
    setSelectedCategoryId('');
    setSelectedFromAccountId('');
    setSelectedToAccountId('');
    setNotes('');
    setEditingItem(null);
    setIsEditing(false);
  };

  const openEditModal = useCallback((item: Recurring) => {
    setEditingItem(item);
    setIsEditing(true);
    setName(item.name);
    setAmount(item.amount.toString());
    setType(item.type);
    setFrequency(item.frequency);
    setDayOfMonth(item.dayOfMonth?.toString() || '1');
    setSelectedCategoryId(item.categoryId);
    setSelectedFromAccountId(item.fromAccountId || '');
    setSelectedToAccountId(item.toAccountId || '');
    setNotes(item.notes || '');
    setShowModal(true);
  }, []);

  const handleSubmit = () => {
    if (!name.trim() || !amount || !selectedCategoryId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
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

    if (type === 'transfer' && (!selectedFromAccountId || !selectedToAccountId)) {
      Alert.alert('Error', 'Please select both from and to accounts');
      return;
    }

    const nextRunDate = new Date();
    nextRunDate.setDate(parseInt(dayOfMonth) || 1);
    if (nextRunDate < new Date()) {
      nextRunDate.setMonth(nextRunDate.getMonth() + 1);
    }

    const itemData = {
      name: name.trim(),
      type,
      amount: amountNum,
      frequency,
      dayOfMonth: parseInt(dayOfMonth) || 1,
      categoryId: selectedCategoryId,
      fromAccountId: type !== 'income' ? selectedFromAccountId : undefined,
      toAccountId: type !== 'expense' ? selectedToAccountId : undefined,
      isActive: editingItem?.isActive ?? true,
      nextRunDate: nextRunDate.toISOString(),
      notes: notes.trim() || undefined,
    };

    if (isEditing && editingItem) {
      updateRecurring({
        ...editingItem,
        ...itemData,
      });
    } else {
      addRecurring(itemData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = useCallback(
    (item: Recurring) => {
      Alert.alert(
        'Delete Recurring',
        `Are you sure you want to delete "${item.name}"? Future runs will be stopped.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteRecurring(item.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    },
    [deleteRecurring]
  );

  const handleToggle = (id: string, isActive: boolean) => {
    const item = recurring.find((r) => r.id === id);
    if (item) {
      updateRecurring({ ...item, isActive });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleItemPress = useCallback(
    (item: Recurring) => {
      Alert.alert(item.name, 'What would you like to do?', [
        { text: 'Edit', onPress: () => openEditModal(item) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [openEditModal, handleDelete]
  );

  const typeButtons: { type: TransactionType; label: string; color: string }[] = [
    { type: 'expense', label: 'Expense', color: Colors.expense },
    { type: 'income', label: 'Income', color: Colors.income },
    { type: 'transfer', label: 'Transfer', color: Colors.transfer },
  ];

  const frequencyButtons: { freq: RecurringFrequency; label: string }[] = [
    { freq: 'monthly', label: 'Monthly' },
    { freq: 'weekly', label: 'Weekly' },
    { freq: 'quarterly', label: 'Quarterly' },
    { freq: 'yearly', label: 'Yearly' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Recurring' }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Ionicons name="repeat" size={24} color={Colors.accent} />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Monthly Recurring Expenses</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlyTotal)}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{activeRecurring.length}</Text>
          </View>
        </View>

        {activeRecurring.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active ({activeRecurring.length})</Text>
            <View style={styles.recurringList}>
              {activeRecurring.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleItemPress(item)}>
                  <RecurringItem
                    item={item}
                    category={getCategoryById(item.categoryId)}
                    onToggle={(isActive) => handleToggle(item.id, isActive)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {inactiveRecurring.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Inactive ({inactiveRecurring.length})
            </Text>
            <View style={styles.recurringList}>
              {inactiveRecurring.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleItemPress(item)}>
                  <RecurringItem
                    item={item}
                    category={getCategoryById(item.categoryId)}
                    onToggle={(isActive) => handleToggle(item.id, isActive)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {recurring.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No recurring items</Text>
            <Text style={styles.emptySubtitle}>
              Add recurring transactions like salary, EMIs, or subscriptions
            </Text>
          </View>
        )}

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
        <Ionicons name="add" size={24} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Recurring' : 'New Recurring'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeButtons}>
                {typeButtons.map((btn) => (
                  <TouchableOpacity
                    key={btn.type}
                    style={[
                      styles.typeButton,
                      type === btn.type && { backgroundColor: btn.color },
                    ]}
                    onPress={() => setType(btn.type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        type === btn.type && styles.typeButtonTextActive,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Monthly Salary"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="10000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                {frequencyButtons.map((btn) => (
                  <TouchableOpacity
                    key={btn.freq}
                    style={[
                      styles.frequencyButton,
                      frequency === btn.freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFrequency(btn.freq)}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === btn.freq && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Day of Month</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
              />

              <View style={styles.pickerSection}>
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
                <View style={styles.pickerSection}>
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
                <View style={styles.pickerSection}>
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

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add notes..."
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity style={styles.addButton} onPress={handleSubmit}>
                <Text style={styles.addButtonText}>
                  {isEditing ? 'Save Changes' : 'Add Recurring'}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  recurringList: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomPadding: {
    height: 100,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScroll: {
    flex: 1,
    marginTop: 60,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.textInverse,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
  },
  frequencyButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: Colors.textInverse,
    fontWeight: '500' as const,
  },
  pickerSection: {
    marginTop: 16,
  },
  addButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
