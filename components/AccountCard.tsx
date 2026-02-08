import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { 
  Building2, PiggyBank, Banknote, CreditCard, Landmark, Wallet, TrendingUp
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Account } from '@/types';
import { formatFullCurrency } from '@/utils/helpers';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Building2, PiggyBank, Banknote, CreditCard, Landmark, Wallet, TrendingUp,
};

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

export default function AccountCard({ account, onPress }: AccountCardProps) {
  const IconComponent = iconMap[account.icon] || Wallet;
  const isCreditCard = account.type === 'credit_card';
  const displayBalance = isCreditCard ? Math.abs(account.balance) : account.balance;
  const balanceLabel = isCreditCard ? 'Outstanding' : 'Balance';
  
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
        <Text style={[
          styles.balance, 
          isCreditCard && account.balance < 0 && styles.negativeBalance
        ]}>
          {isCreditCard && account.balance < 0 ? '-' : ''}{formatFullCurrency(displayBalance)}
        </Text>
      </View>
      {isCreditCard && account.creditLimit && (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>
            Limit: {formatFullCurrency(account.creditLimit)}
          </Text>
          <Text style={styles.availableText}>
            Available: {formatFullCurrency(account.creditLimit + account.balance)}
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
});
