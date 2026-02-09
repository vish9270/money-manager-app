import React from 'react';
import { View, StyleSheet, Text, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

export default function NotificationsScreen() {
  const [budgetAlerts, setBudgetAlerts] = React.useState(true);
  const [recurringReminders, setRecurringReminders] = React.useState(true);
  const [goalMilestones, setGoalMilestones] = React.useState(true);
  const [debtReminders, setDebtReminders] = React.useState(true);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Settings</Text>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="warning-outline" size={20} color={Colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Budget Alerts</Text>
              <Text style={styles.settingDesc}>
                Get notified when approaching budget limits
              </Text>
            </View>
            <Switch
              value={budgetAlerts}
              onValueChange={setBudgetAlerts}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={budgetAlerts ? Colors.accent : Colors.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.chart.blue}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Recurring Reminders</Text>
              <Text style={styles.settingDesc}>
                Remind before upcoming recurring payments
              </Text>
            </View>
            <Switch
              value={recurringReminders}
              onValueChange={setRecurringReminders}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={recurringReminders ? Colors.accent : Colors.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons
                name="flag-outline"
                size={20}
                color={Colors.chart.purple}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Goal Milestones</Text>
              <Text style={styles.settingDesc}>
                Celebrate when reaching goal milestones
              </Text>
            </View>
            <Switch
              value={goalMilestones}
              onValueChange={setGoalMilestones}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={goalMilestones ? Colors.accent : Colors.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons
                name="card-outline"
                size={20}
                color={Colors.chart.red}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Debt Reminders</Text>
              <Text style={styles.settingDesc}>
                EMI and credit card payment reminders
              </Text>
            </View>
            <Switch
              value={debtReminders}
              onValueChange={setDebtReminders}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={debtReminders ? Colors.accent : Colors.textMuted}
            />
          </View>
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
