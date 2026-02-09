import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useMoney } from '@/providers/MoneyProvider';
import { formatCurrency, getPreviousMonths, getMonthYear } from '@/utils/helpers';
import BarChart from '@/components/BarChart';

export default function ReportsScreen() {
  const { getMonthlyStats, selectedMonth, getCategoryById } = useMoney();

  const stats = useMemo(
    () => getMonthlyStats(selectedMonth),
    [selectedMonth, getMonthlyStats]
  );

  const last6MonthsData = useMemo(() => {
    const months = getPreviousMonths(6).reverse();
    return months.map((month) => {
      const monthStats = getMonthlyStats(month);
      const [, m] = month.split('-');
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return {
        label: monthNames[parseInt(m) - 1],
        income: monthStats.totalIncome,
        expense: monthStats.totalExpense,
        surplus: monthStats.surplus,
      };
    });
  }, [getMonthlyStats]);

  const avgIncome = useMemo(() => {
    const total = last6MonthsData.reduce((sum, m) => sum + m.income, 0);
    return total / last6MonthsData.length;
  }, [last6MonthsData]);

  const avgExpense = useMemo(() => {
    const total = last6MonthsData.reduce((sum, m) => sum + m.expense, 0);
    return total / last6MonthsData.length;
  }, [last6MonthsData]);

  const savingsRate =
    stats.totalIncome > 0 ? ((stats.surplus / stats.totalIncome) * 100).toFixed(1) : '0';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Reports' }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.periodCard}>
          <Ionicons name="document-text-outline" size={20} color={Colors.accent} />
          <Text style={styles.periodText}>{getMonthYear(`${selectedMonth}-01`)}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.income} />
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, styles.incomeValue]}>
              {formatCurrency(stats.totalIncome)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="trending-down-outline" size={20} color={Colors.expense} />
            <Text style={styles.summaryLabel}>Total Expense</Text>
            <Text style={[styles.summaryValue, styles.expenseValue]}>
              {formatCurrency(stats.totalExpense)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="pie-chart-outline" size={20} color={Colors.accent} />
            <Text style={styles.summaryLabel}>Savings Rate</Text>
            <Text style={[styles.summaryValue, styles.accentValue]}>{savingsRate}%</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons
              name="trending-up-outline"
              size={20}
              color={stats.surplus >= 0 ? Colors.income : Colors.expense}
            />
            <Text style={styles.summaryLabel}>Net Surplus</Text>
            <Text
              style={[
                styles.summaryValue,
                stats.surplus >= 0 ? styles.incomeValue : styles.expenseValue,
              ]}
            >
              {stats.surplus >= 0 ? '+' : ''}
              {formatCurrency(stats.surplus)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6 Month Trend</Text>
          <View style={styles.chartCard}>
            <BarChart data={last6MonthsData} height={140} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Averages (6 months)</Text>
          <View style={styles.avgCard}>
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>Avg. Monthly Income</Text>
              <Text style={[styles.avgValue, styles.incomeValue]}>
                {formatCurrency(avgIncome)}
              </Text>
            </View>
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>Avg. Monthly Expense</Text>
              <Text style={[styles.avgValue, styles.expenseValue]}>
                {formatCurrency(avgExpense)}
              </Text>
            </View>
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>Avg. Monthly Savings</Text>
              <Text style={[styles.avgValue, styles.accentValue]}>
                {formatCurrency(avgIncome - avgExpense)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Expense Categories</Text>
          <View style={styles.categoryList}>
            {stats.categoryBreakdown.slice(0, 5).map((item, index) => {
              const category = getCategoryById(item.categoryId);
              const percent =
                stats.totalExpense > 0
                  ? ((item.amount / stats.totalExpense) * 100).toFixed(1)
                  : '0';

              return (
                <View key={item.categoryId} style={styles.categoryItem}>
                  <View style={styles.categoryRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: category?.color || Colors.textMuted },
                    ]}
                  />
                  <Text style={styles.categoryName}>{category?.name || 'Unknown'}</Text>
                  <Text style={styles.categoryPercent}>{percent}%</Text>
                  <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  incomeValue: {
    color: Colors.income,
  },
  expenseValue: {
    color: Colors.expense,
  },
  accentValue: {
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
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  avgCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  categoryList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  categoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  categoryPercent: {
    fontSize: 13,
    color: Colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    minWidth: 70,
    textAlign: 'right',
  },
  bottomPadding: {
    height: 40,
  },
});
