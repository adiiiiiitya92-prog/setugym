import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, uri, size = 48 }) => {
  const { colors } = useTheme();

  // Extract initials
  const initials = name && typeof name === 'string'
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'GP';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="bg-gray-300"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(108, 71, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#6C47FF',
          fontSize: size * 0.38,
          fontWeight: 'bold',
        }}
      >
        {initials}
      </Text>
    </View>
  );
};
export default Avatar;
