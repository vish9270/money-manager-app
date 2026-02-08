import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onPress: () => void;
}

export default function QuickActionButton({ icon, label, color = Colors.primary, onPress }: QuickActionButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: color + '15' }]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
