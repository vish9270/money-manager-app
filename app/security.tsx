import React from 'react';
import { View, StyleSheet, Text, Switch, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

export default function SecurityScreen() {
  const [pinEnabled, setPinEnabled] = React.useState(false);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [hideBalances, setHideBalances] = React.useState(false);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Security' }} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Lock</Text>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.chart.blue} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>PIN Lock</Text>
              <Text style={styles.settingDesc}>Require PIN to open app</Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={setPinEnabled}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={pinEnabled ? Colors.accent : Colors.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="finger-print-outline" size={20} color={Colors.chart.purple} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Biometric Lock</Text>
              <Text style={styles.settingDesc}>Use fingerprint or Face ID</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={biometricEnabled ? Colors.accent : Colors.textMuted}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="eye-outline" size={20} color={Colors.chart.green} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Hide Balances</Text>
              <Text style={styles.settingDesc}>Mask account balances on home screen</Text>
            </View>
            <Switch
              value={hideBalances}
              onValueChange={setHideBalances}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={hideBalances ? Colors.accent : Colors.textMuted}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="key-outline" size={20} color={Colors.chart.orange} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Export Data</Text>
              <Text style={styles.settingDesc}>Backup your data to a file</Text>
            </View>
          </TouchableOpacity>
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
  settingsList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
