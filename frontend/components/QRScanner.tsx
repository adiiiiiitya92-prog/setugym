import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/Button';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
  title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onClose,
  title = "Scan Member QR Code"
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }} className="text-sm font-semibold">Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.text }} className="text-lg font-bold text-center mb-2">Camera Access Required</Text>
        <Text style={{ color: colors.textSecondary }} className="text-xs text-center mb-6 leading-4">
          To log attendance automatically, please enable camera access permissions in your device settings.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    onScan(result.data);
    
    // Reset scanned lock after a small delay
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  return (
    <View style={StyleSheet.absoluteFill} className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* Overlay Target Framing */}
        <View className="flex-1 justify-between p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mt-8">
            <Text className="text-white text-lg font-black tracking-wide shadow-md">
              {title}
            </Text>
            {onClose ? (
              <TouchableOpacity
                onPress={onClose}
                className="bg-black/50 p-2.5 rounded-full"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Central Target Grid */}
          <View className="items-center justify-center">
            <View 
              style={{ borderColor: '#6C47FF', borderWidth: 3 }} 
              className="w-64 h-64 rounded-3xl border-dashed items-center justify-center bg-black/10"
            >
              <View className="w-60 h-60 border border-white/20 rounded-2xl" />
            </View>
            <Text className="text-white/80 text-xs font-semibold text-center mt-6 bg-black/60 px-4 py-2 rounded-full overflow-hidden">
              Align member's QR code within the frame
            </Text>
          </View>

          {/* Footer controls (flash, etc) */}
          <View className="items-center mb-6">
            {scanned ? (
              <View className="bg-secondary/90 px-5 py-2.5 rounded-xl flex-row items-center">
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" className="mr-2" />
                <Text className="text-white font-bold text-xs">QR Scanned Successfully!</Text>
              </View>
            ) : (
              <Text className="text-white/40 text-[10px] uppercase font-bold tracking-wider">
                SetuGym Camera Scanner Mode
              </Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
};
export default QRScanner;
