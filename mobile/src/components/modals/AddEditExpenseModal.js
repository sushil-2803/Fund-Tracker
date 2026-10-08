import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { z } from 'zod';
import { Calendar, X, Plus, Check, ChevronDown } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, PRESET_CATEGORIES } from '../../theme/theme';
import { fmt, todayISO } from '../../utils/formatters';
import TagInput from '../common/TagInput';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api';

const expenseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long'),
  amount: z.number({ invalid_type_error: 'Amount must be a valid number' }).positive('Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  notes: z.string().optional(),
});

export default function AddEditExpenseModal({
  visible,
  onClose,
  expense = null, // null for create, object for edit
  onSuccess,
  allTags = [],
}) {
  const { showToast } = useToast();
  const isEditing = !!expense;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pre-fill form on edit
  useEffect(() => {
    if (expense) {
      setTitle(expense.title || '');
      setAmount(String(expense.amount || ''));
      setCategory(expense.category || PRESET_CATEGORIES[0]);
      setDate(expense.date ? String(expense.date).slice(0, 10) : todayISO());
      setNotes(expense.notes || '');
      setTags(Array.isArray(expense.tags) ? expense.tags : []);
    } else {
      setTitle('');
      setAmount('');
      setCategory(PRESET_CATEGORIES[0]);
      setDate(todayISO());
      setNotes('');
      setTags([]);
    }
    setErrorMsg('');
    setShowCategoryPicker(false);
  }, [expense, visible]);

  const settledAmount = expense?.settled_amount || 0;

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const parsedAmount = parseFloat(amount);

    const validationResult = expenseSchema.safeParse({
      title: title.trim(),
      amount: parsedAmount,
      category,
      date: date.trim(),
      notes: notes.trim() || undefined,
    });

    if (!validationResult.success) {
      setErrorMsg(validationResult.error.errors[0]?.message || 'Invalid input');
      return;
    }

    // Validation: cannot reduce amount below already settled
    if (isEditing && parsedAmount < settledAmount) {
      setErrorMsg(
        `Amount cannot be less than already settled sum (${fmt(settledAmount)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        category,
        date: date.trim(),
        notes: notes.trim() || undefined,
        tags,
      };

      if (isEditing) {
        await api.expenses.update(expense.id, payload);
        showToast('Expense updated successfully', 'success');
      } else {
        await api.expenses.create(payload);
        showToast('Expense created successfully', 'success');
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Expense' : 'Add New Expense'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isEditing ? 'Update transaction details' : 'Log an outgoing payment to settle'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScroll}
          >
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Title Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Expense Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. AWS Server Bill, Goa Hotel Booking"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Amount (₹) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textSubtle}
                  keyboardType="decimal-pad"
                />
              </View>
              {isEditing && settledAmount > 0 && (
                <Text style={styles.helperText}>
                  Min amount allowed: {fmt(settledAmount)} (already settled)
                </Text>
              )}
            </View>

            {/* Category Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.categoryPickerBtn}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={styles.categoryPickerBtnText}>{category}</Text>
                <ChevronDown size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={styles.categoryDropdown}>
                  <ScrollView style={styles.categoryScroll} nestedScrollEnabled>
                    {PRESET_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryItem,
                          category === cat && styles.categoryItemActive,
                        ]}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryItemText,
                            category === cat && styles.categoryItemTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                        {category === cat && <Check size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Date Input with Native Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={18} color={COLORS.primaryLight} />
                <Text style={styles.datePickerBtnText}>{date}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(date + 'T00:00:00')}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  themeVariant="dark"
                />
              )}
            </View>

            {/* Tags */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tags</Text>
              <TagInput
                tags={tags}
                onChangeTags={setTags}
                suggestions={allTags}
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional breakdown or notes..."
                placeholderTextColor={COLORS.textSubtle}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsFooter}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0d0f14" />
              ) : (
                <View style={styles.btnRow}>
                  {isEditing ? <Check size={16} color="#0d0f14" /> : <Plus size={16} color="#0d0f14" />}
                  <Text style={styles.submitBtnText}>
                    {isEditing ? 'Save Changes' : 'Create Expense'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formScroll: {
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerDim,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: 13,
  },
  fieldGroup: {
    gap: SPACING.xs + 2,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  required: {
    color: COLORS.danger,
  },
  helperText: {
    color: COLORS.warning,
    fontSize: 11,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: '700',
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  categoryPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  categoryPickerBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryDropdown: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: SPACING.xs,
    maxHeight: 180,
    overflow: 'hidden',
  },
  categoryScroll: {
    maxHeight: 180,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryItemActive: {
    backgroundColor: 'rgba(108, 143, 247, 0.1)',
  },
  categoryItemText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  categoryItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 75,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  datePickerBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionsFooter: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    color: '#0d0f14',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
