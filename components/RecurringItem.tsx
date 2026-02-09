import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Recurring, Category } from '@/types';
import { formatFullCurrency, formatShortDate } from '@/utils/helpers';

interface RecurringItemProps {
  item: Recurring;
  category?: Category;
  onToggle?: (isActive: boolean) => void;
  onPress?: () => void;
}

export default function RecurringItem({ item, category, onToggle, onPress }: RecurringItemProps) {
  const getTypeIcon = () => {
    switch (item.type) {
      case 'income':
        return <Ionicons name="arrow-down-outline" size={16} color={Colors.income} />;
      case 'expense':
        return <Ionicons name="arrow-up-outline" size={16} color={Colors.expense} />;
      case 'transfer':
        return <Ionicons name="swap-horizontal-outline" size={16} color={Colors.transfer} />;
      default:
        return <Ionicons name="help-outline" size={16} color={Colors.textMuted} />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'income':
        return Colors.income;
      case 'expense':
        return Colors.expense;
      case 'transfer':
        return Colors.transfer;
      default:
        return Colors.textMuted;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, !item.isActive && styles.inactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            {getTypeIcon()}
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <Text style={[styles.amount, { color: getTypeColor() }]}>
            {formatFullCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.scheduleInfo}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.schedule}>
              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} • Day{' '}
              {item.dayOfMonth || 1}
            </Text>
          </View>
          <Text style={styles.nextRun}>Next: {formatShortDate(item.nextRunDate)}</Text>
        </View>

        {category && (
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>
        )}
      </View>

      <Switch
        value={item.isActive}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
        thumbColor={item.isActive ? Colors.accent : Colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    gap: 12,
  },
  inactive: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  schedule: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nextRun: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryName: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
