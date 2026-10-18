import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  onPress, 
  style, 
  className = "", 
  noPadding = false 
}) => {
  const { colors } = useTheme();

  const baseStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
  };

  const content = (
    <View
      style={[baseStyle, style]}
      className={`border rounded-2xl ${noPadding ? 'p-0' : 'p-5'} shadow-sm ${className}`}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
export default Card;
