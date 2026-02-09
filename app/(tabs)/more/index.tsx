import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMoney } from '@/providers/MoneyProvider';
import { formatCurrency } from '@/utils/helpers';

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
}

function MenuItem({ icon, title, subtitle, value, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { goals, recurring, investments, debts, getTotalInvestmentValue, getTotalDebtOutstanding } = useMoney();

  const activeGoals = goals.filter(g => g.status === 'active').length;
  const activeRecurring = recurring.filter(r => r.isActive).length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Tools</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon={<Ionicons name="flag-outline" size={20} color={Colors.chart.purple} />}
            title="Goals"
            subtitle={`${activeGoals} active goals`}
            onPress={() => router.push('/goals')}
          />
          <MenuItem
            icon={<Ionicons name="repeat-outline" size={20} color={Colors.chart.blue} />}
            title="Recurring"
            subtitle={`${activeRecurring} active items`}
            onPress={() => router.push('/recurring')}
          />
          <MenuItem
            icon={<Ionicons name="wallet-outline" size={20} color={Colors.chart.green} />}
            title="Investments"
            subtitle={`${investments.length} investments`}
            value={formatCurrency(getTotalInvestmentValue)}
            onPress={() => router.push('/investments')}
          />
          <MenuItem
            icon={<Ionicons name="card-outline" size={20} color={Colors.chart.red} />}
            title="Debts & Loans"
            subtitle={`${debts.length} active debts`}
            value={formatCurrency(getTotalDebtOutstanding)}
            onPress={() => router.push('/debts')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Reports</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon={<Ionicons name="document-text-outline" size={20} color={Colors.chart.teal} />}
            title="Reports"
            subtitle="Monthly & yearly reports"
            onPress={() => router.push('/reports')}
          />
          <MenuItem
            icon={<Ionicons name="download-outline" size={20} color={Colors.chart.orange} />}
            title="Import CSV"
            subtitle="Import bank statements"
            onPress={() => router.push('/import')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon={<Ionicons name="notifications-outline" size={20} color={Colors.chart.yellow} />}
            title="Notifications"
            subtitle="Alerts & reminders"
            onPress={() => router.push('/notifications')}
          />
          <MenuItem
            icon={<Ionicons name="shield-checkmark-outline" size={20} color={Colors.chart.pink} />}
            title="Security"
            subtitle="PIN & biometrics"
            onPress={() => router.push('/security')}
          />
          <MenuItem
            icon={<Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />}
            title="Settings"
            subtitle="Categories, accounts"
            onPress={() => router.push('/settings')}
          />
          <MenuItem
            icon={<Ionicons name="help-circle-outline" size={20} color={Colors.chart.blue} />}
            title="Help & Support"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
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
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginRight: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
