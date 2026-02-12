import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BudgetLine, Category } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import ProgressBar from './ProgressBar';

interface BudgetCardProps {
  line: BudgetLine;
  category?: Category;
  spent: number;
}

export default function BudgetCard({ line, category, spent }: BudgetCardProps) {
  const progress = line.planned > 0 ? (spent / line.planned) * 100 : 0;
  const remaining = line.planned - spent;
  const isOverspent = spent > line.planned;
  const isWarning = progress >= line.alertThreshold && !isOverspent;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: category?.color || Colors.textMuted }]} />
        <Text style={styles.name}>{category?.name || 'Unknown'}</Text>
        {(isOverspent || isWarning) && (
          <AlertTriangle size={14} color={isOverspent ? Colors.expense : Colors.warning} />
        )}
      </View>

      <ProgressBar progress={progress} height={6} showOverspend />

      <View style={styles.footer}>
        <Text style={styles.spentText}>
          {formatCurrency(spent)} <Text style={styles.plannedText}>/ {formatCurrency(line.planned)}</Text>
        </Text>
        <Text style={[styles.remaining, isOverspent && styles.overspent]}>
          {isOverspent ? `Over by ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  plannedText: {
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  remaining: {
    fontSize: 12,
    color: Colors.income,
    fontWeight: '500' as const,
  },
  overspent: {
    color: Colors.expense,
  },
});