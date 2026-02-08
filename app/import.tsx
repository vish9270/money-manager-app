import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function ImportScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Import CSV' }} />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FileSpreadsheet size={64} color={Colors.accent} />
        </View>
        
        <Text style={styles.title}>Import Bank Statements</Text>
        <Text style={styles.subtitle}>
          Import transactions from CSV files exported from your bank or credit card
        </Text>

        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Export CSV from bank</Text>
              <Text style={styles.stepDesc}>Download transaction history from your bank's website</Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Map columns</Text>
              <Text style={styles.stepDesc}>Match CSV columns to date, amount, and description</Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Auto-categorize</Text>
              <Text style={styles.stepDesc}>Rules will automatically assign categories</Text>
            </View>
          </View>
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
          <Text style={styles.comingSoonDesc}>CSV import feature is under development</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  steps: {
    width: '100%',
    marginTop: 32,
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  comingSoon: {
    marginTop: 32,
    padding: 20,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  comingSoonDesc: {
    fontSize: 13,
    color: Colors.warning,
    marginTop: 4,
  },
});
