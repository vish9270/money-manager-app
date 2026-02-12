import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ChevronRight,
  Bell,
  Shield,
  Download,
  X,
  Plus,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import Colors from '@/constants/colors';
import { useMoney } from '@/providers/MoneyProvider';
import { Category } from '@/types';

const categoryColors = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#F472B6', '#0EA5E9', '#7C3AED'
];

export default function SettingsScreen() {
  console.log('SETTINGS SCREEN LOADED: app/settings.tsx');

  const router = useRouter();

  const {
    categories,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    checkCategoryHasTransactions,
    getCategoryById,
    getAccountById,
    resetAppData,
  } = useMoney();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'income' | 'expense' | 'both'>('expense');
  const [categoryColor, setCategoryColor] = useState(categoryColors[0]);

  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const resetCategoryForm = useCallback(() => {
    setCategoryName('');
    setCategoryType('expense');
    setCategoryColor(categoryColors[0]);
    setEditingCategory(null);
    setIsEditingCategory(false);
  }, []);

  const openEditCategoryModal = useCallback((category: Category) => {
    setEditingCategory(category);
    setIsEditingCategory(true);
    setCategoryName(category.name);
    setCategoryType(category.type);
    setCategoryColor(category.color);
    setShowCategoryModal(true);
  }, []);

  const handleSaveCategory = useCallback(() => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    const categoryData = {
      name: categoryName.trim(),
      icon: 'Tag',
      color: categoryColor,
      type: categoryType,
      isSystem: false,
    };

    try {
      if (isEditingCategory && editingCategory) {
        updateCategory({
          ...editingCategory,
          ...categoryData,
        });
      } else {
        addCategory(categoryData);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCategoryModal(false);
      resetCategoryForm();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save category');
    }
  }, [
    categoryName,
    categoryColor,
    categoryType,
    isEditingCategory,
    editingCategory,
    updateCategory,
    addCategory,
    resetCategoryForm,
  ]);

  const handleDeleteCategory = useCallback(
    (category: Category) => {
      if (category.isSystem) {
        Alert.alert('Cannot Delete', 'System categories cannot be deleted.');
        return;
      }

      const hasTransactions = checkCategoryHasTransactions(category.id);
      if (hasTransactions) {
        Alert.alert(
          'Cannot Delete',
          'This category has transactions associated with it. Please reassign those transactions first.'
        );
        return;
      }

      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete "${category.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                deleteCategory(category.id);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (e) {
                console.error(e);
                Alert.alert('Error', 'Failed to delete category');
              }
            },
          },
        ]
      );
    },
    [deleteCategory, checkCategoryHasTransactions]
  );

  const generateCSV = useCallback(() => {
    const headers = ['Date', 'Type', 'Amount', 'Category', 'From Account', 'To Account', 'Notes'];

    const rows = transactions.map(t => {
      const category = getCategoryById(t.categoryId);
      const fromAccount = t.fromAccountId ? getAccountById(t.fromAccountId) : null;
      const toAccount = t.toAccountId ? getAccountById(t.toAccountId) : null;

      return [
        t.date.slice(0, 10),
        t.type,
        String(t.amount),
        category?.name || '',
        fromAccount?.name || '',
        toAccount?.name || '',
        (t.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }, [transactions, getCategoryById, getAccountById]);

  const handleExportTransactions = useCallback(async () => {
    if (isExporting || isResetting) return;

    try {
      setIsExporting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const csvContent = generateCSV();

      // WEB
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MoneyManager_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Transactions exported successfully!');
        return;
      }

      // MOBILE
      const fileName = `MoneyManager_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const filePath = `${cacheDir}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions',
        });
      } else {
        Alert.alert('Saved', `File saved to:\n${filePath}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  }, [generateCSV, isExporting, isResetting]);

  const handleResetAppData = useCallback(() => {
    if (isResetting || isExporting) return;

    Alert.alert(
      'Reset App Data',
      'This will permanently delete:\n\n• Accounts\n• Transactions\n• Budgets\n• Goals\n• Recurring\n• Debts\n• Investments\n\nCategories will be re-created.\n\nDo you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

              await resetAppData();

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Done', 'App data has been reset successfully.');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Reset failed. Please check logs.');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  }, [resetAppData, isResetting, isExporting]);

  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const bothCategories = useMemo(() => categories.filter(c => c.type === 'both'), [categories]);

  const menuItems = useMemo(() => {
    return [
      {
        icon: <Download size={20} color={Colors.accent} />,
        label: 'Export Transactions to CSV',
        subtitle: `${transactions.length} transactions`,
        onPress: handleExportTransactions,
      },
      {
        icon: <Bell size={20} color={Colors.chart.orange} />,
        label: 'Notifications',
        subtitle: 'Alerts and reminders',
        onPress: () => router.push('/notifications'),
      },
      {
        icon: <Shield size={20} color={Colors.chart.green} />,
        label: 'Security',
        subtitle: 'PIN and biometric',
        onPress: () => router.push('/security'),
      },
      {
        icon: <Trash2 size={20} color={Colors.expense} />,
        label: 'Reset App Data',
        subtitle: 'Delete all local data (developer option)',
        onPress: handleResetAppData,
      },
    ];
  }, [transactions.length, handleExportTransactions, handleResetAppData, router]);

  const isBusy = isExporting || isResetting;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                disabled={isBusy}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>{item.icon}</View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>

                {isBusy && item.label.includes('Reset') && isResetting ? (
                  <ActivityIndicator />
                ) : null}

                <ChevronRight size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {isResetting ? (
            <Text style={styles.warningText}>
              Resetting data... please wait.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetCategoryForm();
                setShowCategoryModal(true);
              }}
              disabled={isBusy}
            >
              <Plus size={18} color={Colors.accent} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {expenseCategories.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={styles.categoryGroupTitle}>Expense Categories</Text>
              <View style={styles.categoryList}>
                {expenseCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    onPress={() => openEditCategoryModal(cat)}
                    onLongPress={() => handleDeleteCategory(cat)}
                    disabled={isBusy}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    {cat.isSystem && <Text style={styles.systemBadge}>System</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {incomeCategories.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={styles.categoryGroupTitle}>Income Categories</Text>
              <View style={styles.categoryList}>
                {incomeCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    onPress={() => openEditCategoryModal(cat)}
                    onLongPress={() => handleDeleteCategory(cat)}
                    disabled={isBusy}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    {cat.isSystem && <Text style={styles.systemBadge}>System</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {bothCategories.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={styles.categoryGroupTitle}>Transfer Categories</Text>
              <View style={styles.categoryList}>
                {bothCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    onPress={() => openEditCategoryModal(cat)}
                    onLongPress={() => handleDeleteCategory(cat)}
                    disabled={isBusy}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    {cat.isSystem && <Text style={styles.systemBadge}>System</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.hintText}>Tap to edit, long press to delete</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditingCategory ? 'Edit Category' : 'Add Category'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
              >
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Groceries"
              placeholderTextColor={Colors.textMuted}
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeButtons}>
              {(['expense', 'income', 'both'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    categoryType === t && styles.typeButtonActive,
                  ]}
                  onPress={() => setCategoryType(t)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      categoryType === t && styles.typeButtonTextActive,
                    ]}
                  >
                    {t === 'both' ? 'Transfer' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {categoryColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorChip,
                    { backgroundColor: color },
                    categoryColor === color && styles.colorChipSelected,
                  ]}
                  onPress={() => setCategoryColor(color)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isBusy && { opacity: 0.6 }]}
              onPress={handleSaveCategory}
              disabled={isBusy}
            >
              <Text style={styles.submitButtonText}>
                {isEditingCategory ? 'Save Changes' : 'Add Category'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  section: { marginTop: 24, paddingHorizontal: 16 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },

  warningText: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 14, fontWeight: '500' as const, color: Colors.accent },

  menuList: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  menuContent: { flex: 1 },

  menuLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.text },
  menuSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  categorySection: { marginBottom: 16 },

  categoryGroupTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    marginBottom: 8,
  },

  categoryList: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden' },

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },

  categoryDot: { width: 12, height: 12, borderRadius: 6 },

  categoryName: { flex: 1, fontSize: 15, color: Colors.text },

  systemBadge: {
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },

  bottomPadding: { height: 40 },

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
    marginBottom: 24,
  },

  modalTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },

  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },

  typeButtons: { flexDirection: 'row', gap: 8 },

  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },

  typeButtonActive: { backgroundColor: Colors.accent },

  typeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },

  typeButtonTextActive: { color: Colors.textInverse },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  colorChip: { width: 36, height: 36, borderRadius: 18 },

  colorChipSelected: { borderWidth: 3, borderColor: Colors.text },

  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});