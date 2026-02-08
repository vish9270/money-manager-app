import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { TrendingUp, PiggyBank, Plus, X, Edit2, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMoney } from '@/providers/MoneyProvider';
import { formatCurrency, formatFullCurrency } from '@/utils/helpers';
import { Investment } from '@/types';
import ProgressBar from '@/components/ProgressBar';

type InvestmentType = Investment['type'];

const investmentTypes: { value: InvestmentType; label: string }[] = [
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'nps', label: 'NPS' },
  { value: 'ppf', label: 'PPF' },
  { value: 'fd', label: 'FD' },
  { value: 'gold', label: 'Gold' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

export default function InvestmentsScreen() {
  const { investments, addInvestment, updateInvestment, deleteInvestment, getTotalInvestmentValue } = useMoney();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Investment | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('mutual_fund');
  const [totalInvested, setTotalInvested] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [notes, setNotes] = useState('');

  const totalInvestedSum = useMemo(() => 
    investments.reduce((sum, inv) => sum + inv.totalInvested, 0), [investments]);
  
  const totalReturns = getTotalInvestmentValue - totalInvestedSum;
  const returnsPercent = totalInvestedSum > 0 ? ((totalReturns / totalInvestedSum) * 100).toFixed(1) : '0';

  const getInvestmentColor = (investmentType: string) => {
    const colors: Record<string, string> = {
      mutual_fund: Colors.chart.blue,
      stocks: Colors.chart.green,
      nps: Colors.chart.purple,
      ppf: Colors.chart.orange,
      fd: Colors.chart.yellow,
      gold: Colors.chart.yellow,
      real_estate: Colors.chart.teal,
      other: Colors.chart.pink,
    };
    return colors[investmentType] || Colors.textSecondary;
  };

  const resetForm = () => {
    setName('');
    setType('mutual_fund');
    setTotalInvested('');
    setCurrentValue('');
    setMonthlyTarget('');
    setNotes('');
    setEditingItem(null);
    setIsEditing(false);
  };

  const openEditModal = useCallback((item: Investment) => {
    setEditingItem(item);
    setIsEditing(true);
    setName(item.name);
    setType(item.type);
    setTotalInvested(item.totalInvested.toString());
    setCurrentValue(item.currentValue.toString());
    setMonthlyTarget(item.monthlyTarget?.toString() || '');
    setNotes(item.notes || '');
    setShowModal(true);
  }, []);

  const handleSubmit = () => {
    if (!name.trim() || !totalInvested || !currentValue) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const invested = parseFloat(totalInvested);
    const current = parseFloat(currentValue);
    const monthly = monthlyTarget ? parseFloat(monthlyTarget) : undefined;

    if (isNaN(invested) || invested < 0) {
      Alert.alert('Error', 'Please enter a valid invested amount');
      return;
    }

    if (isNaN(current) || current < 0) {
      Alert.alert('Error', 'Please enter a valid current value');
      return;
    }

    const itemData = {
      name: name.trim(),
      type,
      totalInvested: invested,
      currentValue: current,
      monthlyTarget: monthly,
      notes: notes.trim() || undefined,
    };

    if (isEditing && editingItem) {
      updateInvestment({
        ...editingItem,
        ...itemData,
      });
    } else {
      addInvestment(itemData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = useCallback((item: Investment) => {
    Alert.alert(
      'Delete Investment',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvestment(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  }, [deleteInvestment]);

  const handleItemPress = useCallback((item: Investment) => {
    Alert.alert(
      item.name,
      'What would you like to do?',
      [
        { text: 'Edit', onPress: () => openEditModal(item) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [openEditModal, handleDelete]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Investments' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <TrendingUp size={24} color={Colors.income} />
            <Text style={styles.summaryTitle}>Portfolio Value</Text>
          </View>
          <Text style={styles.portfolioValue}>{formatFullCurrency(getTotalInvestmentValue)}</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Invested</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalInvestedSum)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Returns</Text>
              <Text style={[
                styles.summaryValue, 
                totalReturns >= 0 ? styles.positiveValue : styles.negativeValue
              ]}>
                {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)} ({returnsPercent}%)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Investments</Text>
          <View style={styles.investmentList}>
            {investments.map(inv => {
              const returns = inv.currentValue - inv.totalInvested;
              const returnsPercentInv = inv.totalInvested > 0 
                ? ((returns / inv.totalInvested) * 100).toFixed(1) 
                : '0';
              const color = getInvestmentColor(inv.type);
              
              return (
                <TouchableOpacity key={inv.id} onPress={() => handleItemPress(inv)}>
                  <View style={styles.investmentCard}>
                    <View style={styles.investmentHeader}>
                      <View style={[styles.investmentIcon, { backgroundColor: color + '20' }]}>
                        <PiggyBank size={20} color={color} />
                      </View>
                      <View style={styles.investmentInfo}>
                        <Text style={styles.investmentName}>{inv.name}</Text>
                        <Text style={styles.investmentType}>
                          {inv.type.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.investmentValues}>
                        <Text style={styles.currentValueText}>{formatCurrency(inv.currentValue)}</Text>
                        <Text style={[
                          styles.returnValue,
                          returns >= 0 ? styles.positiveValue : styles.negativeValue
                        ]}>
                          {returns >= 0 ? '+' : ''}{returnsPercentInv}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.investmentDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Invested</Text>
                        <Text style={styles.detailValue}>{formatCurrency(inv.totalInvested)}</Text>
                      </View>
                      {inv.monthlyTarget && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Monthly Target</Text>
                          <Text style={styles.detailValue}>{formatCurrency(inv.monthlyTarget)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {investments.length === 0 && (
          <View style={styles.emptyState}>
            <TrendingUp size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No investments yet</Text>
            <Text style={styles.emptySubtitle}>Start tracking your investment portfolio</Text>
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
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Investment' : 'Add Investment'}</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Axis Bluechip Fund"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {investmentTypes.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeChip,
                      type === t.value && styles.typeChipActive
                    ]}
                    onPress={() => setType(t.value)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      type === t.value && styles.typeChipTextActive
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Total Invested (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="100000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={totalInvested}
                onChangeText={setTotalInvested}
              />

              <Text style={styles.inputLabel}>Current Value (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="120000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={currentValue}
                onChangeText={setCurrentValue}
              />

              <Text style={styles.inputLabel}>Monthly Target (₹) - Optional</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={monthlyTarget}
                onChangeText={setMonthlyTarget}
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add notes..."
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>{isEditing ? 'Save Changes' : 'Add Investment'}</Text>
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
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  positiveValue: {
    color: Colors.income,
  },
  negativeValue: {
    color: Colors.expense,
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
  investmentList: {
    gap: 12,
  },
  investmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  investmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  investmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  investmentInfo: {
    flex: 1,
  },
  investmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  investmentType: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  investmentValues: {
    alignItems: 'flex-end',
  },
  currentValueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  returnValue: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  investmentDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
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
    minHeight: 500,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  typeChipActive: {
    backgroundColor: Colors.accent,
  },
  typeChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.textInverse,
    fontWeight: '500' as const,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
