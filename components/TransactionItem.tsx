import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Transaction, Category, Account } from '@/types';
import { formatFullCurrency, formatShortDate } from '@/utils/helpers';

const iconMap: Record<string, string> = {
  ShoppingCart: 'cart-outline',
  Utensils: 'restaurant-outline',
  Car: 'car-outline',
  Fuel: 'flame-outline',
  Zap: 'flash-outline',
  Home: 'home-outline',
  CreditCard: 'card-outline',
  Shield: 'shield-outline',
  Heart: 'heart-outline',
  GraduationCap: 'school-outline',
  Film: 'film-outline',
  ShoppingBag: 'bag-outline',
  User: 'person-outline',
  Plane: 'airplane-outline',
  Repeat: 'repeat-outline',
  PiggyBank: 'wallet-outline',
  BarChart3: 'bar-chart-outline',
  Landmark: 'business-outline',
  FileText: 'document-text-outline',
  Gift: 'gift-outline',
  HeartHandshake: 'heart-outline',
  MoreHorizontal: 'ellipsis-horizontal-outline',
  Briefcase: 'briefcase-outline',
  Laptop: 'laptop-outline',
  TrendingUp: 'trending-up-outline',
  RotateCcw: 'refresh-outline',
  Plus: 'add-outline',
  ArrowLeftRight: 'swap-horizontal-outline',
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
  onPress,
}: TransactionItemProps) {
  const iconName =
    category?.icon && iconMap[category.icon]
      ? iconMap[category.icon]
      : iconMap.MoreHorizontal;

  const getTypeColor = () => {
    switch (transaction.type) {
      case 'income':
        return Colors.income;
      case 'expense':
        return Colors.expense;
      case 'transfer':
        return Colors.transfer;
      default:
        return Colors.textMuted;
    }
  };

  const getTypeIcon = () => {
    switch (transaction.type) {
      case 'income':
        return <Ionicons name="arrow-down-outline" size={14} color={Colors.income} />;
      case 'expense':
        return <Ionicons name="arrow-up-outline" size={14} color={Colors.expense} />;
      case 'transfer':
        return <Ionicons name="swap-horizontal-outline" size={14} color={Colors.transfer} />;
      default:
        return null;
    }
  };

  const getAmountPrefix = () => {
    switch (transaction.type) {
      case 'income':
        return '+';
      case 'expense':
        return '-';
      default:
        return '';
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
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: (category?.color || Colors.textMuted) + '20' },
        ]}
      >
        <Ionicons
          name={iconName as any}
          size={20}
          color={category?.color || Colors.textMuted}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {category?.name || 'Unknown'}
          </Text>
          <Text style={[styles.amount, { color: getTypeColor() }]}>
            {getAmountPrefix()}
            {formatFullCurrency(transaction.amount)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.detailsLeft}>
            {getTypeIcon()}
            <Text style={styles.accountText} numberOfLines={1}>
              {getAccountText()}
            </Text>
          </View>
          <Text style={styles.date}>{formatShortDate(transaction.date)}</Text>
        </View>

        {transaction.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            {transaction.notes}
          </Text>
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