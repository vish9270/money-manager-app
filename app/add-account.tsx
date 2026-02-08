import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Building2, PiggyBank, Banknote, CreditCard, Landmark, Wallet, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMoney } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';
import { AccountType } from '@/types';

const accountTypeOptions: { type: AccountType; label: string; icon: string }[] = [
  { type: 'savings', label: 'Savings', icon: 'Building2' },
  { type: 'checking', label: 'Checking', icon: 'Building2' },
  { type: 'cash', label: 'Cash', icon: 'Banknote' },
  { type: 'wallet', label: 'Wallet', icon: 'Wallet' },
  { type: 'credit_card', label: 'Credit Card', icon: 'CreditCard' },
  { type: 'investment', label: 'Investment', icon: 'PiggyBank' },
  { type: 'loan', label: 'Loan', icon: 'Landmark' },
];

const iconComponents: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Building2, PiggyBank, Banknote, CreditCard, Landmark, Wallet,
};

const colorOptions = [
  Colors.chart.blue,
  Colors.chart.green,
  Colors.chart.purple,
  Colors.chart.orange,
  Colors.chart.red,
  Colors.chart.pink,
  Colors.chart.teal,
  Colors.chart.yellow,
];

export default function AddAccountScreen() {
  const router = useRouter();
  const { addAccount } = useMoney();
  
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('savings');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState(Colors.chart.blue);

  const selectedTypeInfo = accountTypeOptions.find(t => t.type === type);
  const isCreditOrLoan = type === 'credit_card' || type === 'loan';

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    const balanceNum = parseFloat(balance) || 0;
    const creditLimitNum = parseFloat(creditLimit) || 0;

    addAccount({
      name: name.trim(),
      type,
      balance: isCreditOrLoan ? -Math.abs(balanceNum) : balanceNum,
      creditLimit: type === 'credit_card' ? creditLimitNum : undefined,
      icon: selectedTypeInfo?.icon || 'Wallet',
      color: selectedColor,
      isActive: true,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Add Account',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit}>
              <Check size={24} color={Colors.accent} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Type</Text>
          <View style={styles.typeGrid}>
            {accountTypeOptions.map(opt => {
              const IconComp = iconComponents[opt.icon];
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.typeOption,
                    type === opt.type && { backgroundColor: selectedColor + '20', borderColor: selectedColor }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setType(opt.type);
                  }}
                >
                  {IconComp && <IconComp size={24} color={type === opt.type ? selectedColor : Colors.textSecondary} />}
                  <Text style={[
                    styles.typeOptionText,
                    type === opt.type && { color: selectedColor }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., HDFC Savings"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isCreditOrLoan ? 'Outstanding Balance (₹)' : 'Current Balance (₹)'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
          />
          {isCreditOrLoan && (
            <Text style={styles.helperText}>
              Enter the amount you currently owe
            </Text>
          )}
        </View>

        {type === 'credit_card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Limit (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="200000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color</Text>
          <View style={styles.colorGrid}>
            {colorOptions.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Account</Text>
        </TouchableOpacity>

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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  bottomPadding: {
    height: 40,
  },
});
