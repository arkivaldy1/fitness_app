import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const sizeStyle = styles[`size_${size}` as keyof typeof styles];
  const textSizeStyle = styles[`text_${size}` as keyof typeof styles];

  // Gradient button variant
  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={['#4CFCAD', '#4CD0FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            styles.gradient,
            sizeStyle,
            (disabled || loading) && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, styles.text_gradient, textSizeStyle, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const buttonStyles = [
    styles.base,
    styles[variant as keyof typeof styles],
    sizeStyle,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}` as keyof typeof styles],
    textSizeStyle,
    (disabled || loading) && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#000'}
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 8,
  },

  // Variants
  primary: {
    backgroundColor: '#4CFCAD',
  },
  secondary: {
    backgroundColor: '#f0fdf9',
    borderWidth: 1,
    borderColor: '#4CFCAD',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CFCAD',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  gradient: {
    // Style applied in LinearGradient
  },

  // Sizes
  size_sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  size_md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  size_lg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  text_primary: {
    color: '#000',
  },
  text_secondary: {
    color: '#059669',
  },
  text_outline: {
    color: '#059669',
  },
  text_ghost: {
    color: '#059669',
  },
  text_danger: {
    color: '#fff',
  },
  text_gradient: {
    color: '#000',
  },

  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },

  textDisabled: {
    opacity: 0.7,
  },
});
