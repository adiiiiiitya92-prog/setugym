import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, ViewStyle, TouchableOpacity, Platform, Modal } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  isDatePicker?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  style,
  onFocus,
  onBlur,
  isDatePicker,
  ...props
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const inputBorderColor = error 
    ? colors.accent 
    : focused 
    ? '#6C47FF' 
    : colors.border;

  const handlePress = () => {
    if (isDatePicker) {
      setShowPicker(true);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate && props.onChangeText) {
      const formatted = format(selectedDate, 'yyyy-MM-dd');
      props.onChangeText(formatted);
    }
  };

  const renderPicker = () => {
    if (!showPicker) return null;

    let currentDate = new Date();
    if (props.value) {
      try {
        const parsed = parseISO(props.value);
        if (!isNaN(parsed.getTime())) {
          currentDate = parsed;
        }
      } catch (e) {
        // Fallback to today
      }
    }

    if (Platform.OS === 'ios') {
      return (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View 
              style={{ backgroundColor: colors.card }} 
              className="p-6 rounded-t-[32px] border-t border-gray-150 dark:border-gray-800 pb-10"
            >
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                <Text style={{ color: colors.text }} className="text-base font-black">Select Date</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={{ color: '#6C47FF' }} className="text-sm font-bold">Done</Text>
                </TouchableOpacity>
              </View>
              <View className="items-center justify-center py-4 bg-transparent">
                <DateTimePicker
                  value={currentDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  textColor={colors.text}
                />
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    if (Platform.OS === 'web') {
      return null;
    }

    // Android
    return (
      <DateTimePicker
        value={currentDate}
        mode="date"
        display="default"
        onChange={onDateChange}
      />
    );
  };

  const inputElement = (
    <View
      style={{
        backgroundColor: colors.background,
        borderColor: inputBorderColor,
        borderWidth: 1,
      }}
      className="flex-row items-center px-4 py-3 rounded-xl"
    >
      {icon ? (
        <Ionicons 
          name={icon} 
          size={18} 
          color={focused ? '#6C47FF' : colors.textSecondary} 
          className="mr-2"
        />
      ) : null}
      
      <TextInput
        style={[
          {
            color: colors.text,
            flex: 1,
            fontSize: 14,
            paddingVertical: 0,
          },
          style
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (onBlur) onBlur(e);
        }}
        editable={isDatePicker ? false : props.editable}
        {...props}
        {...(Platform.OS === 'web' && isDatePicker ? { type: 'date' } : {} as any)}
      />
    </View>
  );

  return (
    <View style={containerStyle} className="mb-4 w-full">
      {label ? (
        <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">
          {label}
        </Text>
      ) : null}
      
      {isDatePicker && Platform.OS !== 'web' ? (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          <View pointerEvents="none">
            {inputElement}
          </View>
        </TouchableOpacity>
      ) : (
        inputElement
      )}
      
      {isDatePicker && Platform.OS !== 'web' && renderPicker()}
      
      {error ? (
        <Text style={{ color: colors.accent }} className="text-[10px] font-medium mt-1 pl-1">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default Input;
