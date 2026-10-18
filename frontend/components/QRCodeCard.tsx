import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { encodeQRCodePayload } from '../utils/qrHelper';
import { formatDate } from '../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../hooks/useToast';

interface QRCodeCardProps {
  memberId: string;
  memberName: string;
  gymId: string;
  expiryDate: string;
  onSelfCheckIn?: () => void;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  memberId,
  memberName,
  gymId,
  expiryDate,
  onSelfCheckIn
}) => {
  const { colors } = useTheme();
  const toast = useToast();
  
  // Format json payload as string
  const qrString = encodeQRCodePayload(memberId, gymId);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `SetuGym Access QR for ${memberName} (ID: ${memberId}). Expiry Date: ${formatDate(expiryDate)}`,
      });
    } catch (e) {
      toast.error("Failed to share access card.");
    }
  };

  return (
    <Card className="items-center p-6">
      <View className="items-center mb-5">
        <Text style={{ color: colors.text }} className="text-xl font-black mb-1 text-center">
          {memberName}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold text-center uppercase tracking-wider">
          MEMBER ID: {memberId}
        </Text>
      </View>

      {/* QR Code Container */}
      <View 
        style={{ backgroundColor: '#FFFFFF' }} 
        className="p-5 rounded-3xl mb-5 border border-gray-100 shadow-lg items-center justify-center"
      >
        <QRCode
          value={qrString}
          size={180}
          color="#0F0F1A"
          backgroundColor="#FFFFFF"
        />
      </View>

      <View className="flex-row items-center justify-center mb-6">
        <Ionicons name="calendar-outline" size={16} color="#6C47FF" className="mr-1.5" />
        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">
          Membership Expiry: <Text className="font-bold text-primary">{formatDate(expiryDate)}</Text>
        </Text>
      </View>

      <Text style={{ color: colors.textSecondary }} className="text-[11px] text-center max-w-[240px] font-medium leading-4 mb-6">
        Show this QR code to your trainer or scan it at the reception check-in kiosk to register your attendance.
      </Text>

      <View className="flex-row w-full gap-3 justify-center">
        <TouchableOpacity
          onPress={handleShare}
          style={{ borderColor: '#6C47FF', borderWidth: 1.5 }}
          className="flex-row items-center px-4 py-2.5 rounded-xl active:opacity-90"
        >
          <Ionicons name="share-social-outline" size={18} color="#6C47FF" className="mr-2" />
          <Text className="text-primary font-bold text-xs">Share QR</Text>
        </TouchableOpacity>

        {onSelfCheckIn && (
          <TouchableOpacity
            onPress={onSelfCheckIn}
            className="flex-row items-center bg-primary px-4 py-2.5 rounded-xl active:opacity-90 shadow-md shadow-primary/20"
          >
            <Ionicons name="location-outline" size={18} color="#FFFFFF" className="mr-2" />
            <Text className="text-white font-bold text-xs">Self Check-In</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};
export default QRCodeCard;
