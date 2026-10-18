import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SubscriptionPlan, MemberPlan } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currencyHelper';

interface PlanCardProps {
  plan: SubscriptionPlan | MemberPlan;
  onSelect?: () => void;
  selected?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onSelect,
  selected = false,
  onEdit,
  onDelete
}) => {
  const { colors } = useTheme();

  // Helper checks
  const isSubPlan = "maxMembers" in plan;
  const isPopular = "isPopular" in plan ? plan.isPopular : (plan as SubscriptionPlan).isHighlighted;
  const planColor = "colorTag" in plan ? plan.colorTag : '#6C47FF';

  return (
    <Card 
      style={{
        borderColor: selected ? planColor : isPopular ? planColor : colors.border,
        borderWidth: selected || isPopular ? 2 : 1
      }}
      className="mb-4 relative overflow-hidden"
    >
      {/* Popular highlighted ribbon banner */}
      {isPopular ? (
        <View 
          style={{ backgroundColor: planColor }} 
          className="absolute right-[-32px] top-[14px] rotate-45 px-8 py-1 items-center justify-center z-10"
        >
          <Text className="text-white text-[8px] font-black uppercase tracking-widest">
            Best
          </Text>
        </View>
      ) : null}

      {/* Plan Header */}
      <View className="mb-4">
        <Text style={{ color: colors.text }} className="text-xl font-black">
          {plan.name}
        </Text>
        
        <View className="flex-row items-baseline mt-2">
          <Text style={{ color: planColor }} className="text-3xl font-black">
            {isSubPlan ? formatCurrency(plan.price, 'INR') : formatCurrency(plan.price, (plan as MemberPlan).currency)}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold ml-1">
            /{plan.durationDays === 30 ? "month" : plan.durationDays === 365 ? "year" : `${plan.durationDays} days`}
          </Text>
        </View>
      </View>

      {/* Subscription metrics capacity logs */}
      {isSubPlan && (
        <View className="mb-4 flex-row gap-3">
          <View className="bg-primary/5 px-2.5 py-1.5 rounded-lg flex-row items-center">
            <Ionicons name="people-outline" size={13} color="#6C47FF" className="mr-1" />
            <Text style={{ color: colors.text }} className="text-[10px] font-bold">
              Max Members: {(plan as SubscriptionPlan).maxMembers}
            </Text>
          </View>
          <View className="bg-secondary/5 px-2.5 py-1.5 rounded-lg flex-row items-center">
            <Ionicons name="barbell-outline" size={13} color="#00C896" className="mr-1" />
            <Text style={{ color: colors.text }} className="text-[10px] font-bold">
              Max Trainers: {(plan as SubscriptionPlan).maxTrainers}
            </Text>
          </View>
        </View>
      )}

      {/* Bullet features logs list */}
      <View className="space-y-2.5 mb-5">
        {plan.features.map((feat, idx) => (
          <View key={idx} className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color={planColor} className="mr-2" />
            <Text style={{ color: colors.text }} className="text-xs font-medium flex-1">
              {feat}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View className="flex-row gap-2 justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-4">
        {onSelect ? (
          <Button
            title={selected ? "Active Choice" : "Select Tier"}
            onPress={onSelect}
            variant={selected ? 'primary' : 'outline'}
            className="flex-1 rounded-xl py-3"
            style={selected ? { backgroundColor: planColor } : { borderColor: planColor }}
            textStyle={!selected ? { color: planColor } : undefined}
          />
        ) : (
          <View className="flex-row gap-2 w-full justify-end">
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                style={{ backgroundColor: colors.border }}
                className="flex-row items-center px-3.5 py-2.5 rounded-xl active:opacity-90"
              >
                <Ionicons name="create-outline" size={14} color={colors.text} className="mr-1.5" />
                <Text style={{ color: colors.text }} className="text-xs font-bold">Edit</Text>
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                className="flex-row items-center bg-accent/10 px-3.5 py-2.5 rounded-xl active:opacity-90"
              >
                <Ionicons name="trash-outline" size={14} color="#FF6B35" className="mr-1.5" />
                <Text className="text-accent font-bold text-xs">Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Card>
  );
};
export default PlanCard;
