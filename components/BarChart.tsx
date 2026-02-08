import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Colors from '@/constants/colors';

interface BarChartProps {
  data: { label: string; income: number; expense: number }[];
  height?: number;
}

export default function BarChart({ data, height = 140 }: BarChartProps) {
  const maxValue = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  
  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        {data.map((item, index) => (
          <View key={index} style={styles.barGroup}>
            <View style={styles.barsContainer}>
              <View 
                style={[
                  styles.bar, 
                  styles.incomeBar,
                  { height: (item.income / maxValue) * height }
                ]} 
              />
              <View 
                style={[
                  styles.bar, 
                  styles.expenseBar,
                  { height: (item.expense / maxValue) * height }
                ]} 
              />
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 14,
    borderRadius: 4,
    minHeight: 4,
  },
  incomeBar: {
    backgroundColor: Colors.income,
  },
  expenseBar: {
    backgroundColor: Colors.expense,
  },
  label: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
