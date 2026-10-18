import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert, Switch, Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateRequired, validateEmail, validatePhone } from '../../utils/validators';
import { formatDate } from '../../utils/dateHelper';
import { Enquiry } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function EnquiriesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { enquiries, gyms, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const activeGym = useMemo(() => gyms.find(g => g.id === activeGymId), [gyms, activeGymId]);
  const gymName = activeGym?.name || "our Gym";

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [smsPreviewVisible, setSmsPreviewVisible] = useState(false);
  const [pendingEnquiry, setPendingEnquiry] = useState<Enquiry | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [notificationMethod, setNotificationMethod] = useState<'none' | 'sms' | 'whatsapp'>('whatsapp');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Filter enquiries by gym branch
  const gymEnquiries = useMemo(() => enquiries.filter(e => e.gymId === activeGymId), [enquiries, activeGymId]);

  // 2. Search query filtration
  const searchedEnquiries = useSearch(gymEnquiries, searchQuery, ['name', 'email', 'description', 'phone']);

  const handleOpenAdd = () => {
    setName('');
    setPhone('');
    setEmail('');
    setDescription('');
    setNotificationMethod('whatsapp');
    setErrors({});
    setModalVisible(true);
  };

  const handleWhatsAppRedirect = (visitorName: string, visitorPhone: string, text: string) => {
    let cleanedPhone = visitorPhone.replace(/[^\d+]/g, '');
    if (cleanedPhone.length === 10 && !cleanedPhone.startsWith('+')) {
      cleanedPhone = `91${cleanedPhone}`; // Default to India prefix if 10-digit number
    } else if (cleanedPhone.startsWith('+')) {
      cleanedPhone = cleanedPhone.substring(1);
    }
    const url = `whatsapp://send?phone=${cleanedPhone}&text=${encodeURIComponent(text)}`;
    const webUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(text)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  const handleAddEnquiry = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Visitor name is required.";
    if (!validateRequired(phone)) {
      tempErrors.phone = "Contact number is required.";
    } else if (!validatePhone(phone)) {
      tempErrors.phone = "Invalid phone number format.";
    }
    if (email && !validateEmail(email)) {
      tempErrors.email = "Invalid email format.";
    }
    if (!validateRequired(description)) tempErrors.description = "Enquiry details/description is required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please resolve errors in the form.");
      return;
    }

    const defaultMsg = `Hi ${name}, thank you for visiting ${gymName}! We look forward to helping you reach your fitness goals. If you have any queries, feel free to call us at ${activeGym?.phone || 'our center'}. - Team ${gymName}`;

    const newEnquiry: Enquiry = {
      id: `enq-${Date.now()}`,
      name,
      phone,
      email,
      description,
      gymId: activeGymId,
      date: formatDate(new Date(), "yyyy-MM-dd"),
      messageSent: notificationMethod !== 'none',
      sentMessageText: notificationMethod !== 'none' ? defaultMsg : undefined
    };

    if (notificationMethod === 'sms') {
      // Show simulated SMS preview before fully closing/saving
      setPendingEnquiry(newEnquiry);
      setSmsPreviewVisible(true);
    } else if (notificationMethod === 'whatsapp') {
      dispatch({ type: 'ADD_ENQUIRY', payload: newEnquiry });
      toast.success("Visitor enquiry saved!");
      setModalVisible(false);
      
      // Redirect to WhatsApp
      setTimeout(() => {
        handleWhatsAppRedirect(name, phone, defaultMsg);
      }, 300);
    } else {
      dispatch({ type: 'ADD_ENQUIRY', payload: newEnquiry });
      toast.success("Visitor enquiry added successfully!");
      setModalVisible(false);
    }
  };

  const handleConfirmSms = () => {
    if (pendingEnquiry) {
      dispatch({ type: 'ADD_ENQUIRY', payload: pendingEnquiry });
      setSmsPreviewVisible(false);
      setModalVisible(false);
      setPendingEnquiry(null);
      toast.success("Visitor added & thank-you message dispatched!");
    }
  };

  const handleDeleteEnquiry = (enquiryId: string, visitorName: string) => {
    Alert.alert(
      "Remove Enquiry",
      `Are you sure you want to delete ${visitorName}'s enquiry record?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_ENQUIRY', payload: enquiryId });
            toast.error("Visitor enquiry record deleted.");
            if (selectedEnquiry && selectedEnquiry.id === enquiryId) {
              setDetailsModalVisible(false);
            }
          }
        }
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  const handleViewDetails = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setDetailsModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search visitor/enquiry logs..."
      />

      <FlatList
        data={searchedEnquiries}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => handleViewDetails(item)}
            className="mb-4"
            activeOpacity={0.9}
          >
            <Card style={{ padding: 16 }}>
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text style={{ color: colors.text }} className="text-base font-black">
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                    📞 {item.phone}
                  </Text>
                </View>
                <View className="items-end">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold">
                    {formatDate(new Date(item.date), "MMM dd, yyyy")}
                  </Text>
                  <View className="mt-1">
                    {item.messageSent ? (
                      <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full flex-row items-center">
                        <Ionicons name="checkmark-circle" size={10} color="#10B981" className="mr-1" />
                        <Text className="text-[9px] font-bold text-emerald-500 uppercase">Msg Sent</Text>
                      </View>
                    ) : (
                      <View className="bg-gray-500/10 px-2 py-0.5 rounded-full flex-row items-center">
                        <Ionicons name="close-circle" size={10} color={colors.textSecondary} className="mr-1" />
                        <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase">No Msg</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <Text 
                style={{ color: colors.text }} 
                className="text-xs mt-1 leading-4 font-medium"
                numberOfLines={2}
              >
                {item.description}
              </Text>

              <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                {item.email ? (
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-medium italic">
                    📧 {item.email}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-medium italic">
                    No email provided
                  </Text>
                )}
                <Text style={{ color: '#6C47FF' }} className="text-[10px] font-black uppercase tracking-wider">
                  View Detail →
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Card className="items-center py-10 mt-2">
            <Text className="text-4xl mb-3">📋</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Visitor Enquiries</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[220px]">
              Tap the FAB below to log walk-in enquiries and send automatic thanking messages.
            </Text>
          </Card>
        }
      />

      {/* FAB trigger */}
      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ADD ENQUIRY FORM MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (smsPreviewVisible) {
            setSmsPreviewVisible(false);
          } else {
            setModalVisible(false);
          }
        }}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[90%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Add Visitor Enquiry
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              
              {/* Gym Name Banner */}
              <View className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-5 flex-row items-center">
                <View className="bg-primary/20 p-2 rounded-xl mr-3">
                  <Ionicons name="business" size={18} color="#6C47FF" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wide">
                    Active Branch
                  </Text>
                  <Text style={{ color: colors.text }} className="text-sm font-black">
                    {gymName}
                  </Text>
                </View>
              </View>

              <Input
                label="Visitor Name *"
                placeholder="e.g. Johnathan Doe"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="person-outline"
              />

              <Input
                label="Contact Number *"
                placeholder="e.g. +1 (555) 987-6543"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="Email Address"
                placeholder="e.g. john@example.com (optional)"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />

              <Input
                label="Enquiry Details / description *"
                placeholder="What is the visitor enquiring about? (e.g. Price of annual memberships, personal training info, locker access)"
                value={description}
                onChangeText={setDescription}
                error={errors.description}
                multiline={true}
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                icon="document-text-outline"
              />

              {/* Thanking Message Dispatcher Options */}
              <Text style={{ color: colors.text }} className="text-xs font-bold mb-2 ml-0.5">Thank-you Message Option</Text>
              <View className="flex-row gap-2 mb-6 mt-1">
                <TouchableOpacity
                  onPress={() => setNotificationMethod('whatsapp')}
                  style={{
                    borderColor: notificationMethod === 'whatsapp' ? '#25D366' : colors.border,
                    backgroundColor: notificationMethod === 'whatsapp' ? 'rgba(37,211,102,0.08)' : 'transparent',
                    borderWidth: 1.5
                  }}
                  className="flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-1.5"
                >
                  <Ionicons name="logo-whatsapp" size={16} color={notificationMethod === 'whatsapp' ? '#25D366' : colors.textSecondary} />
                  <Text style={{ color: notificationMethod === 'whatsapp' ? '#25D366' : colors.text }} className="text-xs font-black">WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setNotificationMethod('sms')}
                  style={{
                    borderColor: notificationMethod === 'sms' ? '#6C47FF' : colors.border,
                    backgroundColor: notificationMethod === 'sms' ? 'rgba(108,71,255,0.08)' : 'transparent',
                    borderWidth: 1.5
                  }}
                  className="flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-1.5"
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={notificationMethod === 'sms' ? '#6C47FF' : colors.textSecondary} />
                  <Text style={{ color: notificationMethod === 'sms' ? '#6C47FF' : colors.text }} className="text-xs font-black">SMS Demo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setNotificationMethod('none')}
                  style={{
                    borderColor: notificationMethod === 'none' ? colors.textSecondary : colors.border,
                    backgroundColor: notificationMethod === 'none' ? 'rgba(156,163,175,0.08)' : 'transparent',
                    borderWidth: 1.5
                  }}
                  className="flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-1.5"
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ color: notificationMethod === 'none' ? colors.textSecondary : colors.text }} className="text-xs font-black">None</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Save Visitor Log"
                onPress={handleAddEnquiry}
                className="rounded-xl mb-4"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SIMULATED SMS PREVIEW MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={smsPreviewVisible}
        onRequestClose={() => setSmsPreviewVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 p-6">
          <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }} className="w-full max-w-[340px] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            
            <View className="items-center mb-4">
              <View className="w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center mb-3">
                <Ionicons name="chatbubble-ellipses" size={24} color="#10B981" />
              </View>
              <Text style={{ color: colors.text }} className="text-lg font-black text-center">
                Dispatched SMS Preview
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs text-center mt-1">
                Simulated message delivery to {pendingEnquiry?.phone}
              </Text>
            </View>

            {/* Simulated Phone Screen Block */}
            <View className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 mb-6">
              <Text className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 text-center">
                SMS from {gymName.toUpperCase()}
              </Text>
              <View className="bg-primary px-3.5 py-2.5 rounded-2xl rounded-tl-none self-start max-w-[95%]">
                <Text className="text-white text-xs leading-4 font-semibold">
                  {pendingEnquiry?.sentMessageText}
                </Text>
              </View>
              <Text className="text-[9px] font-bold text-right text-gray-400 mt-2">
                Delivered • Just now
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setSmsPreviewVisible(false)}
                className="flex-1 rounded-xl"
              />
              <Button
                title="OK, Dispatch"
                onPress={handleConfirmSms}
                className="flex-1 rounded-xl"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ENQUIRY DETAILS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Enquiry Details
              </Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedEnquiry && (
              <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                <View className="mb-4">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
                    Visitor Name
                  </Text>
                  <Text style={{ color: colors.text }} className="text-lg font-black">
                    {selectedEnquiry.name}
                  </Text>
                </View>

                <View className="flex-row mb-4">
                  <View className="flex-1">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
                      Phone Number
                    </Text>
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {selectedEnquiry.phone}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
                      Log Date
                    </Text>
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {formatDate(new Date(selectedEnquiry.date), "MMMM dd, yyyy")}
                    </Text>
                  </View>
                </View>

                {selectedEnquiry.email && (
                  <View className="mb-4">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
                      Email Address
                    </Text>
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {selectedEnquiry.email}
                    </Text>
                  </View>
                )}

                <View className="mb-5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
                    Description & Request Details
                  </Text>
                  <Text style={{ color: colors.text }} className="text-xs font-semibold leading-5 mt-1">
                    {selectedEnquiry.description}
                  </Text>
                </View>

                <View className="mb-6 bg-primary/5 border border-primary/10 rounded-2xl p-4">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    Thanking Message Status
                  </Text>
                  {selectedEnquiry.messageSent ? (
                    <View>
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" className="mr-1.5" />
                        <Text className="text-xs font-bold text-emerald-500">Delivered successfully</Text>
                      </View>
                      <Text style={{ color: colors.text }} className="text-xs leading-4 font-semibold italic bg-gray-100/50 dark:bg-gray-800/50 p-2.5 rounded-xl">
                        "{selectedEnquiry.sentMessageText}"
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle" size={16} color={colors.textSecondary} className="mr-1.5" />
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-bold">No message was sent during registration</Text>
                    </View>
                  )}
                </View>

                {/* WhatsApp redirection option */}
                <TouchableOpacity
                  onPress={() => {
                    const msg = selectedEnquiry.sentMessageText || `Hi ${selectedEnquiry.name}, thank you for visiting ${gymName}! - Team ${gymName}`;
                    handleWhatsAppRedirect(selectedEnquiry.name, selectedEnquiry.phone, msg);
                  }}
                  className="bg-[#25D366] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 mb-5 active:scale-98 shadow-sm"
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text className="text-white text-xs font-black">Open WhatsApp Chat</Text>
                </TouchableOpacity>

                <View className="flex-row gap-3 mb-6">
                  <Button
                    title="Delete Record"
                    variant="outline"
                    onPress={() => handleDeleteEnquiry(selectedEnquiry.id, selectedEnquiry.name)}
                    className="flex-1 border-rose-500 rounded-xl"
                    style={{ borderColor: '#F43F5E' }}
                  />
                  <Button
                    title="Close"
                    onPress={() => setDetailsModalVisible(false)}
                    className="flex-1 rounded-xl"
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
