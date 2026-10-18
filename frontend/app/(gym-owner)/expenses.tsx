import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { validateRequired } from '../../utils/validators';
import { formatDate } from '../../utils/dateHelper';
import { Expense } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES } from '../../constants/mockData';
import { formatCurrency } from '../../utils/currencyHelper';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getMonthYearLabel = (dateStr: string) => {
  if (!dateStr || dateStr.length < 7) return "";
  const [year, month] = dateStr.split('-');
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex]} ${year}`;
};

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { expenses, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All'); // YYYY-MM format

  // Modals visibility
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [categoryFilterVisible, setCategoryFilterVisible] = useState(false);
  const [monthFilterVisible, setMonthFilterVisible] = useState(false);
  const [formCategoryVisible, setFormCategoryVisible] = useState(false);

  // Form state
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Filter expenses by active gym branch
  const gymExpenses = useMemo(() => {
    return expenses.filter(e => e.gymId === activeGymId);
  }, [expenses, activeGymId]);

  // 2. Extract unique months for dynamic month filter
  const uniqueMonths = useMemo(() => {
    const monthsMap = new Map<string, string>(); // YYYY-MM -> human readable Month Year
    gymExpenses.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        const yyyyMm = exp.date.substring(0, 7);
        if (!monthsMap.has(yyyyMm)) {
          monthsMap.set(yyyyMm, getMonthYearLabel(exp.date));
        }
      }
    });

    const sortedKeys = Array.from(monthsMap.keys()).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(k => ({
      key: k,
      label: monthsMap.get(k) || k
    }));
  }, [gymExpenses]);

  // 3. Filtered list based on Search, Category, and Month selectors
  const filteredExpenses = useMemo(() => {
    return gymExpenses.filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
      const matchesMonth = selectedMonth === 'All' || exp.date.startsWith(selectedMonth);

      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [gymExpenses, searchQuery, selectedCategory, selectedMonth]);

  // 4. Calculate metrics
  const stats = useMemo(() => {
    const currentMonthPrefix = formatDate(new Date(), "yyyy-MM");
    
    let currentMonthTotal = 0;
    let filteredTotal = 0;
    const categoryTotals: Record<string, number> = {};

    gymExpenses.forEach(e => {
      if (e.date.startsWith(currentMonthPrefix)) {
        currentMonthTotal += e.amount;
      }
    });

    filteredExpenses.forEach(e => {
      filteredTotal += e.amount;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    // Find top spending category in current filtered results
    let topCategory = 'None';
    let topCategoryAmt = 0;
    Object.keys(categoryTotals).forEach(cat => {
      if (categoryTotals[cat] > topCategoryAmt) {
        topCategory = cat;
        topCategoryAmt = categoryTotals[cat];
      }
    });

    return {
      currentMonthTotal,
      filteredTotal,
      topCategory,
      topCategoryAmt
    };
  }, [gymExpenses, filteredExpenses]);

  const handleOpenAdd = () => {
    setCategory('');
    setAmount('');
    setDate(formatDate(new Date(), "yyyy-MM-dd"));
    setDescription('');
    setErrors({});
    setAddModalVisible(true);
  };

  const handleAddExpense = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(category)) tempErrors.category = "Category is required.";
    if (!validateRequired(amount) || isNaN(Number(amount)) || Number(amount) <= 0) {
      tempErrors.amount = "Enter a valid positive amount.";
    }
    if (!validateRequired(date)) tempErrors.date = "Date is required.";
    if (!validateRequired(description)) tempErrors.description = "Description is required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields correctly.");
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      gymId: activeGymId,
      category,
      amount: Number(amount),
      date,
      description
    };

    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
    toast.success(`Expense added: ${category}`);
    setAddModalVisible(false);
  };

  const handleDeleteExpense = (id: string, cat: string, amt: number) => {
    Alert.alert(
      "Delete Expense Log",
      `Are you sure you want to remove the expense for ${cat} worth ${formatCurrency(amt, 'INR')}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_EXPENSE', payload: id });
            toast.error("Expense record deleted.");
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      {/* Top Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search expenses..."
      />

      {/* Dynamic Filter Capsules Bar */}
      <View className="flex-row gap-3 mb-5">
        <TouchableOpacity
          onPress={() => setCategoryFilterVisible(true)}
          style={{ borderColor: colors.border, backgroundColor: colors.card }}
          className="flex-1 py-3 px-4 rounded-xl border flex-row justify-between items-center"
        >
          <View className="flex-row items-center">
            <Ionicons name="funnel-outline" size={14} color="#6C47FF" className="mr-2" />
            <Text style={{ color: colors.text }} className="text-xs font-bold" numberOfLines={1}>
              Cat: {selectedCategory}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMonthFilterVisible(true)}
          style={{ borderColor: colors.border, backgroundColor: colors.card }}
          className="flex-1 py-3 px-4 rounded-xl border flex-row justify-between items-center"
        >
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#00C896" className="mr-2" />
            <Text style={{ color: colors.text }} className="text-xs font-bold" numberOfLines={1}>
              Month: {selectedMonth === 'All' ? 'All Months' : getMonthYearLabel(selectedMonth + "-01")}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Analytics stat cards layout */}
      <View className="flex-row justify-between gap-4 mb-6">
        <Card className="flex-1 p-4">
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
            This Month (June)
          </Text>
          <Text style={{ color: '#EF4444' }} className="text-lg font-black">
            {formatCurrency(stats.currentMonthTotal, 'INR')}
          </Text>
        </Card>

        <Card className="flex-1 p-4">
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
            Filtered Total
          </Text>
          <Text style={{ color: colors.text }} className="text-lg font-black">
            {formatCurrency(stats.filteredTotal, 'INR')}
          </Text>
        </Card>
      </View>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card className="mb-3.5 p-4 relative overflow-hidden flex-row items-center justify-between">
            {/* Color Accent bar on the left */}
            <View style={{ backgroundColor: '#EF4444' }} className="absolute left-0 top-0 bottom-0 w-1.5" />
            
            <View className="flex-1 pl-2.5 pr-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text style={{ color: colors.text }} className="text-sm font-black mr-2">
                  {item.category}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold">
                  {formatDate(item.date, "dd MMM yyyy")}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold leading-4 mb-1">
                {item.description}
              </Text>
            </View>

            <View className="items-end gap-2">
              <Text style={{ color: '#EF4444' }} className="text-sm font-black">
                -{formatCurrency(item.amount, 'INR')}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteExpense(item.id, item.category, item.amount)}
                className="bg-accent/10 p-1.5 rounded-lg"
              >
                <Ionicons name="trash-outline" size={14} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Card className="items-center py-12 px-4">
            <Text className="text-4xl mb-4">💸</Text>
            <Text style={{ color: colors.text }} className="text-base font-black">No Expenses Recorded</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-semibold mt-1.5 max-w-[220px]">
              Tap the button below to add your first expense log!
            </Text>
          </Card>
        }
      />

      {/* FAB to Add Expense */}
      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* CATEGORY FILTER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={categoryFilterVisible}
        onRequestClose={() => setCategoryFilterVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-150 dark:border-gray-800 max-h-[80%]">
            <Text style={{ color: colors.text }} className="text-base font-black mb-4 text-center">Filter by Category</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory('All');
                  setCategoryFilterVisible(false);
                }}
                style={{ borderColor: selectedCategory === 'All' ? '#6C47FF' : colors.border }}
                className="py-3 px-4 border rounded-xl mb-2 flex-row justify-between items-center"
              >
                <Text style={{ color: colors.text }} className="text-xs font-bold">All Categories</Text>
                {selectedCategory === 'All' && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
              </TouchableOpacity>

              {EXPENSE_CATEGORIES.map((cat: string) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategoryFilterVisible(false);
                  }}
                  style={{ borderColor: selectedCategory === cat ? '#6C47FF' : colors.border }}
                  className="py-3 px-4 border rounded-xl mb-2 flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{cat}</Text>
                  {selectedCategory === cat && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Close" variant="outline" onPress={() => setCategoryFilterVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* MONTH HISTORY FILTER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={monthFilterVisible}
        onRequestClose={() => setMonthFilterVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-150 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-base font-black mb-4 text-center">Filter by Month</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4 max-h-[280px]">
              <TouchableOpacity
                onPress={() => {
                  setSelectedMonth('All');
                  setMonthFilterVisible(false);
                }}
                style={{ borderColor: selectedMonth === 'All' ? '#00C896' : colors.border }}
                className="py-3 px-4 border rounded-xl mb-2 flex-row justify-between items-center"
              >
                <Text style={{ color: colors.text }} className="text-xs font-bold">All Months</Text>
                {selectedMonth === 'All' && <Ionicons name="checkmark-circle" size={16} color="#00C896" />}
              </TouchableOpacity>

              {uniqueMonths.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => {
                    setSelectedMonth(m.key);
                    setMonthFilterVisible(false);
                  }}
                  style={{ borderColor: selectedMonth === m.key ? '#00C896' : colors.border }}
                  className="py-3 px-4 border rounded-xl mb-2 flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{m.label}</Text>
                  {selectedMonth === m.key && <Ionicons name="checkmark-circle" size={16} color="#00C896" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Close" variant="outline" onPress={() => setMonthFilterVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* ADD EXPENSE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-150 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Record New Expense
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Category picker input selector */}
              <TouchableOpacity onPress={() => setFormCategoryVisible(true)} activeOpacity={0.7}>
                <View pointerEvents="none">
                  <Input
                    label="Expense Category"
                    placeholder="Tap to select category"
                    value={category}
                    error={errors.category}
                    icon="options-outline"
                  />
                </View>
              </TouchableOpacity>

              <Input
                label="Amount (INR)"
                placeholder="e.g. 1500"
                value={amount}
                onChangeText={setAmount}
                error={errors.amount}
                keyboardType="numeric"
                icon="cash-outline"
              />

              <Input
                label="Expense Date"
                placeholder="e.g. 2026-06-12"
                value={date}
                onChangeText={setDate}
                error={errors.date}
                icon="calendar-outline"
                isDatePicker={true}
              />

              <Input
                label="Description / Vendor Details"
                placeholder="Write description notes..."
                value={description}
                onChangeText={setDescription}
                error={errors.description}
                multiline={true}
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                icon="document-text-outline"
              />

              <Button
                title="Log Expense"
                onPress={handleAddExpense}
                className="rounded-xl mt-4"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FORM CATEGORY SELECTOR SUB-MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={formCategoryVisible}
        onRequestClose={() => setFormCategoryVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-150 dark:border-gray-800 max-h-[75%]">
            <Text style={{ color: colors.text }} className="text-base font-black mb-4 text-center">Select Expense Category</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {EXPENSE_CATEGORIES.map((cat: string) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    setFormCategoryVisible(false);
                  }}
                  style={{ borderColor: category === cat ? '#6C47FF' : colors.border }}
                  className="py-3 px-4 border rounded-xl mb-2 flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{cat}</Text>
                  {category === cat && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Back" variant="outline" onPress={() => setFormCategoryVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
