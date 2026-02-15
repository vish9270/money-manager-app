import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Filter, Plus, X, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { Transaction, TransactionType } from '@/types';
import { formatShortDate } from '@/utils/helpers';
import TransactionItem from '@/components/TransactionItem';
import MonthSelector from '@/components/MonthSelector';
import DatePicker from '@/components/DatePicker';

type FilterType = 'all' | TransactionType;

type ListRow =
  | { rowType: 'header'; id: string; date: string }
  | { rowType: 'transaction'; id: string; txn: Transaction };

function getEndOfDayISO(dateStr: string) {
  // dateStr is YYYY-MM-DD
  const d = new Date(dateStr + 'T23:59:59.999Z');
  return d.toISOString();
}

function getStartOfDayISO(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return d.toISOString();
}

export default function TransactionsScreen() {
  const router = useRouter();

  const {
    transactions,
    selectedMonth,
    setSelectedMonth,
    getCategoryById,
    getAccountById,
    deleteTransaction,
    dateFilter,
    setDateFilter,
  } = useMoney();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [useCustomRange, setUseCustomRange] = useState(false);

  const filteredTransactions = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();

    const startISO =
      useCustomRange && dateFilter.startDate ? getStartOfDayISO(dateFilter.startDate) : null;

    const endISO =
      useCustomRange && dateFilter.endDate ? getEndOfDayISO(dateFilter.endDate) : null;

    return transactions
      .filter(t => {
        // Month vs custom range
        if (useCustomRange && startISO && endISO) {
          if (t.date < startISO || t.date > endISO) return false;
        } else {
          const txnMonth = t.date.slice(0, 7);
          if (txnMonth !== selectedMonth) return false;
        }

        // Type filter
        if (filterType !== 'all' && t.type !== filterType) return false;

        // Search
        if (searchLower) {
          const category = getCategoryById(t.categoryId);
          const matchesNotes = t.notes?.toLowerCase().includes(searchLower);
          const matchesCategory = category?.name?.toLowerCase().includes(searchLower);
          const matchesAmount = t.amount.toString().includes(searchQuery.trim());

          if (!matchesNotes && !matchesCategory && !matchesAmount) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // ISO string compare is enough, but keeping it safe
        if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
        return b.date.localeCompare(a.date);
      });
  }, [
    transactions,
    selectedMonth,
    filterType,
    searchQuery,
    getCategoryById,
    useCustomRange,
    dateFilter,
  ]);

  /**
   * IMPORTANT:
   * Instead of nested FlatList / map, we flatten the grouped list into:
   * Header row + transaction rows.
   * This keeps virtualization fast.
   */
  const flatRows: ListRow[] = useMemo(() => {
    const rows: ListRow[] = [];
    let currentDate = '';

    for (const txn of filteredTransactions) {
      const txnDate = txn.date.slice(0, 10);

      if (txnDate !== currentDate) {
        currentDate = txnDate;
        rows.push({
          rowType: 'header',
          id: `header_${txnDate}`,
          date: txnDate,
        });
      }

      rows.push({
        rowType: 'transaction',
        id: txn.id,
        txn,
      });
    }

    return rows;
  }, [filteredTransactions]);

  const handleEditTransaction = useCallback(
    (txn: Transaction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/add-transaction?id=${txn.id}`);
    },
    [router]
  );

  const handleDeleteTransaction = useCallback(
    (txn: Transaction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        'Delete Transaction',
        'Are you sure you want to delete this transaction? This will reverse the account balance changes.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteTransaction(txn.id),
          },
        ]
      );
    },
    [deleteTransaction]
  );

  const handleTransactionPress = useCallback(
    (txn: Transaction) => {
      Alert.alert('Transaction Options', 'What would you like to do?', [
        { text: 'Edit', onPress: () => handleEditTransaction(txn) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTransaction(txn) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [handleEditTransaction, handleDeleteTransaction]
  );

  const applyDateRange = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      const start = tempStartDate.toISOString().slice(0, 10);
      const end = tempEndDate.toISOString().slice(0, 10);

      if (start > end) {
        Alert.alert('Invalid Range', 'Start date must be before end date.');
        return;
      }

      setDateFilter({ startDate: start, endDate: end });
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

  const setQuickRange = useCallback(
    (months: number) => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - months);

      setDateFilter({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
      setUseCustomRange(true);
    },
    [setDateFilter]
  );

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.rowType === 'header') {
        return (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeader}>{formatShortDate(item.date)}</Text>
          </View>
        );
      }

      const txn = item.txn;

      return (
        <View style={styles.txnRow}>
          <TransactionItem
            transaction={txn}
            category={getCategoryById(txn.categoryId)}
            fromAccount={txn.fromAccountId ? getAccountById(txn.fromAccountId) : undefined}
            toAccount={txn.toAccountId ? getAccountById(txn.toAccountId) : undefined}
            onPress={() => handleTransactionPress(txn)}
          />
        </View>
      );
    },
    [getCategoryById, getAccountById, handleTransactionPress]
  );

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
                filterType === btn.type && { backgroundColor: btn.color },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterType(btn.type);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === btn.type && styles.filterChipTextActive,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={flatRows}
        renderItem={renderRow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        initialNumToRender={12}
        windowSize={10}
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
              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => {
                  setQuickRange(3);
                  setShowDateRangeModal(false);
                }}
              >
                <Text style={styles.quickFilterText}>Last 3 Months</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => {
                  setQuickRange(6);
                  setShowDateRangeModal(false);
                }}
              >
                <Text style={styles.quickFilterText}>Last 6 Months</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => {
                  setQuickRange(12);
                  setShowDateRangeModal(false);
                }}
              >
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
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  clearDateRange();
                  setShowDateRangeModal(false);
                }}
              >
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

  dateHeaderContainer: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginLeft: 4,
  },

  txnRow: {
    marginBottom: 8,
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