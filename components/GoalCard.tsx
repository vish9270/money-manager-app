import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { 
  Shield, Car, Plane, Home, GraduationCap, Gift, Target, Sparkles
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Goal } from '@/types';
import { formatCurrency, calculateProgress, getRelativeTime } from '@/utils/helpers';
import ProgressBar from './ProgressBar';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Shield, Car, Plane, Home, GraduationCap, Gift, Target, Sparkles,
};

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  compact?: boolean;
}

export default function GoalCard({ goal, onPress, compact = false }: GoalCardProps) {
  const IconComponent = iconMap[goal.icon] || Target;
  const progress = calculateProgress(goal.savedAmount, goal.targetAmount);
  
  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.compactIcon, { backgroundColor: goal.color + '20' }]}>
          <IconComponent size={16} color={goal.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>{goal.name}</Text>
          <ProgressBar progress={progress} height={4} progressColor={goal.color} />
        </View>
        <Text style={[styles.compactProgress, { color: goal.color }]}>{progress}%</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: goal.color + '20' }]}>
          <IconComponent size={22} color={goal.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{goal.name}</Text>
          <Text style={styles.deadline}>{getRelativeTime(goal.targetDate)}</Text>
        </View>
        <View style={[styles.progressBadge, { backgroundColor: goal.color + '20' }]}>
          <Text style={[styles.progressText, { color: goal.color }]}>{progress}%</Text>
        </View>
      </View>
      <ProgressBar progress={progress} height={8} progressColor={goal.color} />
      <View style={styles.amountRow}>
        <Text style={styles.savedAmount}>{formatCurrency(goal.savedAmount)}</Text>
        <Text style={styles.targetAmount}>of {formatCurrency(goal.targetAmount)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  deadline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  savedAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  targetAmount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    gap: 10,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  compactProgress: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
});
