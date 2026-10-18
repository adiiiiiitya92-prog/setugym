import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS } from '../../constants/strings';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = STRINGS.placeholders.search
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
      className="flex-row items-center px-4 py-3 rounded-2xl border mb-4 shadow-sm"
    >
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={{
          color: colors.text,
          flex: 1,
          fontSize: 14,
          marginLeft: 10,
          paddingVertical: 0
        }}
      />
      
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} className="p-1">
          <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
export default SearchBar;
