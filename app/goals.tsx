import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Plus, X, Target, Shield, Car, Plane, Home, GraduationCap, Gift, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { formatCurrency, calculateProgress } from '@/utils/helpers';
import GoalCard from '@/components/GoalCard';
import { GoalStatus } from '@/types';

const iconOptions = [
  { icon: 'Shield', component: Shield, label: 'Emergency' },
  { icon: 'Car', component: Car, label: 'Vehicle' },
  { icon: 'Plane', component: Plane, label: 'Travel' },
  { icon: 'Home', component: Home, label: 'Home' },
  { icon: 'GraduationCap', component: GraduationCap, label: 'Education' },
  { icon: 'Gift', component: Gift, label: 'Gift' },
  { icon: 'Sparkles', component: Sparkles, label: 'Other' },
  { icon: 'Target', component: Target, label: 'Target' },
];

const colorOptions = [
  Colors.chart.green,
  Colors.chart.blue,
  Colors.chart.purple,
  Colors.chart.orange,
  Colors.chart.pink,
  Colors.chart.teal,
  Colors.chart.red,
  Colors.chart.yellow,
];

export default function GoalsScreen() {
  const { goals, addGoal, updateGoal } = useMoney();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [selectedColor, setSelectedColor] = useState(Colors.chart.green);

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);

  const totalTargetAmount = useMemo(() => 
    activeGoals.reduce((sum, g) => sum + g.targetAmount, 0), [activeGoals]);
  const totalSavedAmount = useMemo(() => 
    activeGoals.reduce((sum, g) => sum + g.savedAmount, 0), [activeGoals]);

  const handleAddGoal = () => {
    if (!goalName.trim() || !targetAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + 1);

    addGoal({
      name: goalName.trim(),
      targetAmount: amount,
      savedAmount: 0,
      targetDate: targetDate.toISOString(),
      icon: selectedIcon,
      color: selectedColor,
      priority: activeGoals.length + 1,
      status: 'active',
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setGoalName('');
    setTargetAmount('');
    setSelectedIcon('Target');
    setSelectedColor(Colors.chart.green);
  };

  const handleContribute = (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newSavedAmount = goal.savedAmount + amount;
    const newStatus: GoalStatus = newSavedAmount >= goal.targetAmount ? 'completed' : 'active';

    updateGoal({
      ...goal,
      savedAmount: newSavedAmount,
      status: newStatus,
    });

    if (newStatus === 'completed') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Congratulations!', `You've completed your "${goal.name}" goal!`);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Goals' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Target</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalTargetAmount)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Saved</Text>
              <Text style={[styles.summaryValue, styles.savedValue]}>{formatCurrency(totalSavedAmount)}</Text>
            </View>
          </View>
          <View style={styles.overallProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${calculateProgress(totalSavedAmount, totalTargetAmount)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {calculateProgress(totalSavedAmount, totalTargetAmount)}% overall progress
            </Text>
          </View>
        </View>

        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Goals ({activeGoals.length})</Text>
            <View style={styles.goalsList}>
              {activeGoals.map(goal => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal}
                  onPress={() => {
                    Alert.alert(
                      'Add Contribution',
                      `Add a contribution to "${goal.name}"`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Add ₹1,000', 
                          onPress: () => handleContribute(goal.id, 1000)
                        },
                        { 
                          text: 'Add ₹5,000', 
                          onPress: () => handleContribute(goal.id, 5000)
                        }
                      ]
                    );
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed ({completedGoals.length})</Text>
            <View style={styles.goalsList}>
              {completedGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </View>
          </View>
        )}

        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <Target size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySubtitle}>Create your first financial goal to start saving</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Goal</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Emergency Fund"
              placeholderTextColor={Colors.textMuted}
              value={goalName}
              onChangeText={setGoalName}
            />

            <Text style={styles.inputLabel}>Target Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="100000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />

            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {iconOptions.map(opt => {
                const IconComp = opt.component;
                return (
                  <TouchableOpacity
                    key={opt.icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === opt.icon && { backgroundColor: selectedColor + '30' }
                    ]}
                    onPress={() => setSelectedIcon(opt.icon)}
                  >
                    <IconComp size={20} color={selectedIcon === opt.icon ? selectedColor : Colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {colorOptions.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
              <Text style={styles.addButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  savedValue: {
    color: Colors.income,
  },
  overallProgress: {
    marginTop: 16,
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  goalsList: {
    gap: 12,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
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
