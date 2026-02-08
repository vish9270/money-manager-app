import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { CreditCard, TrendingDown, Calendar, Percent } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMoney } from '@/providers/MoneyProvider';
import { formatCurrency, formatFullCurrency, formatDate, getRelativeTime } from '@/utils/helpers';
import ProgressBar from '@/components/ProgressBar';

export default function DebtsScreen() {
  const { debts, getTotalDebtOutstanding } = useMoney();

  const totalPrincipal = useMemo(() => 
    debts.reduce((sum, d) => sum + d.principalAmount, 0), [debts]);
  
  const totalPaid = totalPrincipal - getTotalDebtOutstanding;
  const payoffProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

  const monthlyEMI = useMemo(() => 
    debts.reduce((sum, d) => sum + (d.emiAmount || 0), 0), [debts]);

  const getDebtColor = (type: string) => {
    const colors: Record<string, string> = {
      loan: Colors.chart.blue,
      credit_card: Colors.chart.red,
      mortgage: Colors.chart.purple,
      personal: Colors.chart.orange,
    };
    return colors[type] || Colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debts & Loans' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <TrendingDown size={24} color={Colors.expense} />
            <Text style={styles.summaryTitle}>Total Outstanding</Text>
          </View>
          <Text style={styles.outstandingValue}>{formatFullCurrency(getTotalDebtOutstanding)}</Text>
          
          <View style={styles.progressSection}>
            <ProgressBar 
              progress={payoffProgress} 
              height={8} 
              progressColor={Colors.income}
            />
            <Text style={styles.progressText}>
              {payoffProgress.toFixed(0)}% paid off • {formatCurrency(totalPaid)} of {formatCurrency(totalPrincipal)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly EMI</Text>
              <Text style={styles.summaryValue}>{formatCurrency(monthlyEMI)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active Debts</Text>
              <Text style={styles.summaryValue}>{debts.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Debts</Text>
          <View style={styles.debtList}>
            {debts.map(debt => {
              const paid = debt.principalAmount - debt.outstandingAmount;
              const progress = debt.principalAmount > 0 
                ? (paid / debt.principalAmount) * 100 
                : 0;
              const color = getDebtColor(debt.type);
              
              return (
                <View key={debt.id} style={styles.debtCard}>
                  <View style={styles.debtHeader}>
                    <View style={[styles.debtIcon, { backgroundColor: color + '20' }]}>
                      <CreditCard size={20} color={color} />
                    </View>
                    <View style={styles.debtInfo}>
                      <Text style={styles.debtName}>{debt.name}</Text>
                      <Text style={styles.debtType}>
                        {debt.type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.debtValues}>
                      <Text style={styles.outstandingText}>{formatCurrency(debt.outstandingAmount)}</Text>
                      <Text style={styles.remainingText}>remaining</Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <ProgressBar progress={progress} height={6} progressColor={color} />
                    <Text style={styles.progressLabel}>
                      {progress.toFixed(0)}% paid
                    </Text>
                  </View>
                  
                  <View style={styles.debtDetails}>
                    {debt.emiAmount && (
                      <View style={styles.detailItem}>
                        <Calendar size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>
                          EMI: {formatCurrency(debt.emiAmount)} on day {debt.emiDay}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailItem}>
                      <Percent size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>
                        Interest: {debt.interestRate}% p.a.
                      </Text>
                    </View>
                    {debt.endDate && (
                      <View style={styles.detailItem}>
                        <TrendingDown size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>
                          Ends: {getRelativeTime(debt.endDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {debts.length === 0 && (
          <View style={styles.emptyState}>
            <CreditCard size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No debts tracked</Text>
            <Text style={styles.emptySubtitle}>Add your loans and credit cards to track payoff progress</Text>
          </View>
        )}

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
  outstandingValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.expense,
    marginBottom: 16,
  },
  progressSection: {
    gap: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  debtList: {
    gap: 12,
  },
  debtCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  debtIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtInfo: {
    flex: 1,
  },
  debtName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  debtType: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  debtValues: {
    alignItems: 'flex-end',
  },
  outstandingText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.expense,
  },
  remainingText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  progressContainer: {
    marginTop: 14,
    gap: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  debtDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    height: 40,
  },
});