import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  className = ""
}) => {
  const { colors } = useTheme();

  // Compute background and border styles
  let bgStyle: ViewStyle = { backgroundColor: '#6C47FF' };
  let titleColor = '#FFFFFF';

  if (variant === 'secondary') {
    bgStyle = { backgroundColor: '#00C896' };
  } else if (variant === 'accent') {
    bgStyle = { backgroundColor: '#FF6B35' };
  } else if (variant === 'outline') {
    bgStyle = { backgroundColor: 'transparent', borderColor: '#6C47FF', borderWidth: 2 };
    titleColor = '#6C47FF';
  } else if (variant === 'text') {
    bgStyle = { backgroundColor: 'transparent' };
    titleColor = '#6C47FF';
  }

  if (disabled) {
    bgStyle = { backgroundColor: colors.border };
    titleColor = colors.textSecondary;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[bgStyle, style]}
      className={`py-3.5 px-6 rounded-xl flex-row items-center justify-center shadow-sm active:opacity-90 ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={titleColor} size="small" className="mr-2" />
      ) : null}
      <Text
        style={[{ color: titleColor, fontSize: 15, fontWeight: 'bold' }, textStyle]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
export default Button;
