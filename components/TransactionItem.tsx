import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { 
  ShoppingCart, Utensils, Car, Fuel, Zap, Home, CreditCard, Shield, Heart,
  GraduationCap, Film, ShoppingBag, User, Plane, Repeat, PiggyBank, BarChart3,
  Landmark, FileText, Gift, HeartHandshake, MoreHorizontal, Briefcase, Laptop,
  TrendingUp, RotateCcw, Plus, ArrowLeftRight, ArrowDownLeft, ArrowUpRight
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Transaction, Category, Account } from '@/types';
import { formatFullCurrency, formatShortDate } from '@/utils/helpers';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  ShoppingCart, Utensils, Car, Fuel, Zap, Home, CreditCard, Shield, Heart,
  GraduationCap, Film, ShoppingBag, User, Plane, Repeat, PiggyBank, BarChart3,
  Landmark, FileText, Gift, HeartHandshake, MoreHorizontal, Briefcase, Laptop,
  TrendingUp, RotateCcw, Plus, ArrowLeftRight,
};

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  fromAccount?: Account;
  toAccount?: Account;
  onPress?: () => void;
}

export default function TransactionItem({ 
  transaction, 
  category, 
  fromAccount,
  toAccount,
  onPress 
}: TransactionItemProps) {
  const IconComponent = category?.icon ? iconMap[category.icon] : MoreHorizontal;
  
  const getTypeColor = () => {
    switch (transaction.type) {
      case 'income': return Colors.income;
      case 'expense': return Colors.expense;
      case 'transfer': return Colors.transfer;
    }
  };

  const getTypeIcon = () => {
    switch (transaction.type) {
      case 'income': return <ArrowDownLeft size={14} color={Colors.income} />;
      case 'expense': return <ArrowUpRight size={14} color={Colors.expense} />;
      case 'transfer': return <ArrowLeftRight size={14} color={Colors.transfer} />;
    }
  };

  const getAmountPrefix = () => {
    switch (transaction.type) {
      case 'income': return '+';
      case 'expense': return '-';
      case 'transfer': return '';
    }
  };

  const getAccountText = () => {
    if (transaction.type === 'transfer' && fromAccount && toAccount) {
      return `${fromAccount.name} → ${toAccount.name}`;
    }
    if (transaction.type === 'expense' && fromAccount) {
      return fromAccount.name;
    }
    if (transaction.type === 'income' && toAccount) {
      return toAccount.name;
    }
    return '';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: (category?.color || Colors.textMuted) + '20' }]}>
        {IconComponent && <IconComponent size={20} color={category?.color || Colors.textMuted} />}
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {category?.name || 'Unknown'}
          </Text>
          <Text style={[styles.amount, { color: getTypeColor() }]}>
            {getAmountPrefix()}{formatFullCurrency(transaction.amount)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.detailsLeft}>
            {getTypeIcon()}
            <Text style={styles.accountText} numberOfLines={1}>{getAccountText()}</Text>
          </View>
          <Text style={styles.date}>{formatShortDate(transaction.date)}</Text>
        </View>
        {transaction.notes && (
          <Text style={styles.notes} numberOfLines={1}>{transaction.notes}</Text>
        )}
      </View>
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
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
  detailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  accountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  notes: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
