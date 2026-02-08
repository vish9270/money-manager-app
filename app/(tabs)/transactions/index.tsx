import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Filter, Plus, X, Calendar, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { Transaction, TransactionType } from '@/types';
import { formatShortDate } from '@/utils/helpers';
import TransactionItem from '@/components/TransactionItem';
import MonthSelector from '@/components/MonthSelector';
import DatePicker from '@/components/DatePicker';

type FilterType = 'all' | TransactionType;

export default function TransactionsScreen() {
  const router = useRouter();
  const { 
    transactions, selectedMonth, setSelectedMonth,
    getCategoryById, getAccountById, deleteTransaction,
    dateFilter, setDateFilter
  } = useMoney();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [useCustomRange, setUseCustomRange] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (useCustomRange && dateFilter.startDate && dateFilter.endDate) {
          const txnDate = new Date(t.date);
          const start = new Date(dateFilter.startDate);
          const end = new Date(dateFilter.endDate);
          if (txnDate < start || txnDate > end) return false;
        } else {
          const txnMonth = t.date.slice(0, 7);
          if (txnMonth !== selectedMonth) return false;
        }
        
        if (filterType !== 'all' && t.type !== filterType) return false;
        
        if (searchQuery) {
          const category = getCategoryById(t.categoryId);
          const searchLower = searchQuery.toLowerCase();
          const matchesNotes = t.notes?.toLowerCase().includes(searchLower);
          const matchesCategory = category?.name.toLowerCase().includes(searchLower);
          const matchesAmount = t.amount.toString().includes(searchQuery);
          if (!matchesNotes && !matchesCategory && !matchesAmount) return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth, filterType, searchQuery, getCategoryById, useCustomRange, dateFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: { date: string; transactions: Transaction[] }[] = [];
    let currentDate = '';
    
    filteredTransactions.forEach(txn => {
      const txnDate = txn.date.slice(0, 10);
      if (txnDate !== currentDate) {
        currentDate = txnDate;
        groups.push({ date: txnDate, transactions: [txn] });
      } else {
        groups[groups.length - 1].transactions.push(txn);
      }
    });
    
    return groups;
  }, [filteredTransactions]);

  const handleEditTransaction = useCallback((txn: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/add-transaction?id=${txn.id}`);
  }, [router]);

  const handleDeleteTransaction = useCallback((txn: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This will reverse the account balance changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteTransaction(txn.id)
        }
      ]
    );
  }, [deleteTransaction]);

  const handleTransactionPress = useCallback((txn: Transaction) => {
    Alert.alert(
      'Transaction Options',
      'What would you like to do?',
      [
        { text: 'Edit', onPress: () => handleEditTransaction(txn) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTransaction(txn) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [handleEditTransaction, handleDeleteTransaction]);

  const applyDateRange = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      setDateFilter({
        startDate: tempStartDate.toISOString().slice(0, 10),
        endDate: tempEndDate.toISOString().slice(0, 10),
      });
      setUseCustomRange(true);
    }
    setShowDateRangeModal(false);
  }, [tempStartDate, tempEndDate, setDateFilter]);

  const clearDateRange = useCallback(() => {
    setDateFilter({});
    setUseCustomRange(false);
    setTempStartDate(null);
    setTempEndDate(null);
  }, [setDateFilter]);

  const setQuickRange = useCallback((months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setDateFilter({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
    setUseCustomRange(true);
  }, [setDateFilter]);

  const renderTransaction = useCallback(({ item }: { item: Transaction }) => (
    <TransactionItem
      transaction={item}
      category={getCategoryById(item.categoryId)}
      fromAccount={item.fromAccountId ? getAccountById(item.fromAccountId) : undefined}
      toAccount={item.toAccountId ? getAccountById(item.toAccountId) : undefined}
      onPress={() => handleTransactionPress(item)}
    />
  ), [getCategoryById, getAccountById, handleTransactionPress]);

  const renderGroup = useCallback(({ item }: { item: { date: string; transactions: Transaction[] } }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{formatShortDate(item.date)}</Text>
      <View style={styles.transactionsList}>
        {item.transactions.map(txn => (
          <View key={txn.id}>
            {renderTransaction({ item: txn })}
          </View>
        ))}
      </View>
    </View>
  ), [renderTransaction]);

  const filterButtons: { type: FilterType; label: string; color: string }[] = [
    { type: 'all', label: 'All', color: Colors.primary },
    { type: 'expense', label: 'Expense', color: Colors.expense },
    { type: 'income', label: 'Income', color: Colors.income },
    { type: 'transfer', label: 'Transfer', color: Colors.transfer },
  ];

  return (
    <View style={styles.container}>
      {!useCustomRange ? (
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      ) : (
        <View style={styles.dateRangeBanner}>
          <Text style={styles.dateRangeText}>
            {dateFilter.startDate} → {dateFilter.endDate}
          </Text>
          <TouchableOpacity onPress={clearDateRange}>
            <X size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? Colors.textInverse : Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, useCustomRange && styles.filterButtonActive]}
          onPress={() => setShowDateRangeModal(true)}
        >
          <Calendar size={18} color={useCustomRange ? Colors.textInverse : Colors.primary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterRow}>
          {filterButtons.map(btn => (
            <TouchableOpacity
              key={btn.type}
              style={[
                styles.filterChip,
                filterType === btn.type && { backgroundColor: btn.color }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterType(btn.type);
              }}
            >
              <Text style={[
                styles.filterChipText,
                filterType === btn.type && styles.filterChipTextActive
              ]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={groupedTransactions}
        renderItem={renderGroup}
        keyExtractor={item => item.date}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Add your first transaction to get started'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/add-transaction');
        }}
      >
        <Plus size={24} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showDateRangeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateRangeModal(false)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickFilters}>
              <TouchableOpacity style={styles.quickFilterButton} onPress={() => { setQuickRange(3); setShowDateRangeModal(false); }}>
                <Text style={styles.quickFilterText}>Last 3 Months</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickFilterButton} onPress={() => { setQuickRange(6); setShowDateRangeModal(false); }}>
                <Text style={styles.quickFilterText}>Last 6 Months</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickFilterButton} onPress={() => { setQuickRange(12); setShowDateRangeModal(false); }}>
                <Text style={styles.quickFilterText}>Last Year</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.orText}>— OR —</Text>

            <View style={styles.datePickerSection}>
              <DatePicker
                date={tempStartDate || new Date()}
                onDateChange={setTempStartDate}
                label="From Date"
              />
            </View>

            <View style={styles.datePickerSection}>
              <DatePicker
                date={tempEndDate || new Date()}
                onDateChange={setTempEndDate}
                label="To Date"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={() => { clearDateRange(); setShowDateRangeModal(false); }}>
                <Text style={styles.clearButtonText}>Clear Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyDateRange}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dateRangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: Colors.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  transactionsList: {
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  orText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
    marginVertical: 16,
  },
  datePickerSection: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
