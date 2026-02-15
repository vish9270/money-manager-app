import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  Building2,
  PiggyBank,
  Banknote,
  CreditCard,
  Landmark,
  Wallet,
  TrendingUp,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import { Account } from '@/types';
import { formatFullCurrency } from '@/utils/helpers';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Building2,
  PiggyBank,
  Banknote,
  CreditCard,
  Landmark,
  Wallet,
  TrendingUp,
};

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

// ---------------------------
// CREDIT CARD HELPERS
// ---------------------------
function getOutstandingFromBalance(balance: number) {
  // Outstanding exists only if balance is negative
  return Math.abs(Math.min(balance, 0));
}

function getAvailableCredit(limit: number, balance: number) {
  return Math.max(0, limit - getOutstandingFromBalance(balance));
}

export default function AccountCard({ account, onPress }: AccountCardProps) {
  const IconComponent = iconMap[account.icon] || Wallet;

  const isCreditCard = account.type === 'credit_card';

  // For UI display:
  // - Credit cards show Outstanding (positive number)
  // - Other accounts show Balance (normal)
  const displayBalance = isCreditCard ? getOutstandingFromBalance(account.balance) : account.balance;

  const balanceLabel = isCreditCard ? 'Outstanding' : 'Balance';

  const creditLimit = account.creditLimit ?? 0;

  const availableCredit = useMemo(() => {
    if (!isCreditCard) return 0;
    if (creditLimit <= 0) return 0;
    return getAvailableCredit(creditLimit, account.balance);
  }, [isCreditCard, creditLimit, account.balance]);

  // If outstanding > 0, show in expense color
  const showNegativeStyle = isCreditCard && getOutstandingFromBalance(account.balance) > 0;

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: account.color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: account.color + '20' }]}>
          <IconComponent size={20} color={account.color} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.name}>{account.name}</Text>
          <Text style={styles.type}>{account.type.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>{balanceLabel}</Text>
        <Text style={[styles.balance, showNegativeStyle && styles.negativeBalance]}>
          {formatFullCurrency(displayBalance)}
        </Text>
      </View>

      {isCreditCard && creditLimit > 0 && (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>Limit: {formatFullCurrency(creditLimit)}</Text>

          <Text style={[styles.availableText, availableCredit <= 0 && styles.availableDanger]}>
            Available: {formatFullCurrency(availableCredit)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  type: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balance: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  negativeBalance: {
    color: Colors.expense,
  },
  limitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  limitText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  availableText: {
    fontSize: 12,
    color: Colors.income,
    fontWeight: '500' as const,
  },
  availableDanger: {
    color: Colors.expense,
  },
});