import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatDate } from '../utils/dateHelper';
import { Notice } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface NoticeCardProps {
  notice: Notice;
  onDelete?: () => void;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({
  notice,
  onDelete
}) => {
  const { colors } = useTheme();

  return (
    <Card className="mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Badge status={notice.priority === 'urgent' ? 'Urgent' : 'Normal'} />
          <Text style={{ color: colors.text }} className="text-base font-black mt-2">
            {notice.title}
          </Text>
        </View>
        
        {onDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            className="p-1.5 bg-accent/10 rounded-full"
          >
            <Ionicons name="trash-outline" size={14} color="#FF6B35" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 font-semibold mb-3">
        {notice.body}
      </Text>

      <View className="flex-row items-center border-t border-gray-100 dark:border-gray-800 pt-2.5">
        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} className="mr-1" />
        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold">
          Posted on {formatDate(notice.date)}
        </Text>
        
        {notice.audience && notice.audience !== 'everyone' && (
          <View className="ml-auto bg-primary/5 px-2 py-0.5 rounded-md">
            <Text style={{ color: '#6C47FF' }} className="text-[9px] font-black uppercase tracking-wider">
              {notice.audience} Only
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};
export default NoticeCard;
