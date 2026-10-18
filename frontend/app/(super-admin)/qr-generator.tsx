import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, ActivityIndicator, Modal } from 'react-native';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { encodeGymQRPayload } from '../../utils/attendanceHelper';
import * as Sharing from 'expo-sharing';

const generateSimpleUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function SuperAdminQRGeneratorScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { gyms } = gymContext;

  const [selectedGymId, setSelectedGymId] = useState(gyms[0]?.id || '');
  const [gymSelectorVisible, setGymSelectorVisible] = useState(false);
  const activeGym = useMemo(() => gyms.find(g => g.id === selectedGymId), [gyms, selectedGymId]);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [token, setToken] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(600);
  const viewShotRef = useRef<any>(null);

  const rotateQR = () => {
    setToken(generateSimpleUUID());
    setGeneratedAt(new Date().toISOString());
    setTimeRemaining(600);
  };

  useEffect(() => {
    async function getGPSLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          toast.error("Location permissions required to lock coordinates.");
          setLoadingLocation(false);
          return;
        }

        const currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(currentLoc);
        rotateQR();
      } catch (err) {
        console.error(err);
        toast.error("Could not obtain GPS location.");
      } finally {
        setLoadingLocation(false);
      }
    }

    getGPSLocation();
  }, []);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          rotateQR();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [token]);

  const qrDataString = useMemo(() => {
    if (!activeGym || !location) return '';
    return encodeGymQRPayload({
      gymId: activeGym.id,
      gymName: activeGym.name,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      generatedAt: generatedAt,
      token: token
    });
  }, [activeGym, location, token, generatedAt]);

  const handleSaveQR = async () => {
    try {
      const localUri = await captureRef(viewShotRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/png',
          dialogTitle: `Save ${activeGym?.name || 'Gym'} Attendance QR`,
          UTI: 'public.png'
        });
        toast.success("QR code ready to save or share!");
      } else {
        toast.error("Sharing/Saving is not supported on this device.");
      }
    } catch (e) {
      toast.error("Save to library failed.");
    }
  };

  const handleShareQR = async () => {
    try {
      const localUri = await captureRef(viewShotRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/png',
          dialogTitle: `${activeGym?.name} QR`,
          UTI: 'public.png'
        });
      } else {
        toast.error("Sharing is not available on this device.");
      }
    } catch (e) {
      toast.error("Sharing canceled.");
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView 
      style={{ backgroundColor: colors.background }} 
      contentContainerStyle={{ padding: 20, alignItems: 'center' }}
    >
      <View className="w-full mb-6 mt-2">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest text-center">
          SUPER ADMIN PANEL
        </Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight text-center mt-1">
          Branch QR Generator
        </Text>
      </View>

      {/* Gym Selector Button */}
      <Text style={{ color: colors.textSecondary }} className="text-xs font-bold self-start mb-2 uppercase tracking-wide">Select Target Gym Branch</Text>
      <TouchableOpacity
        onPress={() => setGymSelectorVisible(true)}
        className="w-full p-4 border rounded-xl flex-row justify-between items-center mb-6 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10"
      >
        <Text style={{ color: colors.text }} className="text-sm font-extrabold">
          {activeGym?.name || "Choose Gym..."}
        </Text>
        <Ionicons name="chevron-down-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {loadingLocation ? (
        <Card className="w-full py-16 items-center">
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-4">
            Locking GPS Coordinates...
          </Text>
        </Card>
      ) : !location ? (
        <Card className="w-full p-6 items-center">
          <Ionicons name="warning" size={48} color="#FF6B35" />
          <Text style={{ color: colors.text }} className="text-base font-bold mt-3">GPS Coordinate Lock Needed</Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 mb-5">
            Provide location permissions to configure the active check-in coordinates.
          </Text>
        </Card>
      ) : (
        <View className="w-full items-center">
          {/* Capturable QR Code Frame */}
          <ViewShot 
            ref={viewShotRef} 
            options={{ format: 'png', quality: 1.0 }} 
            style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: 32, 
              padding: 24, 
              alignItems: 'center', 
              width: 280,
              elevation: 4,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              marginBottom: 20
            }}
          >
            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#F3F4F6' }}>
              {qrDataString ? (
                <QRCode 
                  value={qrDataString} 
                  size={210} 
                  backgroundColor="#FFFFFF" 
                  color="#0F0F1A" 
                />
              ) : null}
            </View>
            <Text style={{ color: '#0F0F1A' }} className="text-lg font-black text-center mt-4">
              {activeGym?.name || "FITNESS CENTER"}
            </Text>
            <Text style={{ color: '#6B7280' }} className="text-[10px] font-semibold text-center mt-1 uppercase tracking-widest">
              Check-In / Out QR
            </Text>
          </ViewShot>

          {/* Details */}
          <Card className="w-full p-4 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="time" size={16} color="#3B82F6" />
                <Text style={{ color: colors.text }} className="text-xs font-bold ml-1.5">Auto-regeneration Timer</Text>
              </View>
              <View className="bg-primary/10 px-2.5 py-0.5 rounded-lg">
                <Text className="text-primary text-[10px] font-extrabold">{formatTimer(timeRemaining)}</Text>
              </View>
            </View>

            <View className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
              <View className="flex-row justify-between">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Lat Coordinate</Text>
                <Text style={{ color: colors.text }} className="text-[10px] font-bold">{location.coords.latitude.toFixed(6)}</Text>
              </View>
              <View className="flex-row justify-between mt-1.5">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Lng Coordinate</Text>
                <Text style={{ color: colors.text }} className="text-[10px] font-bold">{location.coords.longitude.toFixed(6)}</Text>
              </View>
            </View>
          </Card>

          {/* Action buttons */}
          <View className="w-full space-y-3 gap-3">
            <Button 
              title="Force Rotate Code" 
              onPress={rotateQR} 
              variant="outline"
              className="rounded-xl w-full"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleSaveQR}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="flex-1 py-3.5 border rounded-xl flex-row items-center justify-center active:opacity-90 shadow-sm"
              >
                <Ionicons name="download-outline" size={16} color="#6C47FF" className="mr-2" />
                <Text style={{ color: colors.text }} className="font-extrabold text-xs uppercase tracking-wide">Save Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShareQR}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="flex-1 py-3.5 border rounded-xl flex-row items-center justify-center active:opacity-90 shadow-sm"
              >
                <Ionicons name="share-social-outline" size={16} color="#6C47FF" className="mr-2" />
                <Text style={{ color: colors.text }} className="font-extrabold text-xs uppercase tracking-wide">Share QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* SELECT ACTIVE BRANCH MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={gymSelectorVisible}
        onRequestClose={() => setGymSelectorVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-lg font-black mb-4 text-center">Choose Gym Branch</Text>
            
            <ScrollView className="max-h-[300px] mb-3">
              {gyms.map((g) => {
                const isSelected = g.id === selectedGymId;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      setSelectedGymId(g.id);
                      setGymSelectorVisible(false);
                    }}
                    style={{ borderColor: isSelected ? '#6C47FF' : colors.border }}
                    className="flex-row items-center justify-between p-3.5 border rounded-xl mb-2 active:opacity-90"
                  >
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{g.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <Button title="Close Selector" variant="outline" onPress={() => setGymSelectorVisible(false)} className="rounded-xl" />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
