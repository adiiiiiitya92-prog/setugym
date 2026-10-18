import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { validateEmail, validateRequired } from '../../utils/validators';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../utils/dateHelper';
import { formatCurrency } from '../../utils/currencyHelper';

export default function GymOwnerSettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { user, switchGymBranch, addGymBranchToSession } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { gyms, owners, subscriptionPlans, planUpgradeRequests, dispatch } = gymContext;

  const currentOwner = owners.find(o => o.id === user?.id);
  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const gym = gyms.find(g => g.id === activeGymId);

  const pendingRequest = planUpgradeRequests?.find(r => r.ownerId === user?.id && r.status === 'pending');

  // New branch form states
  const [addBranchModalVisible, setAddBranchModalVisible] = useState(false);
  const [newGymName, setNewGymName] = useState('');
  const [newAddress1, setNewAddress1] = useState('');
  const [newAddress2, setNewAddress2] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGst, setNewGst] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newErrors, setNewErrors] = useState<Record<string, string>>({});

  const handleCreateBranch = async () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(newGymName)) tempErrors.newGymName = "Branch name is required.";
    if (!validateRequired(newAddress1)) tempErrors.newAddress1 = "Address is required.";
    if (!validateRequired(newCity)) tempErrors.newCity = "City is required.";
    if (!validateRequired(newPhone)) tempErrors.newPhone = "Phone is required.";
    if (!validateRequired(newEmail) || !validateEmail(newEmail)) tempErrors.newEmail = "Valid email is required.";

    if (Object.keys(tempErrors).length > 0) {
      setNewErrors(tempErrors);
      toast.error("Please fill all required fields correctly.");
      return;
    }

    const newGymId = `gym-branch-${Date.now()}`;
    const newGym = {
      id: newGymId,
      name: newGymName,
      ownerId: user?.id || 'owner-active-1',
      addressLine1: newAddress1,
      addressLine2: newAddress2 || undefined,
      city: newCity,
      state: newState || 'Delhi',
      pin: newPin || '110001',
      phone: newPhone,
      email: newEmail,
      status: 'active' as const,
      gstNumber: newGst || undefined,
      website: newWebsite || undefined,
    };

    dispatch({
      type: 'ADD_GYM_BRANCH',
      payload: newGym
    });

    await addGymBranchToSession(newGymId);
    await switchGymBranch(newGymId);

    setNewGymName('');
    setNewAddress1('');
    setNewAddress2('');
    setNewCity('');
    setNewState('');
    setNewPin('');
    setNewPhone('');
    setNewEmail('');
    setNewGst('');
    setNewWebsite('');
    setNewErrors({});
    setAddBranchModalVisible(false);

    toast.success(`New branch "${newGymName}" created and active!`);
  };

  // Form states
  const [gymName, setGymName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Feedback form states
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);

  // Set fields on gym change
  useEffect(() => {
    if (gym) {
      setGymName(gym.name);
      setAddressLine1(gym.addressLine1);
      setAddressLine2(gym.addressLine2 || '');
      setCity(gym.city);
      setStateName(gym.state);
      setPin(gym.pin);
      setPhone(gym.phone);
      setEmail(gym.email);
      setGstNumber(gym.gstNumber || '');
      setWebsite(gym.website || '');
      setLogoUrl(gym.logoUrl || '');
    }
  }, [gym]);

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogoUrl(result.assets[0].uri);
        toast.success("Logo loaded successfully!");
      }
    } catch (e) {
      toast.error("Failed to pick image from camera roll.");
    }
  };

  const handleSaveGymInfo = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(gymName)) tempErrors.gymName = "Gym brand name is required.";
    if (!validateRequired(addressLine1)) tempErrors.addressLine1 = "Primary address is required.";
    if (!validateRequired(city)) tempErrors.city = "City is required.";
    if (!validateRequired(phone)) tempErrors.phone = "Contact phone is required.";
    if (!validateRequired(email) || !validateEmail(email)) tempErrors.email = "Please input valid email.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    dispatch({
      type: 'UPDATE_GYM_INFO',
      payload: {
        gymId: activeGymId,
        name: gymName,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state: stateName,
        pin,
        phone,
        email,
        logoUrl: logoUrl || undefined,
        gstNumber: gstNumber || undefined,
        website: website || undefined
      }
    });

    toast.success("Gym details saved! Invoices will now display updated values.");
  };

  const handleChangePassword = () => {
    if (!currentPass || !newPass) {
      toast.error("Please complete both password fields.");
      return;
    }
    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    toast.success("Password changed successfully!");
    setCurrentPass('');
    setNewPass('');
  };

  const handleSubmitFeedback = () => {
    if (!validateRequired(feedbackComment)) {
      toast.error("Please enter a comment for your feedback.");
      return;
    }

    const newFeedback = {
      id: `feed-${Date.now()}`,
      gymId: activeGymId,
      gymName: gym?.name || "Active Gym",
      ownerName: currentOwner?.name || "Gym Owner",
      date: formatDate(new Date(), "yyyy-MM-dd"),
      rating: feedbackRating,
      comment: feedbackComment
    };

    dispatch({
      type: 'ADD_FEEDBACK',
      payload: newFeedback
    });

    toast.success("Thank you! Feedback shared with Super Admin.");
    setFeedbackComment('');
    setFeedbackRating(5);
  };

  const handleBuyPlan = (planId: string) => {
    if (user?.id) {
      if (pendingRequest) {
        toast.error("You already have a pending plan upgrade request.");
        return;
      }
      const plan = subscriptionPlans.find(p => p.id === planId);
      dispatch({
        type: 'CREATE_PLAN_UPGRADE_REQUEST',
        payload: {
          id: `req-${Date.now()}`,
          ownerId: user.id,
          ownerName: currentOwner?.name || "Unknown Owner",
          gymName: gym?.name || "Unknown Gym",
          currentPlanId: currentOwner?.planId,
          requestedPlanId: planId,
          requestedPlanName: plan?.name || "Unknown Plan",
          status: 'pending',
          requestDate: new Date().toISOString()
        }
      });
      toast.success(`Upgrade request to ${plan?.name || "selected tier"} submitted!`);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View className="mb-6 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          GYM OPERATING CONFIGS
        </Text>
        <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight mt-1">
          Settings
        </Text>
      </View>

      {/* Theme Toggles */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Theme Preferences</Text>
      <Card className="mb-6 p-4">
        <View className="flex-row justify-between">
          <TouchableOpacity
            onPress={() => setTheme('light')}
            style={{
              borderColor: theme === 'light' ? '#6C47FF' : colors.border,
              backgroundColor: theme === 'light' ? 'rgba(108,71,255,0.08)' : 'transparent'
            }}
            className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row"
          >
            <Ionicons name="sunny-outline" size={16} color={theme === 'light' ? '#6C47FF' : colors.textSecondary} className="mr-1.5" />
            <Text style={{ color: theme === 'light' ? '#6C47FF' : colors.text }} className="text-xs font-bold">Light</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTheme('dark')}
            style={{
              borderColor: theme === 'dark' ? '#6C47FF' : colors.border,
              backgroundColor: theme === 'dark' ? 'rgba(108,71,255,0.08)' : 'transparent'
            }}
            className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row"
          >
            <Ionicons name="moon-outline" size={16} color={theme === 'dark' ? '#6C47FF' : colors.textSecondary} className="mr-1.5" />
            <Text style={{ color: theme === 'dark' ? '#6C47FF' : colors.text }} className="text-xs font-bold">Dark</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTheme('oled')}
            style={{
              borderColor: theme === 'oled' ? '#6C47FF' : colors.border,
              backgroundColor: theme === 'oled' ? 'rgba(108,71,255,0.08)' : 'transparent'
            }}
            className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row"
          >
            <Ionicons name="phone-portrait-outline" size={16} color={theme === 'oled' ? '#6C47FF' : colors.textSecondary} className="mr-1.5" />
            <Text style={{ color: theme === 'oled' ? '#6C47FF' : colors.text }} className="text-xs font-bold">OLED</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Gym Branches Management */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Gym Branches</Text>
      <Card className="mb-6 p-4">
        {currentOwner?.gymIds?.map((gymId) => {
          const b = gyms.find(g => g.id === gymId);
          if (!b) return null;
          const isCurrent = b.id === activeGymId;
          return (
            <View 
              key={gymId} 
              style={{ borderColor: isCurrent ? '#6C47FF' : colors.border }} 
              className="flex-row items-center justify-between p-3.5 border rounded-xl mb-3"
            >
              <View className="flex-1 mr-2">
                <Text style={{ color: colors.text }} className="text-sm font-bold">{b.name}</Text>
                <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5" numberOfLines={1}>
                  {b.city}, {b.state}
                </Text>
              </View>
              {isCurrent ? (
                <View className="bg-primary/10 px-3 py-1.5 rounded-lg">
                  <Text className="text-primary font-bold text-xs">Active</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    await switchGymBranch(b.id);
                    toast.success(`Switched active branch to: ${b.name}`);
                  }}
                  className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg active:scale-95"
                >
                  <Text style={{ color: colors.text }} className="font-bold text-xs">Switch</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Button
          title="Add New Gym Branch"
          onPress={() => setAddBranchModalVisible(true)}
          className="rounded-xl mt-2"
        />
      </Card>

      {/* Gym information details */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Gym Branch Profile</Text>
      <Card className="mb-6">
        {/* Logo selector */}
        <View className="items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-5">
          <TouchableOpacity onPress={handlePickLogo} className="relative active:opacity-90">
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={{ width: 80, height: 80, borderRadius: 24 }} className="bg-gray-200 border border-gray-200" />
            ) : (
              <View style={{ backgroundColor: colors.border }} className="w-20 h-20 rounded-3xl items-center justify-center">
                <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
              </View>
            )}
            <View className="absolute bottom-[-4px] right-[-4px] bg-primary p-1.5 rounded-full border border-white">
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold mt-2 uppercase tracking-wider">Tap to upload gym logo</Text>
        </View>

        <Input
          label="Gym Branch Display Name"
          value={gymName}
          onChangeText={setGymName}
          error={errors.gymName}
          icon="business-outline"
        />

        <Input
          label="Address Line 1"
          value={addressLine1}
          onChangeText={setAddressLine1}
          error={errors.addressLine1}
          icon="map-outline"
        />

        <Input
          label="Address Line 2"
          value={addressLine2}
          onChangeText={setAddressLine2}
          icon="map-outline"
        />

        <View className="flex-row justify-between gap-3">
          <View className="flex-1">
            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              error={errors.city}
              icon="location-outline"
            />
          </View>
          <View className="flex-1">
            <Input
              label="State"
              value={stateName}
              onChangeText={setStateName}
              icon="location-outline"
            />
          </View>
        </View>

        <View className="flex-row justify-between gap-3">
          <View className="flex-1">
            <Input
              label="PIN Code"
              value={pin}
              onChangeText={setPin}
              icon="flag-outline"
            />
          </View>
          <View className="flex-1">
            <Input
              label="GST Registration Number"
              value={gstNumber}
              onChangeText={setGstNumber}
              icon="document-text-outline"
            />
          </View>
        </View>

        <Input
          label="Contact Hotline"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
          icon="call-outline"
        />

        <Input
          label="Official Email Address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />

        <Input
          label="Website URL"
          value={website}
          onChangeText={setWebsite}
          keyboardType="url"
          autoCapitalize="none"
          icon="globe-outline"
        />

        <Button
          title="Save Gym Details"
          onPress={handleSaveGymInfo}
          className="rounded-xl mt-2"
        />
      </Card>

      {/* Change Password */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Security & Passwords</Text>
      <Card className="mb-2">
        <Input
          label="Current Password"
          secureTextEntry={true}
          value={currentPass}
          onChangeText={setCurrentPass}
          icon="lock-closed-outline"
        />

        <Input
          label="New Password"
          placeholder="Min 6 characters"
          secureTextEntry={true}
          value={newPass}
          onChangeText={setNewPass}
          icon="lock-open-outline"
        />

        <Button
          title="Change Password"
          onPress={handleChangePassword}
          variant="outline"
          className="rounded-xl"
        />
      </Card>

      {/* WhatsApp Hardware & Biometric Support */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Hardware & Support</Text>
      <Card className="mb-6 p-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text style={{ color: colors.text }} className="text-sm font-bold">Biometric Setup & General Support</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs mt-1 leading-5">
              Need assistance configuring biometric access control, fingerprint readers, or general integration support? Click below to chat with our hardware team.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const text = encodeURIComponent(
                `Hi Support, I would like to request biometric device configuration support for my gym branch: "${gym?.name}" (ID: ${gym?.id}).`
              );
              Linking.openURL(`https://wa.me/919834856749?text=${text}`).catch(() => {
                toast.error("Unable to open WhatsApp.");
              });
            }}
            style={{ backgroundColor: '#25D366' }}
            className="p-3.5 rounded-2xl active:scale-95 shadow-sm items-center justify-center"
          >
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Share Feedback section */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Platform Feedback</Text>
      <Card className="mb-6 p-4">
        <Text style={{ color: colors.textSecondary }} className="text-xs mb-3 font-semibold">
          Your feedback goes directly to our platform's Super Admin to improve services.
        </Text>
        
        {/* Rating Stars Select */}
        <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Rate Your Experience</Text>
        <View className="flex-row gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setFeedbackRating(s)}
              className="p-1"
            >
              <Ionicons
                name={s <= feedbackRating ? "star" : "star-outline"}
                size={28}
                color="#FFD700"
              />
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Your Feedback / Suggestion"
          placeholder="What can we improve? Write your comments here..."
          value={feedbackComment}
          onChangeText={setFeedbackComment}
          multiline={true}
          numberOfLines={3}
          style={{ textAlignVertical: 'top' }}
          icon="chatbox-ellipses-outline"
        />

        <Button
          title="Submit Feedback"
          onPress={handleSubmitFeedback}
          className="rounded-xl mt-2"
        />
      </Card>

      {/* Platform Subscription plans to buy */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Platform Subscription</Text>
      <Card className="mb-6 p-4">
        {currentOwner && (
          <View className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 flex-row justify-between items-center">
            <View>
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">Current Account Tier</Text>
              <Text style={{ color: colors.text }} className="text-base font-black mt-0.5">
                {currentOwner.planId 
                  ? subscriptionPlans.find(p => p.id === currentOwner.planId)?.name || "Active Plan"
                  : "Free Trial Mode"}
              </Text>
            </View>
            <View className="bg-primary/10 px-3 py-1.5 rounded-lg">
              <Text className="text-primary font-bold text-xs">
                {currentOwner.status.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        <Text style={{ color: colors.textSecondary }} className="text-xs mb-4 font-semibold">
          Upgrade your platform plan to increase limits on active gym members and trainer logins:
        </Text>

        <View className="space-y-3">
          {subscriptionPlans.filter(p => p.isActive).map((p) => {
            const isCurrent = currentOwner?.planId === p.id;
            return (
              <View 
                key={p.id} 
                style={{ 
                  borderColor: isCurrent ? '#6C47FF' : colors.border,
                  backgroundColor: isCurrent ? 'rgba(108,71,255,0.03)' : 'transparent' 
                }} 
                className="p-3.5 border rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center flex-wrap gap-1">
                    <Text style={{ color: colors.text }} className="text-sm font-black mr-2">{p.name}</Text>
                    {p.isHighlighted && (
                      <View className="bg-accent/10 px-1.5 py-0.5 rounded-md">
                        <Text className="text-accent text-[8px] font-black uppercase">Best Value</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-1 font-semibold leading-4">
                    Limits: {p.maxMembers} Members • {p.maxTrainers} Trainers
                  </Text>
                </View>

                <View className="items-end">
                  <Text style={{ color: '#6C47FF' }} className="text-sm font-black mb-1.5">
                    {formatCurrency(p.price, 'INR')}/mo
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleBuyPlan(p.id)}
                    disabled={isCurrent || !!pendingRequest}
                    style={{ 
                      backgroundColor: isCurrent ? colors.border : (pendingRequest?.requestedPlanId === p.id ? '#F59E0B' : '#6C47FF'),
                      opacity: (isCurrent || (!!pendingRequest && pendingRequest.requestedPlanId !== p.id)) ? 0.5 : 1 
                    }}
                    className="px-3.5 py-1.5 rounded-xl active:scale-95"
                  >
                    <Text className="text-white font-bold text-[10px] uppercase">
                      {isCurrent ? "Active" : pendingRequest?.requestedPlanId === p.id ? "Pending Approval" : "Request Upgrade"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </Card>
      {/* ADD NEW BRANCH MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addBranchModalVisible}
        onRequestClose={() => setAddBranchModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[90%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Text style={{ color: colors.text }} className="text-lg font-black">
                Add New Gym Branch
              </Text>
              <TouchableOpacity onPress={() => setAddBranchModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Input
                label="Branch Name"
                value={newGymName}
                onChangeText={setNewGymName}
                error={newErrors.newGymName}
                icon="business-outline"
              />

              <Input
                label="Address Line 1"
                value={newAddress1}
                onChangeText={setNewAddress1}
                error={newErrors.newAddress1}
                icon="map-outline"
              />

              <Input
                label="Address Line 2 (Optional)"
                value={newAddress2}
                onChangeText={setNewAddress2}
                icon="map-outline"
              />

              <View className="flex-row justify-between gap-3">
                <View className="flex-1">
                  <Input
                    label="City"
                    value={newCity}
                    onChangeText={setNewCity}
                    error={newErrors.newCity}
                    icon="location-outline"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="State"
                    value={newState}
                    onChangeText={setNewState}
                    icon="location-outline"
                  />
                </View>
              </View>

              <View className="flex-row justify-between gap-3">
                <View className="flex-1">
                  <Input
                    label="PIN Code"
                    value={newPin}
                    onChangeText={setNewPin}
                    icon="flag-outline"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="GST Number (Optional)"
                    value={newGst}
                    onChangeText={setNewGst}
                    icon="document-text-outline"
                  />
                </View>
              </View>

              <Input
                label="Contact Hotline"
                value={newPhone}
                onChangeText={setNewPhone}
                error={newErrors.newPhone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="Official Email Address"
                value={newEmail}
                onChangeText={setNewEmail}
                error={newErrors.newEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />

              <Input
                label="Website URL (Optional)"
                value={newWebsite}
                onChangeText={setNewWebsite}
                keyboardType="url"
                autoCapitalize="none"
                icon="globe-outline"
              />

              <Button
                title="Create Gym Branch"
                onPress={handleCreateBranch}
                className="rounded-xl mt-4"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
