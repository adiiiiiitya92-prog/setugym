import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { STRINGS } from '../../constants/strings';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  emoji?: string;
  actionTitle?: string;
  onActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = STRINGS.placeholders.noData,
  subtitle = STRINGS.placeholders.noDataSub,
  emoji = "🏋️‍♂️",
  actionTitle,
  onActionPress
}) => {
  const { colors } = useTheme();

  return (
    <View className="items-center justify-center p-8 py-12">
      <Text className="text-5xl mb-4">{emoji}</Text>
      
      <Text style={{ color: colors.text }} className="text-lg font-bold text-center mb-1">
        {title}
      </Text>
      
      <Text style={{ color: colors.textSecondary }} className="text-xs text-center mb-6 max-w-[240px] font-medium leading-4">
        {subtitle}
      </Text>
      
      {actionTitle && onActionPress ? (
        <Button 
          title={actionTitle} 
          onPress={onActionPress} 
          style={{ paddingVertical: 10 }}
          className="rounded-xl px-5"
        />
      ) : null}
    </View>
  );
};
export default EmptyState;
