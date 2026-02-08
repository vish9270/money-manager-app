import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getMonthYear, getMonthKey } from '@/utils/helpers';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export default function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    onMonthChange(getMonthKey(prevDate));
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    onMonthChange(getMonthKey(nextDate));
  };

  const isCurrentMonth = selectedMonth === getMonthKey();

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
