import React, { useMemo, useState, useCallback } from 'react';
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
import { Plus, X, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { formatCurrency, getMonthYear } from '@/utils/helpers';
import { Category, BudgetLine } from '@/types';

import MonthSelector from '@/components/MonthSelector';
import BudgetCard from '@/components/BudgetCard';
import ProgressBar from '@/components/ProgressBar';
import SearchablePicker from '@/components/SearchablePicker';

export default function BudgetsScreen() {
  const {
    selectedMonth,
    setSelectedMonth,
    budgets,
    categories,
    getMonthlyStats,
    addBudget,
    updateBudget,
    deleteBudgetLine,
    getCategoryById,
  } = useMoney();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);

  const currentBudget = useMemo(() => {
    return budgets.find(b => b.month === selectedMonth);
  }, [budgets, selectedMonth]);

  const stats = useMemo(() => getMonthlyStats(selectedMonth), [selectedMonth, getMonthlyStats]);

  const budgetData = useMemo(() => {
    if (!currentBudget) return [];

    return currentBudget.lines
      .map(line => {
        const spent = stats.categoryBreakdown.find(c => c.categoryId === line.categoryId)?.amount || 0;
        return { line, spent };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [currentBudget, stats.categoryBreakdown]);

  const totalPlanned = useMemo(() => {
    return currentBudget?.lines.reduce((sum, l) => sum + l.planned, 0) || 0;
  }, [currentBudget]);

  const totalSpent = stats.totalExpense;

  const budgetProgress = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
  const isOverBudget = totalSpent > totalPlanned && totalPlanned > 0;

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense' || c.type === 'both');
  }, [categories]);

  const availableCategories = useMemo(() => {
    const usedIds = currentBudget?.lines.map(l => l.categoryId) || [];
    return expenseCategories.filter(c => !usedIds.includes(c.id));
  }, [expenseCategories, currentBudget]);

  const categoryItems = useMemo(
    () => availableCategories.map(c => ({ id: c.id, name: c.name, color: c.color })),
    [availableCategories]
  );

  const resetForm = () => {
    setSelectedCategoryId('');
    setPlannedAmount('');
    setAlertThreshold('80');
    setEditingLine(null);
  };

  const handleCreateBudgetIfMissing = () => {
    if (currentBudget) return;

    addBudget({
      month: selectedMonth,
      status: 'active',
      lines: [],
    });
  };

  const handleAddBudgetLine = () => {
    if (!selectedCategoryId || !plannedAmount) {
      Alert.alert('Error', 'Please select a category and enter an amount');
      return;
    }

    const amount = parseFloat(plannedAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const threshold = Math.min(Math.max(parseFloat(alertThreshold) || 80, 1), 100);

    const newLine: BudgetLine = {
      id: `bl_${Date.now()}`,
      categoryId: selectedCategoryId,
      planned: amount,
      alertThreshold: threshold,
    };

    const existingLines = currentBudget?.lines || [];

    addBudget({
      month: selectedMonth,
      status: 'active',
      lines: [...existingLines, newLine],
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    resetForm();
  };

  const openEditModal = useCallback((line: BudgetLine) => {
    setEditingLine(line);
    setPlannedAmount(line.planned.toString());
    setAlertThreshold(line.alertThreshold.toString());
    setShowEditModal(true);
  }, []);

  const handleEditBudgetLine = () => {
    if (!editingLine || !plannedAmount || !currentBudget) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amount = parseFloat(plannedAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const threshold = Math.min(Math.max(parseFloat(alertThreshold) || 80, 1), 100);

    const updatedLines = currentBudget.lines.map(l =>
      l.id === editingLine.id ? { ...l, planned: amount, alertThreshold: threshold } : l
    );

    updateBudget({
      ...currentBudget,
      lines: updatedLines,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEditModal(false);
    resetForm();
  };

  const handleDeleteBudgetLine = (lineId: string) => {
    if (!currentBudget) return;

    Alert.alert('Delete Budget Line', 'Remove this category from the budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteBudgetLine({ budgetId: currentBudget.id, lineId });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Monthly Budget</Text>

            {currentBudget && (
              <View style={[styles.statusBadge, isOverBudget && styles.statusBadgeOver]}>
                {isOverBudget ? (
                  <AlertTriangle size={12} color={Colors.expense} />
                ) : (
                  <CheckCircle size={12} color={Colors.income} />
                )}
                <Text style={[styles.statusText, isOverBudget && styles.statusTextOver]}>
                  {isOverBudget ? 'Over Budget' : 'On Track'}
                </Text>
              </View>
            )}
          </View>

          {currentBudget ? (
            <>
              <View style={styles.progressSection}>
                <ProgressBar progress={budgetProgress} height={10} showOverspend />
                <View style={styles.progressLabels}>
                  <Text style={styles.spentLabel}>
                    <Text style={styles.spentValue}>{formatCurrency(totalSpent)}</Text> spent
                  </Text>
                  <Text style={styles.plannedLabel}>of {formatCurrency(totalPlanned)}</Text>
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.statValue}>{Math.round(budgetProgress)}%</Text>
                  <Text style={styles.statLabel}>Used</Text>
                </View>

                <View style={styles.summaryStatItem}>
                  <Text style={[styles.statValue, totalPlanned - totalSpent < 0 && styles.negativeValue]}>
                    {formatCurrency(Math.abs(totalPlanned - totalSpent))}
                  </Text>
                  <Text style={styles.statLabel}>
                    {totalSpent > totalPlanned ? 'Over' : 'Remaining'}
                  </Text>
                </View>

                <View style={styles.summaryStatItem}>
                  <Text style={styles.statValue}>{budgetData.length}</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noBudget}>
              <TrendingUp size={32} color={Colors.textMuted} />
              <Text style={styles.noBudgetText}>
                No budget for {getMonthYear(`${selectedMonth}-01`)}
              </Text>
              <Text style={styles.noBudgetSubtext}>Create a budget to track your spending</Text>
            </View>
          )}
        </View>

        {budgetData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Budgets</Text>

            <View style={styles.budgetList}>
              {budgetData.map(({ line, spent }) => (
                <TouchableOpacity
                  key={line.id}
                  onPress={() => openEditModal(line)}
                  onLongPress={() => handleDeleteBudgetLine(line.id)}
                >
                  <BudgetCard line={line} category={getCategoryById(line.categoryId)} spent={spent} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.hintText}>Tap to edit, long press to delete</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          handleCreateBudgetIfMissing();
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* Add Budget Line Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Budget Category</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <SearchablePicker
                items={categoryItems}
                selectedId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                label="Category"
                placeholder="Select a category"
                searchPlaceholder="Search categories..."
              />
            </View>

            <Text style={styles.inputLabel}>Planned Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="10000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={plannedAmount}
              onChangeText={setPlannedAmount}
            />

            <Text style={styles.inputLabel}>Alert Threshold (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="80"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={alertThreshold}
              onChangeText={setAlertThreshold}
            />

            <TouchableOpacity style={styles.addButton} onPress={handleAddBudgetLine}>
              <Text style={styles.addButtonText}>Add to Budget</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Budget Line Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit {editingLine ? getCategoryById(editingLine.categoryId)?.name : ''} Budget
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Planned Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="10000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={plannedAmount}
              onChangeText={setPlannedAmount}
              autoFocus
            />

            <Text style={styles.inputLabel}>Alert Threshold (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="80"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={alertThreshold}
              onChangeText={setAlertThreshold}
            />

            <TouchableOpacity style={styles.addButton} onPress={handleEditBudgetLine}>
              <Text style={styles.addButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  summaryCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 20,
  },

  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  summaryTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.incomeLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusBadgeOver: { backgroundColor: Colors.expenseLight },

  statusText: { fontSize: 12, fontWeight: '500', color: Colors.income },

  statusTextOver: { color: Colors.expense },

  progressSection: { gap: 8 },

  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  spentLabel: { fontSize: 13, color: Colors.textSecondary },

  spentValue: { fontWeight: '600', color: Colors.text },

  plannedLabel: { fontSize: 13, color: Colors.textMuted },

  summaryStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },

  summaryStatItem: { flex: 1, alignItems: 'center' },

  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text },

  negativeValue: { color: Colors.expense },

  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  noBudget: { alignItems: 'center', paddingVertical: 30, gap: 8 },

  noBudgetText: { fontSize: 15, fontWeight: '500', color: Colors.text },

  noBudgetSubtext: { fontSize: 13, color: Colors.textSecondary },

  section: { marginTop: 24, paddingHorizontal: 16 },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },

  budgetList: { gap: 10 },

  hintText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 12 },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  inputSection: { marginBottom: 16 },

  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
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

  addButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },

  addButtonText: { fontSize: 16, fontWeight: '600', color: Colors.textInverse },
});