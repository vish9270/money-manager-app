import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getMonthYear } from '@/utils/helpers';

interface MonthSelectorProps {
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getCurrentMonthKey(): string {
  return toMonthKey(new Date());
}

export default function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    onMonthChange(toMonthKey(prevDate));
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    onMonthChange(toMonthKey(nextDate));
  };

  // Disable next only when selected month is current month
  const isCurrentMonth = selectedMonth === currentMonthKey;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goToPreviousMonth} style={styles.button}>
        <ChevronLeft size={20} color={Colors.primary} />
      </TouchableOpacity>

      <Text style={styles.monthText}>{getMonthYear(`${selectedMonth}-01`)}</Text>

      <TouchableOpacity
        onPress={goToNextMonth}
        style={[styles.button, isCurrentMonth && styles.buttonDisabled]}
        disabled={isCurrentMonth}
      >
        <ChevronRight size={20} color={isCurrentMonth ? Colors.textMuted : Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    minWidth: 140,
    textAlign: 'center',
  },
});