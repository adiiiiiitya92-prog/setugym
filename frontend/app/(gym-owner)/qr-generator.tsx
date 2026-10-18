import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { encodeGymQRPayload } from '../../utils/attendanceHelper';
import * as Sharing from 'expo-sharing';

// Safe UUID generation function to avoid React Native polyfill issues
const generateSimpleUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function QRGeneratorScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { gyms } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const resolvedActiveGymId = activeGymId === 'gym-fitzone-1' ? '8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f' : activeGymId;
  const activeGym = gyms.find(g => g.id === activeGymId || g.id === resolvedActiveGymId) || gyms[0];

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [token, setToken] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes count-down in seconds
  const viewShotRef = useRef<any>(null);

  // Initialize and rotate QR payload
  const rotateQR = () => {
    setToken(generateSimpleUUID());
    setGeneratedAt(new Date().toISOString());
    setTimeRemaining(600);
  };

  // Fetch coordinates on mount
  useEffect(() => {
    async function getGPSLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn("Location permission denied! Using fallback coordinates.");
          setLocation({
            coords: {
              latitude: 19.0760,
              longitude: 72.8777,
              altitude: null,
              accuracy: 10,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now()
          });
          setLoadingLocation(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        setLocation(currentLocation);
      } catch (error) {
        console.error("Error getting location:", error);
        setLocation({
          coords: {
            latitude: 19.0760,
            longitude: 72.8777,
            altitude: null,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now()
        });
      } finally {
        setLoadingLocation(false);
      }
    }

    getGPSLocation();
    rotateQR();
  }, []);

  // Timer countdown
  useEffect(() => {
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
  }, []);

  // Format countdown string mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Construct QR Payload
  const qrDataString = useMemo(() => {
    if (!activeGym || !location) return '';
    return encodeGymQRPayload({
      gymId: activeGym.id,
      gymName: activeGym.name,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      generatedAt: generatedAt || new Date().toISOString(),
      token: token
    });
  }, [activeGym, location, token, generatedAt]);

  // Save QR card to photo library or share
  const handleSaveQR = async () => {
    try {
      const localUri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0
      });

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
      console.error(e);
      toast.error("Failed to capture and save QR image.");
    }
  };

  // Share QR image natively
  const handleShareQR = async () => {
    try {
      const localUri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/png',
          dialogTitle: `${activeGym?.name || 'Gym'} Attendance QR`,
          UTI: 'public.png'
        });
      } else {
        toast.error("Sharing is not available on this device.");
      }
    } catch (e) {
      toast.error("Sharing canceled or unsupported.");
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
          FRONT DESK SETUP
        </Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight text-center mt-1">
          Attendance QR Code
        </Text>
      </View>

      {loadingLocation ? (
        <Card className="w-full py-16 items-center">
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-4">
            Determining GPS Location...
          </Text>
        </Card>
      ) : !location ? (
        <Card className="w-full p-6 items-center">
          <Ionicons name="warning" size={48} color="#FF6B35" />
          <Text style={{ color: colors.text }} className="text-base font-bold mt-3">GPS Location Required</Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 mb-5">
            Allow location permissions or enable location services to acquire coordinates for the attendance boundary.
          </Text>
          <Button 
            title="Retry Connection" 
            onPress={async () => {
              setLoadingLocation(true);
              try {
                const locationPromise = Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced
                });
                const timeoutPromise = new Promise<null>((_, reject) =>
                  setTimeout(() => reject(new Error("Location request timed out")), 5000)
                );
                const loc = await Promise.race([locationPromise, timeoutPromise]);
                if (loc) {
                  setLocation(loc);
                } else {
                  throw new Error("Location returned null");
                }
                rotateQR();
              } catch (err) {
                console.warn("GPS retry failed, using fallback:", err);
                setLocation({
                  coords: {
                    latitude: 28.6139,
                    longitude: 77.2090,
                    altitude: null,
                    accuracy: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                  },
                  timestamp: Date.now(),
                } as any);
                rotateQR();
                toast.info("Using fallback coordinates.");
              } finally {
                setLoadingLocation(false);
              }
            }} 
            className="rounded-xl px-6" 
          />
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
              Scan to Check-In / Out
            </Text>
          </ViewShot>

          {/* Security details and countdown timer */}
          <Card className="w-full p-4 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={16} color="#00C896" />
                <Text style={{ color: colors.text }} className="text-xs font-bold ml-1.5">Rotating Security Token</Text>
              </View>
              <View className="bg-primary/10 px-2.5 py-0.5 rounded-lg">
                <Text className="text-primary text-[10px] font-extrabold">{formatTimer(timeRemaining)}</Text>
              </View>
            </View>

            <View className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
              <View className="flex-row justify-between">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Boundary Latitude</Text>
                <Text style={{ color: colors.text }} className="text-[10px] font-bold">{location.coords.latitude.toFixed(6)}</Text>
              </View>
              <View className="flex-row justify-between mt-1.5">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Boundary Longitude</Text>
                <Text style={{ color: colors.text }} className="text-[10px] font-bold">{location.coords.longitude.toFixed(6)}</Text>
              </View>
              <View className="flex-row justify-between mt-1.5">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Active Gym ID</Text>
                <Text style={{ color: colors.text }} className="text-[10px] font-bold text-right" numberOfLines={1}>{activeGymId}</Text>
              </View>
            </View>
          </Card>

          {/* Action buttons */}
          <View className="w-full space-y-3 gap-3">
            <Button 
              title="Regenerate Token Now" 
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
    </ScrollView>
  );
}
