import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from './Card';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string; // override default accent color
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#6C47FF',
  subtitle,
  className = ""
}) => {
  const { colors } = useTheme();

  return (
    <Card className={`flex-1 min-w-[45%] ${className}`}>
      <View className="flex-row justify-between items-start mb-3">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold tracking-wide">
          {title}
        </Text>
        <View 
          style={{ backgroundColor: `${color}1A` }} 
          className="p-2 rounded-xl"
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>
      </View>
      
      <Text style={{ color: colors.text }} className="text-2xl font-black">
        {value}
      </Text>
      
      {subtitle ? (
        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-medium mt-1">
          {subtitle}
        </Text>
      ) : null}
    </Card>
  );
};
export default StatCard;
