import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SkeletonLoaderProps {
  style?: ViewStyle;
  height?: number;
  width?: number | string;
  borderRadius?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  style,
  height = 20,
  width = '100%',
  borderRadius = 8,
  className = ""
}) => {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          height,
          width: width as any,
          borderRadius,
          backgroundColor: colors.border,
          opacity: pulseAnim,
        },
        style,
      ]}
      className={className}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View 
      style={{ backgroundColor: colors.card, borderColor: colors.border }} 
      className="p-5 rounded-2xl border mb-4 shadow-sm"
    >
      <View className="flex-row items-center mb-4">
        <SkeletonLoader height={40} width={40} borderRadius={20} className="mr-3" />
        <View className="flex-1">
          <SkeletonLoader height={14} width="60%" className="mb-2" />
          <SkeletonLoader height={10} width="40%" />
        </View>
      </View>
      <SkeletonLoader height={12} width="90%" className="mb-2" />
      <SkeletonLoader height={12} width="80%" />
    </View>
  );
};
export default SkeletonLoader;
