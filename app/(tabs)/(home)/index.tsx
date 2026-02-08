import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, 
  CreditCard, AlertCircle, ChevronRight, Wallet
} from 'lucide-react-native';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { formatCurrency, formatFullCurrency, getPreviousMonths } from '@/utils/helpers';
import MonthSelector from '@/components/MonthSelector';
import QuickActionButton from '@/components/QuickActionButton';
import DonutChart from '@/components/DonutChart';
import BarChart from '@/components/BarChart';
import GoalCard from '@/components/GoalCard';
import TransactionItem from '@/components/TransactionItem';

export default function DashboardScreen() {
  const router = useRouter();
  const { 
    selectedMonth, setSelectedMonth, getMonthlyStats, 
    transactions, goals, categories, accounts,
    getTotalCreditDue, getTotalNetWorth, getTotalInvestmentValue,
    getCurrentBudget, getCategoryById, getAccountById, isLoading
  } = useMoney();

  const stats = useMemo(() => getMonthlyStats(selectedMonth), [selectedMonth, getMonthlyStats]);
  const budget = getCurrentBudget();
  
  const donutData = useMemo(() => {
    return stats.categoryBreakdown.slice(0, 6).map(item => {
      const category = getCategoryById(item.categoryId);
      return {
        value: item.amount,
        color: category?.color || Colors.textMuted,
        label: category?.name || 'Other',
      };
    });
  }, [stats.categoryBreakdown, getCategoryById]);

  const barData = useMemo(() => {
    const months = getPreviousMonths(6).reverse();
    return months.map(month => {
      const monthStats = getMonthlyStats(month);
      const [, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        label: monthNames[parseInt(m) - 1],
        income: monthStats.totalIncome,
        expense: monthStats.totalExpense,
      };
    });
  }, [getMonthlyStats]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status === 'active').slice(0, 3);
  }, [goals]);

  const budgetUsedPercent = useMemo(() => {
    if (!budget) return 0;
    const totalPlanned = budget.lines.reduce((sum, l) => sum + l.planned, 0);
    if (totalPlanned === 0) return 0;
    return Math.round((stats.totalExpense / totalPlanned) * 100);
  }, [budget, stats.totalExpense]);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <LinearGradient
        colors={[Colors.cardGradientStart, Colors.cardGradientEnd]}
        style={styles.summaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabel}>
              <ArrowDownLeft size={14} color={Colors.income} />
              <Text style={styles.summaryLabelText}>Income</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(stats.totalIncome)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabel}>
              <ArrowUpRight size={14} color={Colors.expense} />
              <Text style={styles.summaryLabelText}>Expense</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(stats.totalExpense)}</Text>
          </View>
        </View>
        <View style={styles.surplusRow}>
          <Text style={styles.surplusLabel}>
            {stats.surplus >= 0 ? 'Surplus' : 'Deficit'}
          </Text>
          <Text style={[styles.surplusValue, stats.surplus < 0 && styles.deficitValue]}>
            {stats.surplus >= 0 ? '+' : ''}{formatFullCurrency(stats.surplus)}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.quickStats}>
        <TouchableOpacity style={styles.quickStatItem} onPress={() => router.push('/accounts')}>
          <Wallet size={18} color={Colors.accent} />
          <Text style={styles.quickStatLabel}>Net Worth</Text>
          <Text style={styles.quickStatValue}>{formatCurrency(getTotalNetWorth)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickStatItem} onPress={() => router.push('/accounts')}>
          <CreditCard size={18} color={Colors.expense} />
          <Text style={styles.quickStatLabel}>Credit Due</Text>
          <Text style={[styles.quickStatValue, styles.creditValue]}>{formatCurrency(getTotalCreditDue)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickStatItem}>
          <TrendingUp size={18} color={Colors.income} />
          <Text style={styles.quickStatLabel}>Investments</Text>
          <Text style={[styles.quickStatValue, styles.investValue]}>{formatCurrency(getTotalInvestmentValue)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <QuickActionButton 
          icon={<ArrowUpRight size={20} color={Colors.expense} />}
          label="Expense"
          color={Colors.expense}
          onPress={() => router.push('/add-transaction?type=expense')}
        />
        <QuickActionButton 
          icon={<ArrowDownLeft size={20} color={Colors.income} />}
          label="Income"
          color={Colors.income}
          onPress={() => router.push('/add-transaction?type=income')}
        />
        <QuickActionButton 
          icon={<ArrowLeftRight size={20} color={Colors.transfer} />}
          label="Transfer"
          color={Colors.transfer}
          onPress={() => router.push('/add-transaction?type=transfer')}
        />
      </View>

      {budget && (
        <TouchableOpacity style={styles.budgetBanner} onPress={() => router.push('/budgets')}>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetTitle}>Budget</Text>
            <Text style={styles.budgetText}>
              {budgetUsedPercent}% used this month
            </Text>
          </View>
          <View style={[
            styles.budgetIndicator, 
            budgetUsedPercent >= 100 && styles.budgetOverspent,
            budgetUsedPercent >= 80 && budgetUsedPercent < 100 && styles.budgetWarning
          ]}>
            <Text style={styles.budgetPercent}>{budgetUsedPercent}%</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expense Breakdown</Text>
        </View>
        <View style={styles.chartContainer}>
          {stats.totalExpense > 0 ? (
            <>
              <DonutChart 
                data={donutData}
                size={140}
                strokeWidth={20}
                centerText={formatCurrency(stats.totalExpense)}
                centerSubtext="Total"
              />
              <View style={styles.legendContainer}>
                {donutData.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <AlertCircle size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No expenses this month</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Income vs Expense</Text>
        </View>
        <View style={styles.barChartContainer}>
          <BarChart data={barData} height={120} />
        </View>
      </View>

      {activeGoals.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => router.push('/goals')}>
            <Text style={styles.sectionTitle}>Goals</Text>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.goalsList}>
            {activeGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} compact onPress={() => router.push('/goals')} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => router.push('/transactions')}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <ChevronRight size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.transactionsList}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map(txn => (
              <TransactionItem 
                key={txn.id} 
                transaction={txn}
                category={getCategoryById(txn.categoryId)}
                fromAccount={txn.fromAccountId ? getAccountById(txn.fromAccountId) : undefined}
                toAccount={txn.toAccountId ? getAccountById(txn.toAccountId) : undefined}
                onPress={() => router.push('/transactions')}
              />
            ))
          ) : (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Add your first transaction to get started</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  summaryLabelText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  surplusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  surplusLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  surplusValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.income,
  },
  deficitValue: {
    color: Colors.expense,
  },
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  quickStatLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  creditValue: {
    color: Colors.expense,
  },
  investValue: {
    color: Colors.income,
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  budgetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  budgetText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  budgetIndicator: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  budgetWarning: {
    backgroundColor: Colors.warningLight,
  },
  budgetOverspent: {
    backgroundColor: Colors.expenseLight,
  },
  budgetPercent: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 24,
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  barChartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  goalsList: {
    gap: 10,
  },
  transactionsList: {
    gap: 8,
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  bottomPadding: {
    height: 30,
  },
});
