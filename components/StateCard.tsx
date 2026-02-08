import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Colors from '@/constants/colors';
import { formatCurrency } from '@/utils/helpers';

interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
  prefix?: string;
  showSign?: boolean;
}

export default function StatCard({ label, value, color, icon, prefix = '', showSign = false }: StatCardProps) {
  const displayColor = color || (value >= 0 ? Colors.income : Colors.expense);
  const sign = showSign ? (value >= 0 ? '+' : '') : '';
  
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: displayColor }]}>
        {prefix}{sign}{formatCurrency(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flex: 1,
    minWidth: 100,
  },
  iconContainer: {
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
