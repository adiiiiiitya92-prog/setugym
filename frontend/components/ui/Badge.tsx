import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

interface BadgeProps {
  status: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ status, style }) => {
  const clean = status.toLowerCase().trim();

  let bg = '#E5E7EB';
  let text = '#4B5563';

  if (clean === 'active' || clean === 'paid' || clean === 'present' || clean === 'checked_in') {
    bg = 'rgba(0, 200, 150, 0.12)';
    text = '#00C896';
  } else if (clean === 'trial' || clean === 'checked_out') {
    bg = 'rgba(108, 71, 255, 0.12)';
    text = '#6C47FF';
  } else if (clean === 'expired' || clean === 'overdue' || clean === 'absent') {
    bg = 'rgba(255, 107, 53, 0.12)';
    text = '#FF6B35';
  } else if (clean === 'suspended' || clean === 'failed') {
    bg = 'rgba(239, 68, 68, 0.12)';
    text = '#EF4444';
  } else if (clean === 'pending') {
    bg = 'rgba(245, 158, 11, 0.12)';
    text = '#F59E0B';
  } else if (clean === 'inactive') {
    bg = 'rgba(156, 163, 175, 0.12)';
    text = '#6B7280';
  }

  return (
    <View
      style={[{ backgroundColor: bg }, style]}
      className="px-2.5 py-1 rounded-full items-center justify-center self-start"
    >
      <Text style={{ color: text }} className="text-[10px] font-bold uppercase tracking-wider">
        {status}
      </Text>
    </View>
  );
};
export default Badge;
