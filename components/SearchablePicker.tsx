import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface PickerItem {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface SearchablePickerProps {
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  label?: string;
  searchPlaceholder?: string;
}

export default function SearchablePicker({
  items,
  selectedId,
  onSelect,
  placeholder = 'Select an option',
  label,
  searchPlaceholder = 'Search...',
}: SearchablePickerProps) {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId),
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setVisible(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  const handleClose = useCallback(() => {
    setVisible(false);
    setSearchQuery('');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PickerItem }) => {
      const isSelected = item.id === selectedId;
      return (
        <TouchableOpacity
          style={[styles.item, isSelected && styles.itemSelected]}
          onPress={() => handleSelect(item.id)}
          activeOpacity={0.7}
        >
          {item.color && (
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          )}
          <Text
            style={[styles.itemText, isSelected && styles.itemTextSelected]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isSelected && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
        </TouchableOpacity>
      );
    },
    [selectedId, handleSelect]
  );

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        {selectedItem ? (
          <View style={styles.selectedContainer}>
            {selectedItem.color && (
              <View
                style={[styles.colorDot, { backgroundColor: selectedItem.color }]}
              />
            )}
            <Text style={styles.selectedText} numberOfLines={1}>
              {selectedItem.name}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Select an option'}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  placeholder: {
    fontSize: 16,
    color: Colors.textMuted,
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginHorizontal: 20,
    marginBottom: 12,
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
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  itemSelected: {
    backgroundColor: Colors.accentLight,
  },
  itemText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  itemTextSelected: {
    fontWeight: '500' as const,
    color: Colors.accent,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
});