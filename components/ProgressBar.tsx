import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';

interface ProgressBarProps {
  progress: number;
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  showOverspend?: boolean;
}

export default function ProgressBar({ 
  progress, 
  height = 8, 
  backgroundColor = Colors.surfaceAlt,
  progressColor,
  showOverspend = false,
}: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  const clampedProgress = Math.min(progress, 100);
  const isOverspent = progress > 100;
  
  const getColor = () => {
    if (progressColor) return progressColor;
    if (isOverspent && showOverspend) return Colors.expense;
    if (progress >= 80) return Colors.warning;
    return Colors.accent;
  };

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress]);

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <Animated.View 
        style={[
          styles.progress, 
          { 
            backgroundColor: getColor(),
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
});
