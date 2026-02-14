import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  gradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = false,
  gradient = false,
  gradientColors = ['#4CFCAD', '#4CD0FC'] as const,
}) => {
  if (gradient) {
    const content = (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.gradientCard, elevated && styles.elevated, style]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {content}
        </TouchableOpacity>
      );
    }

    return content;
  }

  const cardStyle = [
    styles.card,
    elevated && styles.elevated,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  gradientCard: {
    borderWidth: 0,
  },
  elevated: {
    shadowColor: '#4CFCAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
