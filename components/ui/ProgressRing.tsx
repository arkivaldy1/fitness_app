import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../../constants/theme';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  value?: string;
  unit?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color = theme.colors.primary,
  backgroundColor = theme.colors.surface,
  label,
  value,
  unit,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        {value !== undefined && (
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value}</Text>
            {unit && <Text style={styles.unit}>{unit}</Text>}
          </View>
        )}
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
};

// Simpler linear progress bar
interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color = theme.colors.primary,
  backgroundColor = theme.colors.surface,
  showLabel = false,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.barContainer}>
      <View style={[styles.barBackground, { height, backgroundColor }]}>
        <View
          style={[
            styles.barFill,
            {
              height,
              backgroundColor: color,
              width: `${clampedProgress}%`,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.barLabel}>{Math.round(clampedProgress)}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  labelContainer: {
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  unit: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 2,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // Progress bar styles
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 4,
  },
  barLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    minWidth: 35,
    textAlign: 'right',
  },
});
