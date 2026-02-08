import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  label?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

export default function DatePicker({
  date,
  onDateChange,
  label,
  maximumDate,
  minimumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(date);

  const formatDate = (d: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return d.toLocaleDateString('en-IN', options);
  };

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
        if (event.type === 'set' && selectedDate) {
          onDateChange(selectedDate);
        }
      } else {
        if (selectedDate) {
          setTempDate(selectedDate);
        }
      }
    },
    [onDateChange]
  );

  const handleConfirm = useCallback(() => {
    onDateChange(tempDate);
    setShowPicker(false);
  }, [tempDate, onDateChange]);

  const handleCancel = useCallback(() => {
    setTempDate(date);
    setShowPicker(false);
  }, [date]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setTempDate(today);
    if (Platform.OS === 'android') {
      onDateChange(today);
    }
  }, [onDateChange]);

  const adjustDay = useCallback((days: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(newDate.getDate() + days);
    
    if (maximumDate && newDate > maximumDate) return;
    if (minimumDate && newDate < minimumDate) return;
    
    setTempDate(newDate);
    if (Platform.OS === 'android') {
      onDateChange(newDate);
    }
  }, [tempDate, maximumDate, minimumDate, onDateChange]);

  if (Platform.OS === 'web') {
    return (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.selector}>
          <Calendar size={18} color={Colors.textSecondary} />
          <input
            type="date"
            value={date.toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = new Date(e.target.value + 'T00:00:00');
              if (!isNaN(newDate.getTime())) {
                onDateChange(newDate);
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 16,
              color: Colors.text,
              outline: 'none',
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Calendar size={18} color={Colors.textSecondary} />
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.overlay} onPress={handleCancel}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goToToday}>
                  <Text style={styles.todayText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.confirmText}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickNav}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => adjustDay(-1)}
                >
                  <ChevronLeft size={20} color={Colors.accent} />
                  <Text style={styles.navText}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => adjustDay(1)}
                >
                  <Text style={styles.navText}>Next</Text>
                  <ChevronRight size={20} color={Colors.accent} />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                style={styles.picker}
              />
            </View>
          </Pressable>
        </Modal>
      )}
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: Colors.text,
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  todayText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  picker: {
    height: 200,
  },
});
