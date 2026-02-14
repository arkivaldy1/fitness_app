import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style,
          ]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

// Numeric input optimized for weight/reps
interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  containerStyle?: ViewStyle;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  unit,
  containerStyle,
}) => {
  const increment = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleTextChange = (text: string) => {
    const numValue = parseFloat(text) || 0;
    if (numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  };

  return (
    <View style={[styles.numericContainer, containerStyle]}>
      {label && <Text style={styles.numericLabel}>{label}</Text>}
      <View style={styles.numericInputRow}>
        <TouchableOpacity style={styles.numericButton} onPress={decrement}>
          <Text style={styles.numericButtonText}>-</Text>
        </TouchableOpacity>
        <View style={styles.numericValueContainer}>
          <TextInput
            style={styles.numericInput}
            value={String(value)}
            onChangeText={handleTextChange}
            keyboardType="numeric"
            selectTextOnFocus
          />
          {unit && <Text style={styles.numericUnit}>{unit}</Text>}
        </View>
        <TouchableOpacity style={styles.numericButton} onPress={increment}>
          <Text style={styles.numericButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputFocused: {
    borderColor: theme.colors.borderFocus,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  iconLeft: {
    paddingLeft: 12,
  },
  iconRight: {
    paddingRight: 12,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },

  // Numeric input styles
  numericContainer: {
    alignItems: 'center',
  },
  numericLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  numericInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numericButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  numericButtonText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  numericValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 80,
  },
  numericInput: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
    minWidth: 50,
  },
  numericUnit: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: 4,
  },
});
